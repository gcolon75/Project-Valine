# GitHub AI Agents

This directory contains AI agent definitions for the Project Valine repository. These agents help automate various aspects of development, quality assurance, and user experience improvements.

## Available Agents

### UX Designer & Implementation Agent
**File:** `ux-designer.md`  
**Purpose:** Owns user experience improvements end-to-end, from design to implementation

**Capabilities:**
- Translate UX requests into concrete design changes
- Produce wireframes and mockups
- Implement front-end improvements with tests
- Run accessibility and performance audits
- Open well-documented PRs with before/after evidence

**Use cases:**
- Layout improvements (responsive design, spacing, alignment)
- Copy improvements (button labels, error messages, help text)
- Accessibility enhancements (contrast, ARIA labels, keyboard navigation)
- Interactive improvements (loading states, validation, tooltips)

**How to invoke:**
```
Agent: UX Designer, please [specific request with context]

Example:
Agent: UX Designer, please improve the profile editor layout by making the form single-column on mobile and adding inline validation messages.
```

## Agent Workflow

All agents in this directory follow a standard workflow:

1. **Intake** - Parse request and propose implementation plan
2. **Design/Planning** - Create artifacts and alternatives
3. **Implementation** - Make minimal, safe changes
4. **Validation** - Run tests, linters, and audits
5. **PR Creation** - Open PR with comprehensive documentation
6. **Iteration** - Respond to feedback and refine

## Safety Guidelines

Agents in this directory are designed with safety constraints:

- ✅ Can modify front-end code, styles, and documentation
- ✅ Can run tests, linters, and audits
- ✅ Can create branches and open PRs
- ❌ Cannot modify backend APIs or server-side code
- ❌ Cannot change infrastructure or production configurations
- ❌ Cannot commit secrets or sensitive data
- ❌ Cannot make changes without tests or documentation

## Creating New Agents

When adding a new agent definition to this directory:

1. Use Markdown format for readability
2. Include these sections:
   - **Role** - What the agent does
   - **Scope** - What it can and cannot modify
   - **Workflow** - Step-by-step process
   - **Acceptance Criteria** - Quality standards
   - **Examples** - Sample requests and outputs
   - **Safety Constraints** - What to avoid

3. Follow the pattern established by existing agents
4. Include templates for common outputs (PR descriptions, commit messages)
5. Document how to invoke the agent and what inputs it needs
6. Add version history for tracking changes to the agent definition

## Directory Structure

```
.github/agents/
├── README.md           # This file
├── ux-designer.md      # UX Designer & Implementation Agent
└── [future-agent].md   # Additional agents as needed
```

## Integration

These agent definitions can be used by:

- **Human developers** - As guidelines for manual UX improvements
- **AI assistants** - As system prompts for automated workflows
- **Orchestrator** - For Discord/GitHub integration and automation
- **CI/CD** - For automated quality checks and reviews

## Related Documentation

- **Orchestrator**: `orchestrator/README.md` - AI workflow automation
- **Pull Request Template**: `.github/pull_request_template.md` - PR guidelines
- **Agent Prompts**: `orchestrator/agent-prompts/` - Legacy agent definitions (to be consolidated)

## Maintenance

- Review and update agent definitions quarterly
- Keep examples current with repository structure
- Gather feedback from users and iterate
- Ensure safety constraints remain comprehensive
- Document any breaking changes to workflows

## Version History

- **2025-10-17**: Initial agents directory created
  - Added UX Designer & Implementation Agent
  - Established agent definition standards
  - Created README and documentation
