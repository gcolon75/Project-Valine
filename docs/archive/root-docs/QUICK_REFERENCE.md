> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](./README.md) for current docs

---
# Avatar/Banner Fix - Quick Reference

## 🎯 The Bug
**Problem**: Updating avatar alone → banner becomes null (and vice versa)  
**Cause**: Frontend sends `null`, backend accepts `null`

## ✅ The Fix
**Backend**: Added `&& !== null` checks (2 lines)  
**Frontend**: Only send fields with values (13 lines)

## 🚀 Deploy Now (PowerShell)
```powershell
# 1. Backend
cd serverless
npm run deploy

# 2. Frontend
cd ..
npm run build
# Deploy dist/

# 3. Verify
.\scripts\verify-avatar-banner-fix.ps1
```

## ✅ Test (2 minutes)
1. Upload avatar → Save → ✅ Banner preserved
2. Upload banner → Save → ✅ Avatar preserved
3. Upload both → Save → ✅ Both saved

## 📊 Impact
- **Risk**: LOW
- **Downtime**: ZERO
- **Changes**: 15 lines
- **Security**: No impact
- **Rollback**: Available

## 📚 Full Docs
- `SCHEMA_DRIFT_AUDIT_AVATAR_BANNER_FIX.md` - Complete audit
- `DEPLOYMENT_GUIDE_AVATAR_BANNER_FIX.md` - Deploy steps
- `FINAL_IMPLEMENTATION_SUMMARY.md` - Executive summary

## 🛑 If Issues Arise
```powershell
# Rollback backend
cd serverless
sls rollback -t PREVIOUS_TIMESTAMP

# Rollback frontend
git revert HEAD~3
npm run build
# Deploy
```

## ✅ Success Criteria
- Health check: `Invoke-RestMethod "$ApiBase/health"` → healthy
- Avatar-only save → Banner not lost
- Banner-only save → Avatar not lost
- Both together → Both persist

---

**Status**: ✅ Ready to deploy  
**Time**: ~20 minutes  
**Files**: 2 modified, 5 added
