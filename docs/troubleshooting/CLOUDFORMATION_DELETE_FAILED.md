# CloudFormation DELETE_FAILED Recovery Guide

## Problem Description

The CloudFormation stack `pv-api-prod` is in a `DELETE_FAILED` state and cannot be updated or deleted through normal means. This prevents new deployments from succeeding.

**Error Message:**
```
Stack is in DELETE_FAILED state and can not be updated
```

**Common Causes:**
1. Missing Lambda layer artifact (prisma-layer.zip not built before deployment)
2. Lambda functions referencing non-existent layer versions
3. Stack deployed without required layer dependencies
4. Corrupted CloudFormation state from failed deployments

## Quick Diagnosis

### Check Stack Status
```powershell
aws cloudformation describe-stacks \
  --stack-name pv-api-prod \
  --region us-west-2 \
  --query 'Stacks[0].StackStatus'
```

Expected output if affected: `"DELETE_FAILED"`

### Check Layer Status
```powershell
# List all layer versions for the Prisma layer
aws lambda list-layer-versions \
  --layer-name pv-api-prod-prisma-v2 \
  --region us-west-2 \
  --query 'LayerVersions[*].[Version,CreatedDate]' \
  --output table
```

### Check if Layer Artifact Exists Locally
```powershell
cd serverless
ls -lh layers/prisma-layer.zip
```

If the file doesn't exist, you need to build it first (see below).

## Recovery Process

### Option 1: Force Delete Stack (Recommended)

This is the fastest way to recover from DELETE_FAILED state:

```powershell
# 1. Force delete the stack, retaining resources if needed
aws cloudformation delete-stack \
  --stack-name pv-api-prod \
  --region us-west-2

# 2. Wait for deletion to complete (may take a few minutes)
aws cloudformation wait stack-delete-complete \
  --stack-name pv-api-prod \
  --region us-west-2

# 3. Verify the stack is gone
aws cloudformation describe-stacks \
  --stack-name pv-api-prod \
  --region us-west-2 2>&1 | Select-String "does not exist"
```

**If the delete still fails**, you may need to manually delete stuck resources:

```powershell
# List failed resources
aws cloudformation describe-stack-resources \
  --stack-name pv-api-prod \
  --region us-west-2 \
  --query 'StackResources[?ResourceStatus==`DELETE_FAILED`].[LogicalResourceId,ResourceType,ResourceStatusReason]' \
  --output table
```

For each failed resource, manually delete it via AWS Console or CLI, then retry the stack deletion.

### Option 2: Use AWS Console

1. Open [CloudFormation Console](https://us-west-2.console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks)
2. Select the `pv-api-prod` stack
3. Click "Delete"
4. If resources are stuck, go to the "Resources" tab
5. For each DELETE_FAILED resource:
   - Click the Physical ID link to open in its service console
   - Manually delete the resource
6. Return to CloudFormation and click "Delete" again

### Option 3: Skip Problematic Resources

If specific resources can't be deleted, you can force CloudFormation to skip them:

```powershell
# Get list of resources that failed to delete
aws cloudformation describe-stack-resources \
  --stack-name pv-api-prod \
  --region us-west-2 \
  --query 'StackResources[?ResourceStatus==`DELETE_FAILED`].LogicalResourceId' \
  --output text

# Delete stack while retaining problematic resources
aws cloudformation delete-stack \
  --stack-name pv-api-prod \
  --region us-west-2 \
  --retain-resources LogicalResourceId1 LogicalResourceId2
```

⚠️ **Warning:** This leaves orphaned resources in your AWS account that you'll need to clean up manually later.

## Rebuild and Redeploy

After successfully deleting the failed stack:

### Step 1: Build the Prisma Layer

The layer artifact is gitignored and must be built before deployment.

**On Linux/Mac:**
```powershell
cd serverless
./scripts/build-prisma-layer.sh
```

**On Windows:**
```powershell
cd serverless
powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1
```

**Verify the layer was built:**
```powershell
ls -lh layers/prisma-layer.zip
# Should show a file around 9-12 MB
```

### Step 2: Deploy Fresh Stack

```powershell
cd serverless
npx serverless deploy --stage prod --region us-west-2 --verbose
```

The `--verbose` flag helps you see exactly what's happening during deployment.

### Step 3: Verify Deployment

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health" -Method Get

# Check layer was deployed
aws lambda list-layer-versions \
  --layer-name pv-api-prod-prisma-v2 \
  --region us-west-2 \
  --max-items 5

# Check a function has the layer attached
aws lambda get-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --query 'Layers[*].Arn'
```

## Prevention

To prevent this issue from happening again:

### 1. Always Build Layer Before Deployment

Add this to your deployment checklist:

```powershell
# Before deploying
cd serverless
./scripts/build-prisma-layer.sh  # or .ps1 on Windows
./deploy.sh
```

### 2. Use CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/backend-deploy.yml`) automatically builds the layer before deployment. Prefer using CI/CD over manual deployments.

### 3. Validate Before Deploy

The updated `deploy.sh` script now validates the layer exists before deploying:

```powershell
cd serverless
./deploy.sh  # Will fail fast if layer is missing
```

### 4. Monitor CloudFormation Events

Watch stack events during deployment to catch issues early:

```powershell
# In a separate terminal, tail CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name pv-api-prod \
  --region us-west-2 \
  --max-items 10 \
  --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,ResourceStatusReason]' \
  --output table
```

## Understanding the Root Cause

### Why Did This Happen?

1. **Missing Layer Artifact**: The `layers/prisma-layer.zip` file is excluded from git (as it should be, since it's a 9+ MB binary artifact).

2. **Deployment Without Layer**: If someone deploys the stack without building the layer first, serverless creates a CloudFormation template that references a layer zip file that doesn't exist.

3. **Lambda Layer Creation Fails**: AWS Lambda rejects the layer creation because the zip file is missing or corrupted.

4. **Stack Rollback Fails**: When CloudFormation tries to roll back the failed deployment, it can't delete the partially-created resources, entering DELETE_FAILED state.

### Why 269 MB Combined Size?

The reported 269 MB size discrepancy occurs when:

- Function code bundles include unminimized dependencies (~0.25 MB each is normal)
- But the **layer** is missing or corrupt, so AWS might be trying to bundle Prisma into each function instead of using the layer
- Or CloudFormation is calculating size incorrectly due to failed layer references

With proper layer deployment:
- Each function: ~0.25 MB (esbuild bundle, minified)
- Prisma layer: ~9-12 MB (compressed)
- **Combined per function**: ~10-13 MB (well under 250 MB limit)

## Related Documentation

- [Backend Deployment Guide](../BACKEND-DEPLOYMENT.md) - Canonical deployment process
- [Layer Build Scripts](../../serverless/scripts/build-prisma-layer.sh) - How layers are built
- [GitHub Actions Workflow](../../.github/workflows/backend-deploy.yml) - Automated CI/CD

## AWS Documentation

- [CloudFormation Stack Deletion](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html)
- [Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
- [Serverless Framework AWS Guide](https://www.serverless.com/framework/docs/providers/aws/guide/deploying)

## Support

If you continue to experience issues after following this guide:

1. Check CloudWatch Logs for specific error messages
2. Review stack events in CloudFormation Console
3. Verify AWS credentials have sufficient permissions
4. Check if there are AWS service outages in us-west-2
5. Consult the [Backend Deployment Guide](../BACKEND-DEPLOYMENT.md) for additional troubleshooting steps
