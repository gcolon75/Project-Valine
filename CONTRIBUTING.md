# Contributing to Project Valine

Thank you for your interest in contributing to Project Valine! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Discord Bot Development](#discord-bot-development)
- [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20.x or later
- Python 3.11 (for orchestrator development)
- AWS CLI configured (for deployments)
- Git

### Local Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Project-Valine.git
   cd Project-Valine
   ```

2. **Install dependencies:**
   ```bash
   # Frontend
   npm install
   
   # Orchestrator (optional)
   cd orchestrator
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or modifications

### Commit Message Format

Follow the conventional commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(client): add user profile editing
fix(orchestrator): resolve Discord command timeout
docs(readme): update deployment instructions
```

## Project Structure

### Overview

```
Project-Valine/
├── src/                    # React client application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page-level components
│   ├── routes/            # Routing configuration
│   ├── services/          # API service clients
│   ├── context/           # React context providers
│   └── hooks/             # Custom React hooks
│
├── serverless/            # Backend API (Node.js)
│   ├── handler.js         # Main API handler
│   ├── serverless.yml     # Serverless Framework config
│   └── functions/         # Individual Lambda functions
│
├── orchestrator/          # Discord bot & automation (Python)
│   ├── app/              # Application code
│   │   ├── handlers/     # Discord & GitHub handlers
│   │   ├── agents/       # Bot agent implementations
│   │   ├── services/     # External service clients
│   │   └── utils/        # Utility functions
│   ├── tests/            # Unit and integration tests
│   ├── scripts/          # Automation scripts
│   └── template.yaml     # AWS SAM template
│
├── docs/                  # Documentation
│   ├── diagnostics/      # System reports
│   ├── troubleshooting/  # Problem resolution guides
│   └── archive/          # Historical docs
│
└── .github/
    ├── workflows/        # CI/CD workflows
    └── agents/           # AI agent configurations
```

### Key Directories

- **`/src`**: Frontend React application
- **`/serverless`**: Backend API endpoints
- **`/orchestrator`**: Discord bot and CI/CD automation
- **`/docs`**: All project documentation
- **`/scripts`**: Deployment and verification utilities
- **`/.github/workflows`**: GitHub Actions CI/CD pipelines

## Coding Standards

### JavaScript/React

- Use ES6+ syntax
- Follow Airbnb JavaScript Style Guide (with some modifications)
- Use functional components and hooks
- Keep components small and focused
- Use meaningful variable and function names

**Example:**
```javascript
// Good
const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return user ? <div>{user.name}</div> : <Spinner />;
};

// Avoid
function profile(id) {
  // Large component with multiple responsibilities
}
```

### Python (Orchestrator)

- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Keep functions focused and testable

**Example:**
```python
# Good
def calculate_deployment_status(run_id: str) -> dict:
    """Calculate deployment status for a workflow run.
    
    Args:
        run_id: GitHub Actions workflow run ID
        
    Returns:
        Dictionary containing status information
    """
    run = fetch_workflow_run(run_id)
    return {
        'status': run.status,
        'conclusion': run.conclusion,
        'url': run.html_url
    }
```

### General Guidelines

- **DRY (Don't Repeat Yourself)**: Extract reusable code into functions/components
- **KISS (Keep It Simple)**: Prefer simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until it's needed
- **Security**: Never commit credentials, API keys, or secrets
- **Performance**: Consider performance implications of your changes

## Testing Guidelines

### Frontend Testing

Currently, the frontend does not have a comprehensive test suite. When adding tests:

- Use React Testing Library for component tests
- Test user interactions, not implementation details
- Mock external API calls

### Orchestrator Testing

The orchestrator has a comprehensive test suite using pytest.

**Run tests:**
```bash
cd orchestrator
python -m pytest tests/
```

**Writing tests:**
```python
def test_discord_command_parsing():
    """Test that Discord commands are parsed correctly."""
    command = parse_discord_command("/triage pr:123")
    assert command.name == "triage"
    assert command.args["pr"] == "123"
```

**Test structure:**
- Place tests in `orchestrator/tests/`
- Name test files `test_*.py`
- Use descriptive test names
- Mock external services (Discord API, GitHub API)
- Test both success and failure cases

### Integration Testing

- Test Discord command flows end-to-end (when possible)
- Verify GitHub Actions workflows locally with `act`
- Test deployment scripts in isolated environments

## Pull Request Process

### Before Submitting

1. **Create an issue** describing the problem or feature
2. **Fork the repository** and create your branch
3. **Make your changes** following coding standards
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Commit with meaningful messages**

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for changes
- [ ] Documentation updated (README, inline comments)
- [ ] No merge conflicts with main branch
- [ ] All CI checks passing
- [ ] Security considerations addressed

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Fixes #123
```

### Review Process

1. Submit your PR with a clear description
2. Maintainers will review within 2-3 business days
3. Address any feedback or requested changes
4. Once approved, a maintainer will merge your PR

## Discord Bot Development

### Local Testing

The Discord bot requires AWS infrastructure, making local testing challenging. Use these approaches:

**1. Unit Tests:**
```bash
cd orchestrator
python -m pytest tests/
```

**2. Mock Discord Interactions:**
Use the test utilities in `orchestrator/tests/` to simulate Discord commands.

**3. Staging Environment:**
Deploy to a staging environment for integration testing:
```bash
cd orchestrator
sam build
sam deploy --config-env staging
```

### Adding New Discord Commands

1. **Define command in `orchestrator/app/agents/`**
2. **Register in Discord** using `orchestrator/scripts/register_staging_slash_commands.sh`
3. **Add handler** in `orchestrator/app/handlers/discord_handler.py`
4. **Write tests** in `orchestrator/tests/`
5. **Update documentation** in `orchestrator/DISCORD_SLASH_CMD_QUICK_REF.md`

### Command Best Practices

- Use descriptive command names
- Provide helpful descriptions
- Validate input parameters
- Handle errors gracefully
- Return user-friendly messages
- Include trace IDs for debugging

## Documentation

### Types of Documentation

1. **Code Comments**: Explain complex logic inline
2. **Docstrings**: Document functions, classes, and modules
3. **README files**: Overview and setup instructions
4. **Guides**: Step-by-step tutorials in `/docs`
5. **API Documentation**: Endpoint specifications

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep documentation up-to-date with code changes
- Link related documentation

### Where to Add Documentation

- **New features**: Add to relevant README or create new doc in `/docs`
- **API changes**: Update API documentation
- **Bug fixes**: Update troubleshooting guides if applicable
- **Configuration**: Update `.env.example` files

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create a GitHub Issue
- **Discord**: Join our Discord server for real-time help
- **Documentation**: Check [docs/](docs/) directory

## Recognition

Contributors will be recognized in:
- Project README (Contributors section)
- Release notes for significant contributions
- Discord community shoutouts

---

Thank you for contributing to Project Valine! Your efforts help make this platform better for the voice acting and creative community. 🎭🎙️
