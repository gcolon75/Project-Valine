# Discord Command Permissions (RBAC)

## Overview

The Project Valine orchestrator implements Role-Based Access Control (RBAC) for Discord slash commands. This ensures that sensitive operations like deployments and infrastructure changes can only be executed by authorized users.

## Configuration

### Permission Matrix

The permission matrix is defined in `orchestrator/config/permission_matrix.json`. This file maps each Discord command to:

- **requiresAuth**: Whether the command requires authorization
- **allowedRoleIds**: List of Discord role IDs that can execute the command
- **allowedUserIds**: List of specific Discord user IDs that can execute the command
- **bypassOnEnv**: Environment where authorization is bypassed (e.g., "development")

Example:
```json
{
  "/deploy-client": {
    "description": "Triggers Client Deploy workflow",
    "requiresAuth": true,
    "allowedRoleIds": ["123456789012345678"],
    "allowedUserIds": [],
    "bypassOnEnv": "development"
  }
}
```

### Environment Variables

#### RBAC_ENABLED
- **Type**: Boolean (string)
- **Default**: `true`
- **Description**: Master switch to enable/disable RBAC enforcement
- **Example**: `RBAC_ENABLED=false` (disables all RBAC checks)

#### ADMIN_ROLE_IDS
- **Type**: Comma-separated list of Discord role IDs
- **Default**: Empty
- **Description**: Global admin roles that can execute any command
- **Example**: `ADMIN_ROLE_IDS=123456789012345678,987654321098765432`

#### ENVIRONMENT
- **Type**: String
- **Default**: `development`
- **Values**: `development`, `staging`, `production`
- **Description**: Current environment, used for `bypassOnEnv` checks
- **Example**: `ENVIRONMENT=production`

## Finding Discord Role IDs

1. Enable Developer Mode in Discord:
   - User Settings → App Settings → Advanced → Developer Mode
2. Right-click on a role in Server Settings → Roles
3. Click "Copy ID"

## Permission Levels

### Public Commands (requiresAuth: false)
These commands can be executed by anyone in the Discord server:
- `/status` - View workflow status
- `/verify-latest` - Check latest deployment
- `/diagnose` - Run diagnostics
- `/agents` - List available agents
- `/status-digest` - View health digest
- `/uptime-check` - Check uptime

### Protected Commands (requiresAuth: true)
These commands require specific roles or admin access:
- `/deploy-client` - Trigger client deployment
- `/ship` - Trigger deployment with verification
- `/triage` - Triage failing workflows
- `/triage-all` - Triage all failing workflows
- `/verify-run` - Verify specific workflow run
- `/set-frontend` - Set frontend base URL
- `/set-api-base` - Set API base URL

## Authorization Flow

1. User executes a slash command
2. Discord handler extracts user ID and role IDs
3. RBAC system checks permission matrix:
   - If RBAC is disabled → Allow
   - If command doesn't require auth → Allow
   - If environment bypass applies → Allow
   - If user has admin role → Allow
   - If user ID is in allowedUserIds → Allow
   - If user has any of the allowedRoleIds → Allow
   - Otherwise → Deny with error message
4. If denied, user sees an ephemeral error message

## Error Messages

When access is denied, users see:
```
⛔ **Access Denied**

You don't have permission to use `/command-name`.
This command requires specific Discord roles.

Contact a server administrator if you believe this is an error.
```

## Setup Guide

### For Development
```bash
# Disable RBAC for local testing
export RBAC_ENABLED=false
export ENVIRONMENT=development
```

### For Staging
```bash
# Enable RBAC but allow bypass for development commands
export RBAC_ENABLED=true
export ENVIRONMENT=staging
export ADMIN_ROLE_IDS=your-staging-admin-role-id
```

### For Production
```bash
# Full RBAC enforcement
export RBAC_ENABLED=true
export ENVIRONMENT=production
export ADMIN_ROLE_IDS=your-prod-admin-role-id-1,your-prod-admin-role-id-2
```

## Customizing Permissions

To modify which roles can execute a command:

1. Edit `orchestrator/config/permission_matrix.json`
2. Find the command you want to modify
3. Update the `allowedRoleIds` array with Discord role IDs
4. Redeploy the Lambda function

Example:
```json
{
  "/deploy-client": {
    "description": "Triggers Client Deploy workflow",
    "requiresAuth": true,
    "allowedRoleIds": [
      "123456789012345678",  // DevOps role
      "987654321098765432"   // Admin role
    ],
    "allowedUserIds": [],
    "bypassOnEnv": "development"
  }
}
```

## Testing

### Unit Tests
```bash
cd orchestrator
python -m pytest tests/test_rbac.py -v
```

### Manual Testing
1. Set up a test Discord server
2. Create test roles with known IDs
3. Configure `permission_matrix.json` with test role IDs
4. Test commands as users with and without the required roles
5. Verify error messages appear correctly

## Rollback

To disable RBAC if issues arise:
```bash
# Quick disable via environment variable
export RBAC_ENABLED=false

# Or update permission_matrix.json
{
  "rbacEnabled": false,
  ...
}
```

## Security Considerations

1. **Role ID Rotation**: If role IDs change, update `permission_matrix.json`
2. **Audit Logs**: Monitor who executes sensitive commands
3. **Principle of Least Privilege**: Only grant necessary permissions
4. **Regular Reviews**: Periodically review and update role assignments
5. **Environment Separation**: Use different role IDs per environment

## Troubleshooting

### Command Always Denied
- Check if RBAC is enabled: `echo $RBAC_ENABLED`
- Verify role IDs are correct (no typos)
- Check if user actually has the required role
- Verify environment matches `bypassOnEnv` if applicable

### Command Always Allowed
- Check if RBAC is disabled: `RBAC_ENABLED=false`
- Check if current environment matches `bypassOnEnv`
- Verify user doesn't have an admin role
- Check if `requiresAuth` is set to `false`

### Can't Find Role ID
1. Enable Discord Developer Mode
2. Right-click role → Copy ID
3. If still can't copy, you may not have permissions to view roles
