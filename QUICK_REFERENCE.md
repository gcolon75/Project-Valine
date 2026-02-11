# USER_FLOWS.md - Quick Reference Guide

## 📍 Location

**Main File:** `docs/USER_FLOWS.md` (3,068 lines, 82 KB)

## 🎯 Purpose

Single source of truth for all user interactions on the Joint platform. Designed for contractors, developers, QA engineers, and product managers.

## 📖 How to Use This Documentation

### For Contractors
1. Start with **Privacy Model Overview** (lines 1-100)
2. Read the specific flow you're implementing
3. Reference API endpoints for exact formats
4. Use error states section for error handling
5. Validate against success criteria

### For QA Engineers
1. Convert each flow into test cases
2. Test all decision points (documented in each flow)
3. Verify API responses match documented formats
4. Test all error states and recovery paths

### For Product Managers
1. Use flows when writing user stories
2. Reference Mermaid diagrams in presentations
3. Track implementation progress against flows

### For Designers
1. Use screenshot placeholders to identify design needs
2. Validate UI matches documented steps
3. Ensure error messages align with documented states

## 📚 Document Structure

```
docs/USER_FLOWS.md
├── Table of Contents (lines 9-22)
├── Privacy Model Overview (lines 24-100)
├── Flow 1-17 (lines 101-2633)
│   ├── Overview
│   ├── Mermaid Diagram
│   ├── Detailed Steps
│   ├── API Endpoints
│   ├── Components/Files
│   ├── Decision Points
│   ├── Database Changes
│   ├── Error States
│   ├── Success Criteria
│   └── Special Features
├── Appendix A: Common Components (lines 2634-2694)
├── Appendix B: Shared API Patterns (lines 2695-2802)
├── Appendix C: Database Schema Reference (lines 2803-2980)
└── Conclusion (lines 2981-3068)
```

## 🔍 Quick Navigation

### Find a Specific Flow
```bash
# Search for flow by name
grep -n "^## Flow" docs/USER_FLOWS.md

# Jump to specific line in your editor
vim +1148 docs/USER_FLOWS.md  # Edit Profile flow
```

### Find API Endpoints
```bash
# List all API endpoints
grep -n "^#### POST\|^#### GET\|^#### PATCH\|^#### DELETE" docs/USER_FLOWS.md
```

### Find Error Codes
```bash
# Find specific HTTP error
grep -n "400 Bad Request\|401 Unauthorized\|403 Forbidden" docs/USER_FLOWS.md
```

## 📊 Flow Line Numbers

1. Signup → Onboarding → Dashboard: **9-1147**
2. Edit Profile: **1148-1344**
3. Create Post: **1345-1463**
4. Request Access: **1464-1588**
5. User Login: **1589-1722**
6. View Post Detail: **1723-1799**
7. Upload Media: **1800-1891**
8. View Feed → Like/Comment: **1892-1970**
9. Connect with User: **1971-2037**
10. Search Users: **2038-2104**
11. View Notifications: **2105-2177**
12. Send Message: **2178-2255**
13. Manage Access Requests: **2256-2321**
14. Password Reset: **2322-2417**
15. Email Verification: **2418-2486**
16. Privacy Settings: **2487-2565**
17. Moderation Flow: **2566-2633**

## 🎨 Mermaid Diagrams

Each flow includes a comprehensive Mermaid flowchart. To render:

### In VS Code
- Install "Markdown Preview Mermaid Support" extension
- Open docs/USER_FLOWS.md
- Click "Preview" button

### Online
- Copy Mermaid code
- Paste into https://mermaid.live/

### In Documentation Sites
- Most modern doc platforms (GitBook, Docusaurus, etc.) support Mermaid natively

## 🔐 Privacy Model Quick Reference

| Viewer Type | Public Profile + PUBLIC Post | Private Profile + FOLLOWERS_ONLY Post |
|-------------|------------------------------|---------------------------------------|
| Non-follower | ✅ Full Access | ❌ No Access |
| Follower | ✅ Full Access | ✅ Full Access |
| Blocked User | ❌ No Access | ❌ No Access |

**Post Visibility:**
- **PUBLIC** = Everyone can see
- **FOLLOWERS_ONLY** = Only followers see
- **Gated** = Preview public, full content requires approval

## 🗂️ Related Files

- **USER_FLOWS_SUMMARY.md** - Statistics and metrics
- **DOCUMENTATION_COMPLETE.md** - Executive summary
- **IMPLEMENTATION_SUMMARY.md** - Technical completion report
- **api/prisma/schema.prisma** - Database schema
- **serverless/src/handlers/** - Backend API handlers
- **src/pages/** - Frontend page components

## ⚡ Quick Commands

### View specific flow
```bash
# Using sed
sed -n '1148,1344p' docs/USER_FLOWS.md  # Edit Profile flow

# Using less
less +1148 docs/USER_FLOWS.md
```

### Extract API endpoints
```bash
# Get all endpoints from Flow 1
sed -n '9,1147p' docs/USER_FLOWS.md | grep -A 20 "^#### POST\|^#### GET\|^#### PATCH"
```

### Count flows
```bash
grep -c "^## Flow" docs/USER_FLOWS.md  # Returns: 17
```

### Check completeness
```bash
# Verify all flows have required sections
for section in "Overview" "Mermaid" "Detailed Steps" "API Endpoints" "Error States"; do
  echo "$section: $(grep -c "$section" docs/USER_FLOWS.md)"
done
```

## 🚀 Integration Points

### With Jira/Linear
- Reference flow numbers in tickets: "Implements Flow 3 (Create Post)"
- Link to specific line: `docs/USER_FLOWS.md#L1345`

### With API Documentation
- OpenAPI specs should match endpoint documentation
- Use documented request/response as contract

### With Test Suites
- Map test cases to flows
- Name tests: `test_flow_1_signup_onboarding_success()`

### With Design System
- Screenshot placeholders indicate where designs needed
- Component references show which UI elements to use

## 📞 Support

**Questions about documentation:**
- Open issue in project tracker
- Tag with `documentation` label

**Found an error:**
- Create PR with fix
- Update version history in Conclusion section

**Need clarification:**
- Check Related Documentation section first
- Ask in #engineering-docs channel

---

**Last Updated:** 2024  
**Document Version:** 1.0  
**Status:** Production Ready
