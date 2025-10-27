# Agent Prompts Directory

This directory contains AI agent prompt files for the Project Valine orchestrator system.

## Active Agent Prompts

### Natural Language UX Agent
**File:** `natural_language_ux_agent.md`

**Purpose:** 
The Natural Language UX Agent is a conversational AI assistant that helps users make UI/UX changes through natural language requests via Discord. It translates vague user requests into precise code changes by understanding context, comparing components across pages, and maintaining an interactive conversation flow.

**Key Features:**
- Conversational UI/UX updates via Discord slash commands
- Component matching and style comparison across pages
- Interactive confirmation flow before making changes
- Automatic creation of draft GitHub PRs
- Support for text, color, layout, and effect property changes

**Usage:**
The agent is deployed using the deployment script:
```powershell
cd orchestrator
.\deploy-natural-ux-agent.ps1 -Stage dev
```

**Related Documentation:**
- Deployment script: `../deploy-natural-ux-agent.ps1`
- UX Agent guides: `../docs/guides/agents/UX_AGENT_*.md`

---

## Other Agent Prompts

This directory also contains prompts for other specialized agents:

- **QA Checker Agents** (phase2-5): Automated PR validation for different implementation phases
- **Deploy Verifier**: Deployment verification and validation
- **Discord Agents**: Communication and confirmation flow agents
- **Phase 5 Staging Validator**: Staging environment validation
- **Agent Task Schema**: Task structure and format definition

## Maintenance

All agent prompt files should:
- Be in Markdown format
- Use plain ASCII text (no emojis or special Unicode characters)
- Include clear version information
- Document their purpose and usage
- Be referenced by appropriate deployment or orchestration scripts

## Adding New Agent Prompts

When adding a new agent prompt:
1. Create a descriptive filename using snake_case (e.g., `new_agent_name.md`)
2. Follow the existing prompt structure with clear sections
3. Use plain ASCII text only
4. Update this README with the new agent's purpose
5. Create or update the corresponding deployment script
6. Add documentation in `../docs/guides/agents/` if needed
