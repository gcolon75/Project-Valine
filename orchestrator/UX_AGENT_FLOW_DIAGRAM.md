# UX Agent Conversation Flow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER SENDS REQUEST                       │
├─────────────────────────────────────────────────────────────┤
│  • Structured: /ux-update command:"section:header..."       │
│  • Plain English: /ux-update description:"Make navbar blue" │
│  • With Image: /ux-update description:"..." [screenshot]    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENT PARSES USER INTENT                        │
├─────────────────────────────────────────────────────────────┤
│  • Extract section (header/navbar/footer/home)              │
│  • Extract properties (text/color/links/brand)              │
│  • Analyze images (if provided)                             │
│  • Parse plain text for hints                               │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
    Clear Intent?                 Unclear?
           │                          │
           ▼                          ▼
    ┌────────────┐         ┌──────────────────────┐
    │  Generate  │         │  Ask Clarifying      │
    │  Preview   │         │  Questions           │
    └─────┬──────┘         └──────┬───────────────┘
          │                       │
          │              ┌────────┴─────────┐
          │              │  User Responds   │
          │              │  with Details    │
          │              └────────┬─────────┘
          │                       │
          │                       ▼
          │              ┌──────────────────┐
          └──────────────│  Generate Preview│
                         └────────┬─────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   SHOW PREVIEW + CODE                        │
├─────────────────────────────────────────────────────────────┤
│  🎨 Got it! Here's what I'm about to do:                    │
│                                                              │
│  Section: header                                             │
│  File: src/components/Header.jsx                             │
│                                                              │
│  Changes:                                                    │
│  • Update text to: "Level Up!"                              │
│                                                              │
│  Preview:                                                    │
│  ```jsx                                                      │
│  <Link>Level Up!</Link>                                      │
│  ```                                                         │
│                                                              │
│  ✅ Ready? Type 'yes' to confirm or 'no' to cancel!         │
│  💬 Or tell me what to tweak!                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER RESPONDS                             │
└──┬──────────────┬──────────────────┬────────────────────────┘
   │              │                  │
"yes"/"confirm"  "no"/"cancel"   Other text (modification)
   │              │                  │
   ▼              ▼                  ▼
┌──────────┐  ┌──────────┐   ┌────────────────────┐
│ Execute  │  │ Cancel & │   │ Parse Modification │
│ Changes  │  │ Exit     │   │ & Regenerate       │
└────┬─────┘  └────┬─────┘   └──────┬─────────────┘
     │             │                 │
     │             │                 │
     ▼             ▼                 ▼
┌──────────┐  ┌──────────┐   ┌────────────────────┐
│ Create   │  │  🚫 No   │   │ Show Updated       │
│ Draft PR │  │ problem! │   │ Preview            │
└────┬─────┘  │          │   └──────┬─────────────┘
     │        │ Request  │          │
     │        │cancelled!│          │
     ▼        └──────────┘          │
┌──────────┐                        │
│   🎨     │                        │
│ Updated! │                        │
│ Draft PR │                        │
│ [link]   │                        │
└──────────┘                        │
                                    │
                                    │ Ask for confirmation again
                                    └────────────────────┐
                                                         │
                                                         ▼
                                              Back to "USER RESPONDS"
```

## State Diagram

```
                    ┌──────────────┐
                    │   IDLE       │
                    │ (No Active   │
                    │ Conversation)│
                    └──────┬───────┘
                           │
                      User sends request
                           │
                           ▼
      ┌────────────────────────────────────────────┐
      │         CONVERSATION STARTED                │
      │  • conversation_id created                  │
      │  • User ID tracked                          │
      │  • Section/updates parsed (if clear)        │
      └────────┬───────────────────┬────────────────┘
               │                   │
        Clear intent?         Unclear?
               │                   │
               ▼                   ▼
      ┌────────────────┐  ┌────────────────────┐
      │  PREVIEW_READY │  │ NEEDS_CLARIFICATION│
      │                │  │                     │
      │ • Preview shown│  │ • Questions asked   │
      │ • Awaiting     │  │ • Awaiting response │
      │   confirmation │  └──────┬─────────────┘
      └────────┬───────┘         │
               │                 │ User clarifies
               │                 │
               │                 ▼
               │        ┌────────────────────┐
               │        │  Parse Clarification│
               │        └──────┬─────────────┘
               │               │
               │               ▼
               │      Still unclear?
               │        │        │
               │       Yes       No
               │        │        │
               │        │        └──────────┐
               │        │                   │
               │        └─────────┐         │
               │                  │         │
               │                  ▼         ▼
               │         ┌────────────────────┐
               │         │  Ask More Questions│
               │         └────────────────────┘
               │                  
               │         Generate preview
               │                  │
               └──────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │    AWAITING_CONFIRMATION       │
         │                                 │
         │ • Preview displayed             │
         │ • Code snippets shown           │
         │ • Waiting for user decision     │
         └──┬──────────┬──────────────┬───┘
            │          │              │
         "yes"       "no"         other text
            │          │              │
            ▼          ▼              ▼
    ┌──────────┐ ┌─────────┐  ┌────────────┐
    │ EXECUTING│ │CANCELLED│  │  MODIFYING │
    │          │ │         │  │            │
    │ Creating │ │ Convo   │  │ Parse new  │
    │ Draft PR │ │ deleted │  │ intent     │
    └────┬─────┘ └────┬────┘  └─────┬──────┘
         │            │              │
         │            │              │ Regenerate preview
         ▼            ▼              │
    ┌──────────┐ ┌─────────┐        │
    │COMPLETED │ │  IDLE   │        │
    │          │ └─────────┘        │
    │ PR link  │                    │
    │ returned │                    │
    │ Convo    │                    ▼
    │ deleted  │           Back to AWAITING_CONFIRMATION
    └────┬─────┘
         │
         ▼
    ┌─────────┐
    │  IDLE   │
    └─────────┘
```

## Example Conversation Timeline

```
T0: User sends "/ux-update description:Make navbar blue"
    ↓
T1: Agent parses intent
    - Section: navbar (detected)
    - Property: color (inferred from "blue")
    - Value: needs clarification (hex code?)
    ↓
T2: Agent asks clarifying question
    "🤔 What shade of blue? Please provide hex code like #0000FF"
    ↓
T3: User responds "#0000FF"
    ↓
T4: Agent parses response
    - Updates color to #0000FF
    ↓
T5: Agent generates preview
    - Shows CSS code snippet
    - Shows file path
    - Shows exact change
    ↓
T6: User responds "yes"
    ↓
T7: Agent executes
    - Creates branch
    - Makes changes
    - Opens draft PR
    ↓
T8: Agent returns success
    - Shows PR link
    - Conversation ends
```

## Error Handling Flow

```
┌──────────────────┐
│  User Input      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  Validation                  │
│                              │
│  • Section exists?           │
│  • Properties valid?         │
│  • Color format correct?     │
│  • Required fields present?  │
└────┬──────────────┬──────────┘
     │              │
   Valid         Invalid
     │              │
     ▼              ▼
Continue      ┌──────────────────┐
              │  Show Error      │
              │                  │
              │  ❌ [Error msg]  │
              │                  │
              │  💡 Examples:    │
              │  • [example 1]   │
              │  • [example 2]   │
              └──────────────────┘
```

## Conversation Lifecycle

```
┌─────────────┐
│ Created     │  UUID generated
│             │  User ID stored
│ Timestamp:  │  Initial state set
│ T0          │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Active      │  User interacting
│             │  Messages exchanged
│ Duration:   │  State updated
│ T0 → T5     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Resolved    │  Confirmed or Cancelled
│             │  PR created (if confirmed)
│ Timestamp:  │  Conversation deleted
│ T5          │  Memory freed
└─────────────┘
```

## Key Decision Points

```
1. Parse User Input
   ├─ Command format? → Use structured parser
   ├─ Plain text? → Use NLP parser
   └─ Has images? → Analyze metadata

2. Check Clarity
   ├─ Section clear? → Continue
   ├─ Section unclear? → Ask "Which section?"
   ├─ Properties clear? → Continue
   └─ Properties unclear? → Ask "What to change?"

3. Generate Preview
   ├─ Text change? → Show JSX snippet
   ├─ Color change? → Show CSS snippet
   ├─ Link change? → Show Link component
   └─ Multiple changes? → Show all snippets

4. Handle Confirmation
   ├─ User says "yes"? → Execute changes
   ├─ User says "no"? → Cancel & cleanup
   ├─ User modifies? → Parse & regenerate
   └─ Timeout? → Cleanup & notify
```

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│            Discord Interface Layer               │
│  • Slash command handler                         │
│  • Message formatting                            │
│  • User interaction management                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│          UX Agent Orchestration Layer            │
│  • Conversation state management                 │
│  • Flow control (start/confirm/execute)          │
│  • Intent parsing coordination                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           Processing & Analysis Layer            │
│  • Command parser                                │
│  • Plain text parser                             │
│  • Image analyzer (basic)                        │
│  • Preview generator                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│             Execution Layer                      │
│  • File modification logic                       │
│  • PR creation via GitHub API                    │
│  • Audit logging                                 │
└─────────────────────────────────────────────────┘
```

---

**Legend:**
- `▼` Flow direction
- `├─` Decision branch
- `└─` Final branch
- `→` Continues to
- `[x]` State or action
