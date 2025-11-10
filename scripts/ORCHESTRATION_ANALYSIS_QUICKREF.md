# Orchestration Analysis Quick Reference

## Common Commands

### Basic Analysis
```bash
node scripts/analyze-orchestration-run.mjs <run-id>
```

### Production CI/CD
```bash
node scripts/analyze-orchestration-run.mjs <run-id> \
  --json \
  --summary ./exec-summary.md \
  --fail-on P0
```

### Debug Mode
```bash
node scripts/analyze-orchestration-run.mjs <run-id> \
  --log-level debug \
  --out-dir ./debug-reports
```

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | PROCEED | Deploy safely |
| 1 | CAUTION | Review required |
| 2 | BLOCK | Fix critical issues |

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--out-dir <path>` | `analysis-output` | Output directory |
| `--json` | off | Emit summary.json |
| `--summary <path>` | off | Executive summary |
| `--fail-on <level>` | `P0` | Exit policy |
| `--log-level <level>` | `info` | Verbosity |
| `--no-gh` | off | REST API (stub) |

## Fail-On Levels

- `P0` - Exit 2 only on critical issues (default)
- `P1` - Exit 1 on any P1+ issues
- `P2` - Exit 1 on any P2+ issues
- `none` - Always exit 0

## Output Files

Default location: `analysis-output/`

- `CONSOLIDATED_ANALYSIS_REPORT.md` - Full report
- `summary.json` - Machine-readable (if `--json`)
- `draft-pr-payloads.json` - Fix suggestions
- `draft-github-issues.json` - Issue drafts
- Custom path (if `--summary <path>`)

## Log Levels

- `info` - Standard output with timestamps
- `debug` - Verbose with gating reasoning

## Security

✅ Blocks path traversal (`../`)
✅ Blocks absolute paths (`/etc/passwd`)
✅ Limits: 250MB, 10K files

## CI/CD Integration

```yaml
- name: Analyze
  run: |
    node scripts/analyze-orchestration-run.mjs ${{ github.run_id }} \
      --json --fail-on P0
  
- name: Check exit code
  if: failure()
  run: echo "Analysis blocked deployment"
```

## Help

```bash
node scripts/analyze-orchestration-run.mjs --help
```

For detailed documentation, see `ORCHESTRATION_ANALYSIS_CLI_GUIDE.md`
