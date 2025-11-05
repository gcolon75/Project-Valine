name: UX Deep Audit

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

env:
  # Set to 0 to fail on any High severity finding, or another integer threshold
  UX_AUDIT_MAX_HIGH: 999

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run UX Deep Audit
        # Your repo already includes scripts/ux-audit-agent.mjs and npm script "ux:audit"
        run: npm run ux:audit

      - name: Upload Audit Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ux-audit-artifacts
          path: |
            UX_AUDIT_REPORT.md
            UX_AUDIT_FINDINGS.csv
            UX_AUDIT_SUMMARY.json

      - name: Read audit summary
        id: read_summary
        shell: bash
        run: |
          if [ -f UX_AUDIT_SUMMARY.json ]; then
            echo "summary=$(cat UX_AUDIT_SUMMARY.json | tr -d '\n' | sed 's/"/\\"/g')" >> $GITHUB_OUTPUT
          else
            echo "summary={\"metadata\":{},\"summary\":{\"high\":0,\"medium\":0,\"low\":0}}" >> $GITHUB_OUTPUT
          fi

      - name: Comment PR with audit summary
        uses: actions/github-script@v7
        with:
          script: |
            const summary = JSON.parse(core.getInput('summary'));
            const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            const high = summary?.summary?.high ?? 0;
            const medium = summary?.summary?.medium ?? 0;
            const low = summary?.summary?.low ?? 0;
            const pagesAnalyzed = summary?.metadata?.pagesAnalyzed ?? 'N/A';
            const componentsAnalyzed = summary?.metadata?.componentsAnalyzed ?? 'N/A';

            const body = [
              '## UX Deep Audit Results',
              '',
              `- Pages analyzed: ${pagesAnalyzed}`,
              `- Components analyzed: ${componentsAnalyzed}`,
              `- Findings: 🔴 High ${high} · 🟠 Medium ${medium} · 🟢 Low ${low}`,
              '',
              `Artifacts (report, CSV, JSON): See this workflow run → [View artifacts](${runUrl})`,
              '',
              '> Tip: Adjust failure threshold via `UX_AUDIT_MAX_HIGH` env in workflow.'
            ].join('\n');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body
            });

          result-encoding: string
        env:
          summary: ${{ steps.read_summary.outputs.summary }}

      - name: Enforce High severity threshold
        shell: bash
        run: |
          HIGH=$(jq -r '.summary.high // 0' UX_AUDIT_SUMMARY.json 2>/dev/null || echo 0)
          echo "High findings: $HIGH; Threshold: ${UX_AUDIT_MAX_HIGH}"
          if [ "$HIGH" -gt "${UX_AUDIT_MAX_HIGH}" ]; then
            echo "::error::UX audit high severity findings ($HIGH) exceed threshold (${UX_AUDIT_MAX_HIGH})."
            exit 1
          fi
