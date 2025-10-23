# Discord Endpoint Verification - Visual Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISCORD ENDPOINT VERIFICATION                         │
│                           Problem & Solution                             │
└─────────────────────────────────────────────────────────────────────────┘

CURRENT STATE:
┌──────────────┐
│   Discord    │
│  Developer   │──┐
│   Portal     │  │
└──────────────┘  │
                  ▼
          [PING Request]
                  │
                  ▼
┌────────────────────────────────────────┐
│      API Gateway Endpoint              │
│  3n6t1f7pw1.execute-api...discord      │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│   Lambda: valine-orchestrator-         │
│           discord-dev                   │
│                                         │
│   Signature Verification:               │
│   ❌ FAILS - Public Key Mismatch       │
└────────────────────────────────────────┘
                  │
                  ▼
          ❌ Verification Failed
          "Cannot verify endpoint"


ROOT CAUSE ANALYSIS:
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  Discord Bot                      Lambda Environment                 │
│  Public Key                       Variable                           │
│  ┌─────────────┐                  ┌─────────────┐                  │
│  │ abc123def   │                  │ xyz789ghi   │                  │
│  │ 456...      │    ≠ MISMATCH ≠  │ 012...      │                  │
│  │             │                  │             │                  │
│  └─────────────┘                  └─────────────┘                  │
│  (Staging Bot)                    (What Lambda has)                 │
│  App ID: 1428...                                                    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘


DIAGNOSTIC FLOW:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   START                                                                  │
│     │                                                                    │
│     ▼                                                                    │
│   ┌────────────────────────────────────┐                               │
│   │ Run: ./verify_discord_config.sh    │                               │
│   └────────────────────────────────────┘                               │
│     │                                                                    │
│     ├───► ✅ Lambda exists?                                             │
│     ├───► ✅ Public key format valid?                                   │
│     ├───► ✅ API endpoint accessible?                                   │
│     └───► ⚠️  Keys match?                                               │
│              │                                                           │
│              ▼                                                           │
│         ┌─────────┐                                                     │
│         │  YES    │─────► ✅ Ready to verify in Discord                 │
│         └─────────┘                                                     │
│              │                                                           │
│         ┌─────────┐                                                     │
│         │   NO    │─────► Need to fix                                   │
│         └─────────┘       │                                             │
│                           ▼                                             │
│                    Choose Fix Method                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


FIX METHODS:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  OPTION A: Quick Fix (5 min)           OPTION B: Proper Fix (10 min)   │
│  ┌─────────────────────────────┐       ┌───────────────────────────┐  │
│  │ ./verify_discord_config.sh  │       │ 1. Get public key from    │  │
│  │ --fix                        │       │    Discord Portal         │  │
│  │                              │       │                           │  │
│  │ Enter correct public key     │       │ 2. Update GitHub Secret:  │  │
│  │ from Discord Portal          │       │    STAGING_DISCORD_       │  │
│  │                              │       │    PUBLIC_KEY             │  │
│  │ ✅ Lambda updated directly   │       │                           │  │
│  │                              │       │ 3. Re-run deploy workflow │  │
│  │ ⚠️  Manual fix - will be     │       │                           │  │
│  │    overwritten on next       │       │ ✅ Permanent fix          │  │
│  │    deployment                │       │                           │  │
│  └─────────────────────────────┘       └───────────────────────────┘  │
│           │                                      │                      │
│           └──────────────┬───────────────────────┘                      │
│                          ▼                                              │
│                    BOTH LEAD TO:                                        │
│              Lambda has correct key                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


VERIFICATION FLOW:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Discord Developer Portal                                              │
│     │                                                                    │
│     ▼                                                                    │
│   ┌───────────────────────────────────────────────────────┐            │
│   │ Interactions Endpoint URL:                             │            │
│   │ https://3n6t1f7pw1.execute-api...discord              │            │
│   │ [Save Changes]                                         │            │
│   └───────────────────────────────────────────────────────┘            │
│     │                                                                    │
│     ▼                                                                    │
│   Discord sends PING {"type":1}                                         │
│     │                                                                    │
│     ▼                                                                    │
│   ┌────────────────────────────────────┐                               │
│   │  Lambda Handler:                   │                               │
│   │  1. Get signature from headers     │                               │
│   │  2. Get public key from env        │                               │
│   │  3. Verify signature              │                               │
│   │     ✅ SUCCESS (keys match now)    │                               │
│   │  4. Return PONG {"type":1}        │                               │
│   └────────────────────────────────────┘                               │
│     │                                                                    │
│     ▼                                                                    │
│   ✅ Discord receives PONG                                              │
│   ✅ "Successfully verified" message                                    │
│   ✅ Endpoint is now active                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


SUCCESS STATE:
┌──────────────┐
│   Discord    │
│  Developer   │──┐
│   Portal     │  │  ✅ Endpoint verified
└──────────────┘  │
                  ▼
          [PING Request]
                  │
                  ▼
┌────────────────────────────────────────┐
│      API Gateway Endpoint              │
│  3n6t1f7pw1.execute-api...discord      │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│   Lambda: valine-orchestrator-         │
│           discord-dev                   │
│                                         │
│   Environment Variables:                │
│   DISCORD_PUBLIC_KEY = abc123def456...  │
│   (Matches staging bot!)                │
│                                         │
│   Signature Verification:               │
│   ✅ SUCCESS                            │
└────────────────────────────────────────┘
                  │
                  ▼
          ✅ Returns PONG
          ✅ Discord Verified!
          ✅ Bot Ready to Receive Commands


TIMELINE:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Minute 0:  Run ./verify_discord_config.sh                              │
│  Minute 1:  Identify key mismatch                                       │
│  Minute 2:  Get correct key from Discord Portal                         │
│  Minute 3:  Run ./verify_discord_config.sh --fix                        │
│  Minute 4:  Go to Discord Portal → Interactions Endpoint URL            │
│  Minute 5:  Save → Discord verifies → ✅ SUCCESS!                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


KEY POINTS:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ✅ Everything else is working:                                         │
│     • Lambda deployed ✅                                                │
│     • API Gateway configured ✅                                         │
│     • Import paths fixed ✅                                             │
│     • CORS headers correct ✅                                           │
│                                                                          │
│  ⚠️  Only one issue:                                                    │
│     • Public key value needs to match staging bot                       │
│                                                                          │
│  🔧 Fix is simple:                                                      │
│     • Update Lambda env var with correct key                            │
│     • Or update GitHub Secret and redeploy                              │
│                                                                          │
│  ⏱️  Time to fix: 5 minutes                                             │
│                                                                          │
│  🎯 Success criteria:                                                   │
│     • Discord shows "Successfully verified" ✅                          │
│     • Bot can receive slash commands ✅                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


BOT INFORMATION:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Staging Bot (CURRENT TARGET):                                          │
│  • App ID: 1428568840958251109                                          │
│  • Public Key: Get from Discord Portal                                  │
│  • Endpoint: https://3n6t1f7pw1.execute-api...discord                   │
│                                                                          │
│  Production Bot (DO NOT USE):                                           │
│  • App ID: 1302154777933172756                                          │
│  • Public Key: Different from staging!                                  │
│  • DO NOT mix up the keys! ⚠️                                           │
│                                                                          │
│  Lambda Function:                                                       │
│  • Name: valine-orchestrator-discord-dev                                │
│  • Region: us-west-2                                                    │
│  • Stack: valine-orchestrator-staging                                   │
│  • Environment Variable: DISCORD_PUBLIC_KEY                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


QUICK COMMANDS:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  # Diagnose                                                              │
│  cd orchestrator/scripts                                                 │
│  ./verify_discord_config.sh                                              │
│                                                                          │
│  # Fix (Option A - Quick)                                                │
│  ./verify_discord_config.sh --fix                                        │
│                                                                          │
│  # Fix (Option B - Proper)                                               │
│  # 1. Update GitHub Secret: STAGING_DISCORD_PUBLIC_KEY                   │
│  # 2. Re-run deploy workflow                                             │
│                                                                          │
│  # Check Lambda key                                                      │
│  aws lambda get-function-configuration \                                 │
│    --function-name valine-orchestrator-discord-dev \                     │
│    --region us-west-2 \                                                  │
│    --query 'Environment.Variables.DISCORD_PUBLIC_KEY'                    │
│                                                                          │
│  # Test public key format                                                │
│  python3 test_discord_verification.py <PUBLIC_KEY>                       │
│                                                                          │
│  # Check CloudWatch logs                                                 │
│  aws logs tail /aws/lambda/valine-orchestrator-discord-dev \             │
│    --region us-west-2 --follow                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## How to Use This Flowchart

1. **Follow the arrows** from top to bottom
2. **Start at "DIAGNOSTIC FLOW"** to understand the process
3. **Choose a fix method** based on your needs (quick vs proper)
4. **Follow "VERIFICATION FLOW"** to complete the process
5. **Check "SUCCESS STATE"** to confirm everything works

## Visual Key

- `✅` = Working / Success
- `❌` = Broken / Failure
- `⚠️` = Warning / Attention needed
- `▼` = Flow direction
- `┌─┐` = Process box
- `├─┤` = Decision point
