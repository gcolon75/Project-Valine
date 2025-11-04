# UX Designer Agent - Quick Start Guide

Quick reference for using the UX Designer & Implementation Agent.

## What This Agent Does

The UX Designer Agent helps you improve user experience by:
- Making layouts more intuitive and responsive
- Improving copy and error messages
- Enhancing accessibility
- Running automated audits

## When to Use This Agent

Use this agent for small, focused UX improvements:

✅ **Good Use Cases:**
- "Make the profile form easier to use on mobile"
- "Improve error messages for the login page"
- "Increase button contrast for accessibility"
- "Add loading states to async buttons"

❌ **Not Appropriate For:**
- Complete page redesigns (use RFC process)
- Backend API changes
- Database schema changes
- Infrastructure modifications

## How to Use

### 1. Simple Request

```
Agent: UX Designer, please improve the profile creation form by combining the display name and handle fields into a single line.
```

### 2. Request with Context

```
Agent: UX Designer, please improve error messaging for the /deploy-client page. 

Context:
- Current errors are too technical
- Target audience: non-technical content creators
- Brand colors: primary green (#10B981), secondary blue (#3B82F6)
```

### 3. Request with Constraints

```
Agent: UX Designer, please increase contrast of status badges to meet WCAG AA standards.

Constraints:
- Keep existing badge colors if possible
- Must work on both light and dark backgrounds
- Maintain current badge sizes
```

## What You'll Get

The agent will provide:

1. **Design Proposal** - Wireframes and alternatives
2. **Implementation** - Working code on a feature branch
3. **Audit Results** - Lighthouse and accessibility scores
4. **PR** - Complete with screenshots and documentation

## Example Output

### Request
"Improve the empty state message on the Scripts page"

### Agent Response

**Intake:**
- Current: "No scripts"
- Proposed: "You haven't created any scripts yet. Get started by clicking the button below."
- Also add: Friendly illustration or icon

**Design:**
```
┌────────────────────────────────┐
│                                │
│       📝                       │
│                                │
│   No Scripts Yet               │
│                                │
│   You haven't created any      │
│   scripts yet. Get started by  │
│   clicking the button below.   │
│                                │
│   [+ Create Your First Script] │
│                                │
└────────────────────────────────┘
```

**Implementation:**
- Branch: `ux/empty-state-scripts`
- Files: `src/pages/Scripts.jsx`, `CHANGES.md`
- Tests: Updated Scripts.test.jsx

**PR:** #124 with screenshots and audit results

## Tips for Better Results

### Be Specific
❌ "Make the UI better"  
✅ "Improve the profile form layout for mobile users by stacking fields vertically"

### Provide Context
❌ "Fix the error messages"  
✅ "Error messages on login are too technical for our voice actor audience. Make them friendlier and more helpful."

### State Constraints
❌ "Change the colors"  
✅ "Increase button contrast while keeping our brand primary green (#10B981)"

## Common Patterns

### Layout Improvements
```
Agent: UX Designer, make [component] responsive by [specific change]
```

### Copy Improvements
```
Agent: UX Designer, improve [button/message/label] text from "[current]" to be more [clear/friendly/helpful]
```

### Accessibility
```
Agent: UX Designer, add [ARIA labels/keyboard navigation/focus styles] to [component]
```

### Interactive States
```
Agent: UX Designer, add [loading/error/success] state to [button/form/component]
```

## Approval Process

1. Agent creates PR with design and implementation
2. Review the PR:
   - Check screenshots (before/after)
   - Review audit results (Lighthouse, accessibility)
   - Test the changes on staging/preview
3. Request changes if needed
4. Approve and merge when satisfied

## Need Help?

- Full documentation: `.github/agents/ux-designer.md`
- Examples: See "Example Tasks" section in agent definition
- Questions: Ask the agent for clarification before implementation

## Quick Reference: Acceptance Criteria

Every UX change must have:
- ✅ Before/after screenshots
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility audit (WCAG AA)
- ✅ Performance check (Lighthouse)
- ✅ Working tests
- ✅ Documentation (CHANGES.md entry)

## Version

Last Updated: 2025-10-17  
Agent Version: 1.0
