# QA Checker Quick Start Guide

## 🚀 Quick Start (30 seconds)

```bash
# 1. Set your GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# 2. Run QA checker on two PRs
cd orchestrator
python run_qa_checker.py 27 28

# 3. Done! Review results in terminal
```

## 📋 Common Commands

### Validate PRs (dry run)
```bash
python run_qa_checker.py <pr1> <pr2>
```

### Post reviews to GitHub
```bash
python run_qa_checker.py <pr1> <pr2> --post-reviews
```

### Use custom repository
```bash
python run_qa_checker.py <pr1> <pr2> --repo owner/repo
```

### Get help
```bash
python run_qa_checker.py --help
```

## 🔧 Setup

### 1. Get GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate token with `repo` scope
3. Copy token

### 2. Set Environment Variable
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### 3. Verify Setup
```bash
python -m unittest tests.test_qa_checker -v
```

## 📖 What It Validates

### Phase 3 (PR1) - Deploy Client Polish
- ✅ Workflow inputs (correlation_id, requester, api_base)
- ✅ Run-name includes correlation_id
- ✅ Dispatcher implementation (trigger, find, poll)
- ✅ Discord handler wait flow (deferred, follow-ups)
- ✅ Guardrails (URL validation, timeouts, rate limits)
- ✅ Tests and documentation

### Phase 4 (PR2) - Multi-Agent Foundation
- ✅ Agent registry with 4 agents
- ✅ /agents command implementation
- ✅ /status-digest command with aggregation
- ✅ Guardrails (rate limits, safe output)
- ✅ Tests and documentation

## 📊 Example Output

```markdown
# QA: Phase 3 Polish — /deploy-client wait flow

**Status:** PASS

## Acceptance Checklist

- [✅] PR Exists — PR #27 found
- [✅] Workflow YAML Modified
- [✅] Correlation ID Input
- [✅] Dispatcher Implementation
- [✅] Wait Flow Implementation

## Final Verdict

✅ APPROVE — All acceptance criteria met.
```

## 🐛 Troubleshooting

### "GITHUB_TOKEN not set"
```bash
export GITHUB_TOKEN=ghp_your_token
```

### "Could not fetch PR"
- Check PR number is correct
- Verify token has `repo` scope
- Ensure repository name is correct

### "Rate limit exceeded"
- Wait 1 hour for reset
- Use GitHub App token (higher limits)

## 📚 More Information

- **Detailed Guide**: [QA_CHECKER_GUIDE.md](QA_CHECKER_GUIDE.md)
- **Implementation**: [QA_CHECKER_IMPLEMENTATION.md](QA_CHECKER_IMPLEMENTATION.md)
- **Examples**: [example_qa_usage.py](example_qa_usage.py)
- **Tests**: [tests/test_qa_checker.py](tests/test_qa_checker.py)

## 🎯 Use Cases

### Before Merging
```bash
# Validate before merging Phase 3/4 PRs
python run_qa_checker.py 27 28
```

### CI/CD Integration
```bash
# In GitHub Actions workflow
python run_qa_checker.py $PR1 $PR2 --post-reviews
```

### Manual Review
```bash
# Generate review but don't post
python run_qa_checker.py 27 28 > review.txt
```

## 💡 Pro Tips

1. **Run tests first**: `python -m unittest tests.test_qa_checker -v`
2. **Dry run first**: Validate without `--post-reviews`
3. **Check output**: Review generated markdown before posting
4. **Use env vars**: Set `GITHUB_REPO` to avoid `--repo` flag
5. **Keep token safe**: Never commit tokens to git

## ⚡ Advanced Usage

### Programmatic API
```python
from app.agents.qa_checker import QAChecker

checker = QAChecker("owner/repo", token)
result = checker.validate_pr1_deploy_client_polish(27)
print(result.status)  # PASS or FAIL
```

### Custom Validation
```python
result = PRValidationResult()
result.add_check("My Check", True, "Details")
review = checker.format_review_comment(result, "Title")
```

## 🔗 Quick Links

- GitHub Token: https://github.com/settings/tokens
- Documentation: [orchestrator/QA_CHECKER_GUIDE.md](QA_CHECKER_GUIDE.md)
- Tests: [orchestrator/tests/test_qa_checker.py](tests/test_qa_checker.py)
- Issues: https://github.com/gcolon75/Project-Valine/issues
