# Enhancement: PR Comment Templating & Localization Support

**Labels:** `enhancement`, `analyzer`, `i18n`  
**Dependency:** None

## Context

The orchestration analysis tool posts PR comments with analysis results, but currently:
- Uses hardcoded English text
- Has a fixed comment format
- No support for different audiences (developers vs. management)
- Limited customization options
- No branding or team-specific messaging

## Problem Statement

Current limitations:
- All output is in English only
- Cannot customize comment format for different teams
- No template system for reusable formats
- Difficult to maintain consistent messaging
- No support for accessibility-friendly formatting
- Cannot generate different views (detailed vs. summary)

This leads to:
- Poor experience for non-English teams
- Inconsistent comment formats across projects
- Difficulty customizing for different workflows
- Maintenance burden when changing comment format
- Cannot tailor output to different stakeholders

## Rationale

Templating and localization enable:
- **Global teams**: Support multiple languages
- **Customization**: Tailor output to team needs
- **Maintainability**: Centralized template management
- **Flexibility**: Different formats for different contexts
- **Accessibility**: Screen-reader friendly formatting

## Proposed Solution

Implement a template system with i18n support:

```javascript
// Template system
import Handlebars from 'handlebars';
import i18n from 'i18n';

// Configure i18n
i18n.configure({
  locales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'),
  updateFiles: false
});

// Register custom helpers
Handlebars.registerHelper('severity', function(level) {
  const icons = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '⚪' };
  return icons[level] || '';
});

Handlebars.registerHelper('pluralize', function(count, singular, plural) {
  return count === 1 ? singular : plural;
});

// Load templates
const templates = {
  'pr-comment-full': Handlebars.compile(
    fs.readFileSync('templates/pr-comment-full.hbs', 'utf8')
  ),
  'pr-comment-summary': Handlebars.compile(
    fs.readFileSync('templates/pr-comment-summary.hbs', 'utf8')
  ),
  'slack-notification': Handlebars.compile(
    fs.readFileSync('templates/slack-notification.hbs', 'utf8')
  )
};

// Render template
function renderPRComment(data, locale = 'en', template = 'pr-comment-full') {
  i18n.setLocale(locale);
  const compiled = templates[template];
  return compiled({
    ...data,
    __: i18n.__ // Translation function
  });
}
```

### Example Template (templates/pr-comment-full.hbs)

```handlebars
## {{__ "analysis.title"}}

{{#if gating.block}}
🚫 **{{__ "gating.blocked"}}** - {{__ "gating.block_reason" count=summary.p0_count}}
{{else if gating.caution}}
⚠️ **{{__ "gating.caution"}}** - {{__ "gating.caution_reason" count=summary.p1_count}}
{{else}}
✅ **{{__ "gating.proceed"}}** - {{__ "gating.proceed_reason"}}
{{/if}}

---

### {{__ "summary.title"}}

| {{__ "summary.metric"}} | {{__ "summary.value"}} |
|---------|--------|
| {{__ "summary.total_issues"}} | **{{summary.total_issues}}** |
| {{severity "P0"}} {{__ "severity.critical"}} | {{summary.p0_count}} |
| {{severity "P1"}} {{__ "severity.serious"}} | {{summary.p1_count}} |
| {{severity "P2"}} {{__ "severity.moderate"}} | {{summary.p2_count}} |
| {{severity "P3"}} {{__ "severity.minor"}} | {{summary.p3_count}} |

---

### {{__ "issues.top_issues"}}

{{#each topIssues}}
{{@index}}. {{severity ../severity}} **{{title}}**
   - {{__ "issues.category"}}: {{category}}
   - {{__ "issues.occurrences"}}: {{count}} {{pluralize count (__ "issues.time") (__ "issues.times")}}
   {{#if suggestion}}
   - 💡 {{__ "issues.suggestion"}}: {{suggestion}}
   {{/if}}

{{/each}}

---

<details>
<summary>{{__ "details.expand"}}</summary>

### {{__ "details.accessibility_title"}}

{{#if a11y.violations}}
{{__ "details.violations_found" count=a11y.violations.length}}

{{#each a11y.violations}}
- **{{this.impact}}**: {{this.description}}
  - {{__ "details.selector"}}: `{{this.selector}}`
  - {{__ "details.help"}}: [{{__ "details.learn_more"}}]({{this.helpUrl}})
{{/each}}
{{else}}
✅ {{__ "details.no_violations"}}
{{/if}}

</details>

---

{{__ "footer.generated_by"}} [{{__ "footer.tool_name"}}]({{footer.tool_url}})  
{{__ "footer.run_id"}}: [{{runId}}]({{footer.run_url}})  
{{__ "footer.timestamp"}}: {{footer.timestamp}}
```

### Translation File (locales/en.json)

```json
{
  "analysis": {
    "title": "🤖 Orchestration Analysis Report"
  },
  "gating": {
    "blocked": "BLOCK MERGE",
    "block_reason": "{{count}} critical issue(s) detected",
    "caution": "CAUTION RECOMMENDED",
    "caution_reason": "{{count}} serious issue(s) detected",
    "proceed": "PROCEED",
    "proceed_reason": "No critical issues detected"
  },
  "summary": {
    "title": "Summary",
    "metric": "Metric",
    "value": "Value",
    "total_issues": "Total Issues",
    "critical": "Critical (P0)",
    "serious": "Serious (P1)",
    "moderate": "Moderate (P2)",
    "minor": "Minor (P3)"
  },
  "issues": {
    "top_issues": "Top Issues",
    "category": "Category",
    "occurrences": "Occurrences",
    "time": "time",
    "times": "times",
    "suggestion": "Suggestion"
  },
  "details": {
    "expand": "📋 View Full Details",
    "accessibility_title": "Accessibility Violations",
    "violations_found": "{{count}} violation(s) found",
    "selector": "Selector",
    "help": "Help",
    "learn_more": "Learn more",
    "no_violations": "No accessibility violations detected!"
  },
  "footer": {
    "generated_by": "Generated by",
    "tool_name": "Orchestration Analyzer",
    "run_id": "Run ID",
    "timestamp": "Timestamp"
  }
}
```

### Translation File (locales/es.json)

```json
{
  "analysis": {
    "title": "🤖 Informe de Análisis de Orquestación"
  },
  "gating": {
    "blocked": "BLOQUEAR FUSIÓN",
    "block_reason": "{{count}} problema(s) crítico(s) detectado(s)",
    "caution": "PRECAUCIÓN RECOMENDADA",
    "caution_reason": "{{count}} problema(s) serio(s) detectado(s)",
    "proceed": "PROCEDER",
    "proceed_reason": "No se detectaron problemas críticos"
  },
  "summary": {
    "title": "Resumen",
    "metric": "Métrica",
    "value": "Valor",
    "total_issues": "Problemas Totales"
  }
  // ... more translations
}
```

## Acceptance Criteria

- [ ] Implement template engine (Handlebars or similar)
- [ ] Add i18n support with multiple locales
- [ ] Create default templates:
  - [ ] PR comment (full)
  - [ ] PR comment (summary)
  - [ ] Slack notification
  - [ ] Email notification
  - [ ] Plain text (for logs)
- [ ] Support custom templates via config file
- [ ] Add template validation on load
- [ ] Include 5+ language translations (en, es, fr, de, ja)
- [ ] Register custom Handlebars helpers (severity icons, pluralization)
- [ ] Support template inheritance/composition
- [ ] Add `--template` CLI flag to select template
- [ ] Add `--locale` CLI flag to select language
- [ ] Document template syntax and available variables
- [ ] Include template examples for common scenarios
- [ ] Add unit tests for template rendering
- [ ] Ensure accessibility compliance (screen reader friendly)

## Example Usage

```bash
# Use default template (English)
node scripts/analyze-orchestration-run.mjs 123456

# Use Spanish locale
node scripts/analyze-orchestration-run.mjs 123456 --locale es

# Use summary template
node scripts/analyze-orchestration-run.mjs 123456 --template pr-comment-summary

# Use custom template
node scripts/analyze-orchestration-run.mjs 123456 \
  --template ./my-templates/custom.hbs \
  --locale fr

# Generate multiple formats
node scripts/analyze-orchestration-run.mjs 123456 \
  --template pr-comment-full \
  --template slack-notification \
  --out-dir ./reports
```

## Template Variables Available

```javascript
{
  // Summary data
  summary: {
    total_issues: number,
    p0_count: number,
    p1_count: number,
    p2_count: number,
    p3_count: number
  },
  
  // Gating decision
  gating: {
    decision: 'proceed' | 'caution' | 'block',
    block: boolean,
    caution: boolean
  },
  
  // Top issues list
  topIssues: [
    {
      severity: 'P0' | 'P1' | 'P2' | 'P3',
      title: string,
      category: string,
      count: number,
      suggestion?: string
    }
  ],
  
  // Accessibility results
  a11y: {
    violations: [
      {
        impact: 'critical' | 'serious' | 'moderate' | 'minor',
        description: string,
        selector: string,
        helpUrl: string
      }
    ]
  },
  
  // Playwright results
  playwright: {
    total_tests: number,
    passed: number,
    failed: number,
    flaky: number
  },
  
  // Metadata
  runId: string,
  commitSha: string,
  branch: string,
  footer: {
    tool_url: string,
    run_url: string,
    timestamp: string
  }
}
```

## Custom Handlebars Helpers

```javascript
// Severity icon
Handlebars.registerHelper('severity', (level) => {
  const icons = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '⚪' };
  return icons[level] || '';
});

// Pluralization
Handlebars.registerHelper('pluralize', (count, singular, plural) => {
  return count === 1 ? singular : plural;
});

// Relative time
Handlebars.registerHelper('timeAgo', (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  return `${Math.floor(seconds / 3600)} hours ago`;
});

// Truncate text
Handlebars.registerHelper('truncate', (text, length) => {
  return text.length > length ? text.slice(0, length) + '...' : text;
});

// Format number
Handlebars.registerHelper('number', (num) => {
  return num.toLocaleString();
});
```

## Configuration Example

```json
// .orchestrator-config.json
{
  "templates": {
    "default": "pr-comment-full",
    "locale": "en",
    "custom_templates": {
      "pr-comment-executive": "./templates/executive-summary.hbs",
      "pr-comment-technical": "./templates/technical-details.hbs"
    }
  },
  "i18n": {
    "supported_locales": ["en", "es", "fr", "de", "ja", "zh"],
    "fallback_locale": "en"
  }
}
```

## Accessibility Considerations

- Use semantic HTML in templates (headings, lists, tables)
- Include ARIA labels where appropriate
- Ensure sufficient color contrast for status indicators
- Provide text alternatives for emoji/icons
- Test with screen readers (NVDA, JAWS, VoiceOver)

## Technical Notes

### Template Engine Options

- **Handlebars**: Popular, logic-less, good i18n support
- **Mustache**: Simpler, more restrictive
- **Nunjucks**: More powerful, Python Jinja2-like
- **EJS**: Embedded JavaScript, flexible

### I18n Libraries

- **i18n**: Simple, JSON-based translations
- **i18next**: Feature-rich, widely adopted
- **node-polyglot**: Airbnb's i18n library

## Testing Templates

```javascript
// tests/templates.test.mjs
describe('Template Rendering', () => {
  it('renders full PR comment in English', () => {
    const output = renderPRComment(sampleData, 'en', 'pr-comment-full');
    expect(output).toContain('Orchestration Analysis Report');
    expect(output).toContain('Summary');
  });
  
  it('renders summary in Spanish', () => {
    const output = renderPRComment(sampleData, 'es', 'pr-comment-summary');
    expect(output).toContain('Resumen');
  });
  
  it('handles custom templates', () => {
    const customTemplate = '{{summary.total_issues}} issues found';
    const output = Handlebars.compile(customTemplate)(sampleData);
    expect(output).toBe('5 issues found');
  });
});
```

## References

- Handlebars: https://handlebarsjs.com/
- i18n: https://github.com/mashpie/i18n-node
- i18next: https://www.i18next.com/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/

## Related Issues

- Enhancement #3: Externalized config (template paths in config)
- Enhancement #6: Secret redaction (redact in templates)

## Priority

**P3** - Nice to have for international teams and customization, not blocking core functionality.
