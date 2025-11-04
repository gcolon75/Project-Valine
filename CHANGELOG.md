# Changelog

All notable changes to Project Valine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2025-10-23] - Fixed Lambda Deployment Cache Issues + Discord Endpoint Validation

### 🐛 What Was Broken

The Discord bot Lambda function was experiencing critical deployment failures:

- **Stale S3 Artifacts**: AWS SAM was reusing cached Lambda packages from S3, causing deployments to use old code even after successful builds
- **Import Errors**: Lambda crashed immediately with `Runtime.ImportModuleError: No module named 'app'` because the deployed package contained outdated code structure
- **Failed Endpoint Validation**: Discord Developer Portal couldn't verify the interactions endpoint, preventing the bot from going live
- **Manual Workarounds Required**: Developers had to manually clear S3 cache or delete/recreate the entire CloudFormation stack to force fresh deployments
- **No Automated Testing**: Deployments succeeded in CI but failed silently at runtime, only discovered when testing Discord interactions

### ✅ What We Fixed

#### 1. Timestamp Cache-Buster Mechanism ([PR #88](https://github.com/gcolon75/Project-Valine/pull/88))

**Problem**: SAM's `sam deploy` command checks if the local build artifact matches the S3 hash. If they match, it skips upload, even if the code structure changed.

**Solution**: 
- Created `scripts/generate-deploy-stamp.sh` that injects a unique timestamp file (`.deploy-stamp`) into every build
- File contains deployment timestamp, GitHub Actions run ID, and commit SHA
- Forces S3 hash to change on every deploy, bypassing cache
- Added to deploy workflow before `sam build` step

**Impact**: Every deploy now uploads fresh artifacts to S3, eliminating stale code issues.

#### 2. Automated Health Check ([PR #90](https://github.com/gcolon75/Project-Valine/pull/90))

**Problem**: Deployments appeared successful in CI but Lambda crashed at runtime with import errors. No automated way to catch this.

**Solution**:
- Created `scripts/test-discord-endpoint.sh` that sends a Discord PING request to the deployed Lambda
- Validates Lambda can start without crashing (checks for 200/401 responses, fails on 500/502/503)
- Integrated into deploy workflow as final step after `sam deploy`
- Provides clear error messages linking to CloudWatch logs if health check fails

**Impact**: CI now catches broken Lambda deployments immediately, before Discord registration is attempted.

#### 3. Recovery Playbook ([PR #89](https://github.com/gcolon75/Project-Valine/pull/89))

**Problem**: When Lambda deployments failed, developers had no clear troubleshooting guide and wasted hours experimenting.

**Solution**:
- Created comprehensive troubleshooting guide: `orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md`
- Includes 3 recovery options:
  - **Option 1: Force Fresh Deploy** (non-destructive, using `--force-upload`)
  - **Option 2: Check IAM Permissions** (diagnose access issues)
  - **Option 3: Nuclear Reset** (last resort - delete and recreate stack)
- Copy-paste emergency commands for when Lambda is on fire 🔥
- Troubleshooting matrix mapping symptoms to fixes
- Gen Z tone with gaming metaphors (respawn = redeploy, boss fight = debugging)

**Impact**: Developers can now diagnose and fix deployment issues in <5 minutes instead of hours.

### 🎮 Current Status

- ✅ **Discord Bot Endpoint**: Operational and validated
- ✅ **Lambda Imports**: Working correctly with fresh code on every deploy
- ✅ **CI Health Checks**: Catching broken deployments automatically
- ✅ **Developer Experience**: Clear playbook for troubleshooting

### 🔗 Related Issues & PRs

- [PR #88 - Timestamp Cache-Buster](https://github.com/gcolon75/Project-Valine/pull/88)
- [PR #89 - Recovery Playbook](https://github.com/gcolon75/Project-Valine/pull/89)
- [PR #90 - Automated Health Check](https://github.com/gcolon75/Project-Valine/pull/90)

### 📚 Documentation Updates

- Added "Recent Updates" section to [README.md](README.md)
- Created recovery playbook: [orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md](orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md)
- Updated [orchestrator/README.md](orchestrator/README.md) with deployment troubleshooting guidance

---

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

---

**Note**: For UX-specific changes, see [CHANGES.md](docs/reference/changes.md)
