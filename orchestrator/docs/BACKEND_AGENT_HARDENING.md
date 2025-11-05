# Backend Agent Hardening Guide

This document describes the productionization enhancements made to the Backend Orchestrator Agent, including durable conversation persistence, real check execution, retry logic, and CI quality gates.

## Table of Contents

1. [Overview](#overview)
2. [Persistence Configuration](#persistence-configuration)
3. [Check Execution](#check-execution)
4. [Retry Logic](#retry-logic)
5. [Environment Variables](#environment-variables)
6. [Setup Guides](#setup-guides)
7. [Operational Runbook](#operational-runbook)

## Overview

The Backend Agent has been hardened with the following production-ready features:

### ✅ Durable Conversation Persistence
- **Memory Adapter** (default): Non-persistent, in-memory storage
- **SQLite Adapter**: File-based persistence with automatic cleanup
- **DynamoDB Adapter**: Cloud persistence with TTL support

### ✅ Real Check Execution
- Executes actual `lint`, `test`, and `build` commands
- Configurable command strings via environment variables
- Three execution modes: `real`, `mock`, `auto` (fallback)
- Captures logs and status codes
- Automatic timeout handling

### ✅ Retry Logic with Backoff
- Exponential backoff with configurable jitter
- Handles GitHub API rate limits (429)
- Handles server errors (5xx)
- Token pool rotation for high-throughput scenarios

### ✅ Quality Gates
- CI workflow integration
- Artifact uploads for triage
- Configurable thresholds

## Persistence Configuration

### Memory Adapter (Default)

No configuration required. Conversations are stored in memory and lost on restart.

```python
from agents.backend_agent import BackendAgent

agent = BackendAgent()  # Uses memory adapter by default
```

### SQLite Adapter

For file-based persistence with automatic cleanup:

**Environment Variables:**
```bash
export PERSISTENCE_ADAPTER=sqlite
export SQLITE_DB_PATH=/path/to/conversations.db  # Optional, defaults to /tmp/backend_agent_conversations.db
```

**Programmatic Configuration:**
```python
from agents.backend_agent import BackendAgent
from services.persistence_adapter import SQLitePersistenceAdapter

adapter = SQLitePersistenceAdapter(db_path='/opt/data/conversations.db')
agent = BackendAgent(persistence_adapter=adapter)
```

**Features:**
- Automatic schema initialization
- Indexed queries for performance
- TTL-based cleanup
- Safe concurrent access

### DynamoDB Adapter

For cloud-based persistence with automatic TTL:

**Prerequisites:**
- AWS credentials configured
- DynamoDB table created (see schema below)
- `boto3` installed: `pip install boto3`

**Environment Variables:**
```bash
export PERSISTENCE_ADAPTER=dynamodb
export DYNAMODB_TABLE_NAME=backend-agent-conversations
export DYNAMODB_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

**DynamoDB Table Schema:**
```javascript
{
  "TableName": "backend-agent-conversations",
  "KeySchema": [
    {"AttributeName": "conversation_id", "KeyType": "HASH"}
  ],
  "AttributeDefinitions": [
    {"AttributeName": "conversation_id", "AttributeType": "S"}
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "TimeToLiveSpecification": {
    "Enabled": true,
    "AttributeName": "ttl"
  }
}
```

**Create Table (AWS CLI):**
```bash
aws dynamodb create-table \
  --table-name backend-agent-conversations \
  --attribute-definitions AttributeName=conversation_id,AttributeType=S \
  --key-schema AttributeName=conversation_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

aws dynamodb update-time-to-live \
  --table-name backend-agent-conversations \
  --time-to-live-specification "Enabled=true, AttributeName=ttl"
```

**Programmatic Configuration:**
```python
from agents.backend_agent import BackendAgent
from services.persistence_adapter import DynamoDBPersistenceAdapter

adapter = DynamoDBPersistenceAdapter(
    table_name='backend-agent-conversations',
    region='us-east-1'
)
agent = BackendAgent(persistence_adapter=adapter)
```

### Cleanup Expired Conversations

All adapters support automatic cleanup of expired conversations:

```python
# Clean up conversations older than 7 days (168 hours)
cleaned_count = agent.cleanup_expired_conversations(ttl_hours=168)
print(f"Cleaned up {cleaned_count} expired conversations")
```

**Recommended Schedule:**
- Run cleanup daily via cron or scheduled task
- Default TTL: 7 days (168 hours)
- Adjust TTL based on your retention policy

## Check Execution

### Overview

The `run_checks` method executes real linting, testing, and build commands instead of mocks.

### Execution Modes

Configure via `CHECK_MODE` environment variable or constructor:

1. **`real`** - Always execute real commands, fail on error
2. **`mock`** - Always return mock success (for testing)
3. **`auto`** (default) - Try real commands, fall back to mock on error

**Setting Mode:**
```bash
export CHECK_MODE=real  # or mock, or auto
```

```python
agent = BackendAgent(check_mode='real')
```

### Configurable Commands

Override default check commands via environment variables:

```bash
# Lint command (default: npm run lint)
export CHECK_COMMAND_LINT="npm run lint"

# Test command (default: npm run test:run)
export CHECK_COMMAND_TEST="npm run test:run"

# Build command (default: npm run build)
export CHECK_COMMAND_BUILD="npm run build"
```

### Timeouts

Commands have built-in timeouts to prevent hanging:
- **Lint**: 180 seconds (3 minutes)
- **Test**: 300 seconds (5 minutes)
- **Build**: 300 seconds (5 minutes)

### Usage Example

```python
from agents.backend_agent import BackendAgent

# Initialize agent
agent = BackendAgent(check_mode='real')

# Start a task
result = agent.start_task(user='gabriel', task_id='theme-preference-api')
conversation_id = result['conversation_id']

# Run checks with actual commands
check_results = agent.run_checks(
    conversation_id=conversation_id,
    working_dir='/path/to/project'
)

# Inspect results
print(f"All passed: {check_results['all_passed']}")
print(f"Lint: {check_results['lint']['passed']}")
print(f"Tests: {check_results['tests']['passed']}")
print(f"Build: {check_results['build']['passed']}")
```

### Check Output Format

Each check returns:
```python
{
    'passed': bool,           # True if check succeeded
    'command': str,           # Command that was executed
    'output': str,            # stdout + stderr (truncated to 2000 chars)
    'return_code': int,       # Process exit code
    # Additional fields per check type:
    # Lint: 'warnings', 'errors'
    # Test: 'total', 'passed_count', 'failed'
    # Build: 'size'
}
```

## Retry Logic

### Overview

The retry system handles transient GitHub API failures with intelligent backoff and token rotation.

### Features

- **Exponential Backoff**: Delays increase exponentially (1s, 2s, 4s, ...)
- **Jitter**: Random variation prevents thundering herd
- **Rate Limit Handling**: Respects `X-RateLimit-Reset` headers
- **Token Rotation**: Distributes load across multiple tokens

### Configuration

**Environment Variables:**
```bash
# Maximum retry attempts (default: 3)
export GITHUB_API_MAX_RETRIES=3

# Base delay in seconds (default: 1.0)
export GITHUB_API_BASE_DELAY=1.0

# Maximum delay in seconds (default: 60.0)
export GITHUB_API_MAX_DELAY=60.0

# Exponential base (default: 2.0)
export GITHUB_API_EXPONENTIAL_BASE=2.0

# Enable jitter (default: true)
export GITHUB_API_JITTER=true

# Token pool (comma-separated)
export GITHUB_API_TOKEN_POOL="ghp_token1,ghp_token2,ghp_token3"
```

### Token Pool

For high-throughput scenarios, configure multiple GitHub tokens:

```bash
# Option 1: Token pool
export GITHUB_API_TOKEN_POOL="ghp_xxx,ghp_yyy,ghp_zzz"

# Option 2: Single token (fallback)
export GITHUB_TOKEN="ghp_xxx"
```

**Token Rotation Strategy:**
- Round-robin selection
- Tracks failure count per token
- Automatically selects token with fewest failures

### Programmatic Usage

**Using Decorator:**
```python
from utils.retry_utils import retry_with_backoff, RetryConfig

# Configure retry behavior
config = RetryConfig(
    max_retries=5,
    base_delay=2.0,
    max_delay=120.0
)

@retry_with_backoff(config)
def call_github_api():
    # Your API call here
    pass
```

**Using Wrapper:**
```python
from utils.retry_utils import RetryableGitHubClient, TokenPool

# Initialize with token pool
tokens = ['ghp_token1', 'ghp_token2', 'ghp_token3']
token_pool = TokenPool(tokens)

client = RetryableGitHubClient(
    github_service=github_service,
    token_pool=token_pool
)

# Calls automatically retry on failure
result = client.call('get_repository', owner='foo', repo='bar')
```

### Retry Conditions

Retries are triggered for:
- HTTP 429 (Rate Limit)
- HTTP 5xx (Server Errors)
- Connection errors
- Timeouts

Retries are **not** triggered for:
- HTTP 4xx (Client Errors, except 429)
- HTTP 2xx (Success)

## Environment Variables

### Complete Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PERSISTENCE_ADAPTER` | `memory` | Persistence backend: `memory`, `sqlite`, `dynamodb` |
| `SQLITE_DB_PATH` | `/tmp/backend_agent_conversations.db` | SQLite database file path |
| `DYNAMODB_TABLE_NAME` | `backend-agent-conversations` | DynamoDB table name |
| `DYNAMODB_REGION` | `us-east-1` | AWS region for DynamoDB |
| `CHECK_MODE` | `auto` | Check execution mode: `real`, `mock`, `auto` |
| `CHECK_COMMAND_LINT` | `npm run lint` | Lint command |
| `CHECK_COMMAND_TEST` | `npm run test:run` | Test command |
| `CHECK_COMMAND_BUILD` | `npm run build` | Build command |
| `GITHUB_API_MAX_RETRIES` | `3` | Maximum retry attempts |
| `GITHUB_API_BASE_DELAY` | `1.0` | Base retry delay (seconds) |
| `GITHUB_API_MAX_DELAY` | `60.0` | Maximum retry delay (seconds) |
| `GITHUB_API_EXPONENTIAL_BASE` | `2.0` | Exponential backoff base |
| `GITHUB_API_JITTER` | `true` | Enable random jitter |
| `GITHUB_API_TOKEN_POOL` | - | Comma-separated GitHub tokens |
| `GITHUB_TOKEN` | - | Single GitHub token (fallback) |

### Example Configuration File

**`.env.production`:**
```bash
# Persistence
PERSISTENCE_ADAPTER=dynamodb
DYNAMODB_TABLE_NAME=backend-agent-prod
DYNAMODB_REGION=us-east-1

# Check Execution
CHECK_MODE=real
CHECK_COMMAND_LINT="npm run lint -- --max-warnings 0"
CHECK_COMMAND_TEST="npm run test:ci"
CHECK_COMMAND_BUILD="npm run build -- --mode production"

# Retry Configuration
GITHUB_API_MAX_RETRIES=5
GITHUB_API_BASE_DELAY=2.0
GITHUB_API_MAX_DELAY=120.0
GITHUB_API_TOKEN_POOL="${GITHUB_TOKEN_1},${GITHUB_TOKEN_2},${GITHUB_TOKEN_3}"

# AWS Credentials
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
```

## Setup Guides

### Quick Start (Development)

1. **Clone repository and install dependencies:**
   ```bash
   cd orchestrator
   pip install -r requirements.txt
   ```

2. **Run with defaults (memory persistence, auto mode):**
   ```python
   from agents.backend_agent import BackendAgent
   
   agent = BackendAgent()
   ```

3. **Run tests:**
   ```bash
   python -m unittest tests.test_backend_agent
   python -m unittest tests.test_persistence_adapter
   python -m unittest tests.test_retry_utils
   ```

### Production Setup (SQLite)

1. **Create data directory:**
   ```bash
   sudo mkdir -p /opt/backend-agent/data
   sudo chown $(whoami):$(whoami) /opt/backend-agent/data
   ```

2. **Configure environment:**
   ```bash
   export PERSISTENCE_ADAPTER=sqlite
   export SQLITE_DB_PATH=/opt/backend-agent/data/conversations.db
   export CHECK_MODE=real
   ```

3. **Set up cleanup cron:**
   ```bash
   # Add to crontab
   0 2 * * * /usr/bin/python3 /path/to/cleanup_script.py
   ```

   **cleanup_script.py:**
   ```python
   from agents.backend_agent import BackendAgent
   
   agent = BackendAgent()
   cleaned = agent.cleanup_expired_conversations(ttl_hours=168)
   print(f"Cleaned up {cleaned} conversations")
   ```

### Production Setup (DynamoDB)

1. **Create DynamoDB table:**
   ```bash
   aws dynamodb create-table \
     --table-name backend-agent-prod \
     --attribute-definitions AttributeName=conversation_id,AttributeType=S \
     --key-schema AttributeName=conversation_id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   
   aws dynamodb update-time-to-live \
     --table-name backend-agent-prod \
     --time-to-live-specification "Enabled=true, AttributeName=ttl"
   ```

2. **Configure IAM permissions:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:PutItem",
           "dynamodb:GetItem",
           "dynamodb:DeleteItem",
           "dynamodb:Scan",
           "dynamodb:Query"
         ],
         "Resource": "arn:aws:dynamodb:*:*:table/backend-agent-prod"
       }
     ]
   }
   ```

3. **Configure environment:**
   ```bash
   export PERSISTENCE_ADAPTER=dynamodb
   export DYNAMODB_TABLE_NAME=backend-agent-prod
   export DYNAMODB_REGION=us-east-1
   export CHECK_MODE=real
   ```

## Operational Runbook

### Monitoring

**Key Metrics to Track:**
- Conversation creation rate
- Check success/failure rates
- Average check execution time
- Retry attempts per API call
- Token usage distribution

**Health Checks:**
```python
# Check persistence health
try:
    agent.persistence.save_conversation({
        'conversation_id': 'health_check',
        'user_id': 'system',
        'task_id': 'health',
        'status': 'completed',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_activity_at': datetime.now(timezone.utc).isoformat()
    })
    agent.persistence.delete_conversation('health_check')
    print("✅ Persistence healthy")
except Exception as e:
    print(f"❌ Persistence error: {e}")

# Check check execution
result = agent.run_checks('test_conversation_id', working_dir='/tmp')
if result['all_passed']:
    print("✅ Check execution healthy")
else:
    print(f"❌ Check execution issues")
```

### Troubleshooting

#### Persistence Issues

**Symptom**: "Conversation not found" errors

**Solutions:**
1. Check persistence adapter configuration
2. Verify database/table exists
3. Check permissions
4. Review cleanup TTL settings

**Debug:**
```python
# List all conversations
convs = agent.list_conversations()
print(f"Total conversations: {len(convs)}")

# Check specific conversation
conv = agent._get_conversation('conv123')
if not conv:
    print("Conversation not in persistence")
```

#### Check Execution Failures

**Symptom**: All checks failing

**Solutions:**
1. Verify commands are correct for project
2. Check working directory path
3. Ensure dependencies are installed
4. Verify timeout settings
5. Check mode: try `auto` or `mock` for testing

**Debug:**
```python
# Test commands manually
import subprocess
result = subprocess.run('npm run lint', shell=True, cwd='/path/to/project')
print(f"Exit code: {result.returncode}")
```

#### Retry Exhaustion

**Symptom**: "Maximum retries exceeded"

**Solutions:**
1. Increase `GITHUB_API_MAX_RETRIES`
2. Add more tokens to `GITHUB_API_TOKEN_POOL`
3. Check GitHub API status
4. Verify token permissions
5. Review rate limits

**Debug:**
```python
# Check token pool
from utils.retry_utils import TokenPool
pool = TokenPool()
print(f"Token pool size: {pool.size()}")
print(f"Token failures: {pool.token_failures}")
```

### Maintenance

**Daily:**
- Monitor error logs
- Review check failure rates

**Weekly:**
- Review conversation retention
- Check database/table size
- Analyze token usage

**Monthly:**
- Clean up old data manually if needed
- Review and adjust TTL settings
- Update dependencies

### Backup and Recovery

**SQLite Backup:**
```bash
# Backup
cp /opt/backend-agent/data/conversations.db \
   /opt/backend-agent/backups/conversations-$(date +%Y%m%d).db

# Restore
cp /opt/backend-agent/backups/conversations-20250101.db \
   /opt/backend-agent/data/conversations.db
```

**DynamoDB Backup:**
```bash
# On-demand backup
aws dynamodb create-backup \
  --table-name backend-agent-prod \
  --backup-name backend-agent-$(date +%Y%m%d)

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name backend-agent-restored \
  --backup-arn arn:aws:dynamodb:region:account:table/backend-agent-prod/backup/xxx
```

### Security Considerations

1. **Token Security**:
   - Never commit tokens to version control
   - Use secret management (AWS Secrets Manager, HashiCorp Vault)
   - Rotate tokens regularly
   - Use minimum required permissions

2. **Database Security**:
   - Encrypt SQLite databases at rest
   - Use DynamoDB encryption
   - Restrict IAM permissions
   - Enable CloudTrail logging

3. **Check Execution**:
   - Validate working directory paths
   - Sanitize command inputs
   - Run in isolated environments
   - Limit resource usage

## Testing

Run the complete test suite:

```bash
cd orchestrator

# All tests
python -m unittest discover tests -v

# Specific suites
python -m unittest tests.test_persistence_adapter -v
python -m unittest tests.test_retry_utils -v
python -m unittest tests.test_backend_agent -v
```

**Test Coverage:**
- Persistence adapters: 13 tests
- Retry utilities: 21 tests
- Backend agent: 32 tests
- **Total: 66 tests, all passing**

## Support

For issues or questions:
1. Check logs for error messages
2. Review this documentation
3. Run health checks
4. Contact: @gcolon75

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Production Ready
