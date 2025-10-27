# Lambda Import Error Fix

## Problem
Lambda was failing to import the Discord handler with error:
```
[ERROR] Runtime.ImportModuleError: Unable to import module 'handlers.discord_handler': No module named 'app'
```

## Root Cause
The SAM template configuration had:
- `CodeUri: app/` - This makes the `app/` directory the root of the Lambda deployment package
- `Handler: handlers.discord_handler.handler` - This tells Lambda to import from `handlers.discord_handler`

However, the Python code was importing modules using absolute paths like:
```python
from app.verification.verifier import DeployVerifier
from app.services.github import GitHubService
```

When Lambda deploys with `CodeUri: app/`, the package structure looks like:
```
(Lambda package root)
├── handlers/
│   └── discord_handler.py
├── services/
│   └── github.py
├── verification/
│   └── verifier.py
└── ...
```

So imports looking for `app.services` fail because there is no `app` directory - `app` IS the root!

## Solution
Changed all import statements to be relative to the `app/` directory:

**Before:**
```python
from app.services.github import GitHubService
from app.verification.verifier import DeployVerifier
from app.utils.logger import StructuredLogger
```

**After:**
```python
from services.github import GitHubService
from verification.verifier import DeployVerifier
from utils.logger import StructuredLogger
```

## Files Modified
1. `orchestrator/app/handlers/discord_handler.py` - Main handler imports
2. `orchestrator/app/utils/alerts.py` - Alert manager imports
3. `orchestrator/app/verification/github_actions.py` - GitHub Actions verifier imports
4. `orchestrator/app/verification/http_checker.py` - HTTP checker imports
5. `orchestrator/app/verification/message_composer.py` - Message composer imports
6. `orchestrator/app/verification/verifier.py` - Main verifier imports
7. `.github/workflows/deploy-orchestrator.yml` - Added `--force-upload` flag

## Deployment Fix
Added `--force-upload` flag to the SAM deploy command in the GitHub Actions workflow to bypass S3 caching and ensure fresh code is deployed:

```yaml
sam deploy \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --force-upload \
  --parameter-overrides ...
```

## Verification
1. **Local SAM Build Test:**
   ```bash
   cd orchestrator
   sam build --use-container
   # Verify build succeeded
   ```

2. **Import Test:**
   ```bash
   cd orchestrator
   python3 tests/test_lambda_imports.py
   # Should show: ✅ All Lambda import tests passed!
   ```

3. **Simulated Lambda Environment Test:**
   ```bash
   cd orchestrator/.aws-sam/build/DiscordHandlerFunction
   python3 -c "from handlers.discord_handler import handler; print('✓ Handler imported successfully')"
   ```

## Expected Results After Deployment
✅ Lambda imports successfully (no more "No module named 'app'" errors)  
✅ Discord endpoint validation passes  
✅ CloudWatch shows clean startup with no import errors  
✅ Actual NEW code gets deployed (not cached)  

## Future Considerations
- All new Python files in the `app/` directory should use imports relative to `app/`, not absolute `from app.X` imports
- The SAM template's `CodeUri: app/` should remain unchanged - it's the correct configuration
- Handler path `handlers.discord_handler.handler` is correct and should not be changed
