# Moderation Rules Configuration

## Profanity List

### Default List
The system includes a small default profanity list. This list is intentionally conservative to minimize false positives.

**Current default words** (see `serverless/src/utils/moderation.js`):
- Common profanity in English
- Slurs and offensive terms
- Adult content references

### Customizing the Profanity List

#### Option 1: Override with Custom File
Create a custom profanity list file:

```powershell
# Create custom list
Get-Content > /path/to/custom-profanity.txt << EOF
badword1
badword2
badword3
EOF

# Configure environment
PROFANITY_LIST_PATH=/path/to/custom-profanity.txt
```

**File format:**
- One word per line
- Case-insensitive (will be normalized)
- Comments not supported
- Empty lines ignored

#### Option 2: Extend Default List
To add words without replacing the entire list, modify the source file:
`serverless/src/utils/moderation.js` → `DEFAULT_PROFANITY_LIST` array

### Word Matching Behavior

#### Word Boundaries
The system uses word boundary matching to avoid false positives:
- ✅ Detects: "This is shit"
- ❌ Does NOT detect: "I need an assistant" (contains "ass")

#### Normalization
Text is normalized before matching:
- Lowercase conversion
- Diacritic removal (é → e, ñ → n)
- Whitespace trimming

**Examples:**
- "SHIT" → Matches "shit"
- "shït" → Matches "shit" (after diacritic removal)
- "  Damn  " → Matches "damn"

### Fine-Tuning for Your Community

#### Too Many False Positives
1. Review blocked content in moderation reports
2. Remove overly broad words from custom list
3. Consider using `PROFANITY_ACTION=warn` instead of `block`

#### Not Catching Enough
1. Add community-specific slang to custom list
2. Review reports for patterns
3. Consider external moderation API for advanced detection (future phase)

## URL Safety Rules

### Allowed Protocols
Default: `http:https:mailto:`

**Configuration:**
```powershell
URL_ALLOWED_PROTOCOLS=http:https:mailto:
```

**Blocked Automatically:**
- `javascript:` - XSS risk
- `data:` - Content injection
- `file:` - Local file access
- `vbscript:` - Script injection

### Domain Configuration

#### Allowed Domains (Strict Mode)
When `MODERATION_STRICT_MODE=true`, only allowlisted domains are permitted.

**Default allowlist:**
```powershell
URL_ALLOWED_DOMAINS=imdb.com,youtube.com,vimeo.com,linkedin.com,github.com
```

**Adding domains:**
```powershell
URL_ALLOWED_DOMAINS=imdb.com,youtube.com,vimeo.com,linkedin.com,github.com,mysite.com,anothersite.net
```

**Subdomain handling:**
- `imdb.com` → Allows `imdb.com`, `www.imdb.com`, `m.imdb.com`
- Does NOT allow `fakeimdb.com`

#### Blocked Domains
Always blocked regardless of mode:

```powershell
URL_BLOCKED_DOMAINS=malware.com,phishing.test,scam.xyz
```

**Use cases:**
- Known phishing sites
- Malware distribution domains
- Spam link farms
- Sites with inappropriate content

#### Suspicious TLDs
These top-level domains trigger warnings (still allowed by default, blocked in strict mode):
- `.xyz`, `.top`, `.click`
- `.loan`, `.work`
- Free TLDs: `.gq`, `.ml`, `.ga`, `.cf`, `.tk`

**Rationale:** These TLDs are commonly used for spam and phishing due to low/no cost.

### Strict Mode vs. Permissive Mode

| Mode | Behavior |
|------|----------|
| **Permissive** (default) | Block dangerous protocols and blocklisted domains only |
| **Strict** | Only allow allowlisted domains for http/https URLs |

**When to use strict mode:**
- High-risk environments
- Communities with frequent spam
- During incident response

**Enabling strict mode:**
```powershell
MODERATION_STRICT_MODE=true
```

### Examples

#### Example 1: Social Media Platform
Allow common social and portfolio sites:
```powershell
URL_ALLOWED_DOMAINS=imdb.com,youtube.com,vimeo.com,linkedin.com,github.com,twitter.com,facebook.com,instagram.com,tiktok.com,threads.net
MODERATION_STRICT_MODE=false  # Allow other domains too
```

#### Example 2: Corporate Network
Strict allowlist only:
```powershell
URL_ALLOWED_DOMAINS=company.com,partner1.com,partner2.com
MODERATION_STRICT_MODE=true  # Block everything else
```

#### Example 3: Adding to Blocklist
Block known spam domains:
```powershell
URL_BLOCKED_DOMAINS=spam.com,phishing.test,malware.xyz,scam123.click
```

## Report Categories

### Allowed Categories
Default: `spam,abuse,unsafe_link,profanity,privacy,other`

**Configuration:**
```powershell
REPORT_CATEGORY_ALLOWLIST=spam,abuse,unsafe_link,profanity,privacy,other
```

### Category Definitions

| Category | Severity | Description | Examples |
|----------|----------|-------------|----------|
| `spam` | Low (1) | Unwanted promotional content | Repeated self-promotion, link farms |
| `abuse` | High (3) | Harmful or threatening content | Harassment, threats, bullying |
| `unsafe_link` | Medium (2) | Malicious or inappropriate URLs | Phishing, malware, adult content |
| `profanity` | Low (1) | Offensive language | Swearing, slurs |
| `privacy` | Medium (2) | Privacy violations | Doxxing, sharing private info |
| `other` | Info (0) | Doesn't fit other categories | Misc concerns |

### Adding Custom Categories

1. Update environment:
   ```powershell
   REPORT_CATEGORY_ALLOWLIST=spam,abuse,unsafe_link,profanity,privacy,copyright,impersonation,other
   ```

2. Update severity mapping in `serverless/src/utils/moderation.js`:
   ```javascript
   export function getSeverityFromCategory(category) {
     const severityMap = {
       spam: 1,
       abuse: 3,
       unsafe_link: 2,
       profanity: 1,
       privacy: 2,
       copyright: 2,        // Add new category
       impersonation: 2,   // Add new category
       other: 0,
     };
     return severityMap[category] || 0;
   }
   ```

## Profanity Action Modes

### Block Mode (Default)
Returns 422 error when profanity is detected:

```powershell
PROFANITY_ACTION=block
```

**Behavior:**
- Content is NOT saved
- User sees detailed error with field-level feedback
- Auto-generates moderation report for tracking

**User experience:**
```json
{
  "code": "MODERATION_BLOCKED",
  "message": "Content blocked by moderation rules",
  "fields": [
    {
      "name": "headline",
      "reason": "Contains profane language: shit"
    }
  ]
}
```

### Warn Mode
Allows content but creates low-severity report:

```powershell
PROFANITY_ACTION=warn
```

**Behavior:**
- Content IS saved
- Moderation report created with severity=1
- Response includes `moderationWarnings` array (future enhancement)

**When to use:**
- Testing moderation rules
- Communities with relaxed content policies
- Gradual rollout of moderation

## Rate Limiting Configuration

### Report Rate Limits
Prevent report spam:

```powershell
REPORTS_MAX_PER_HOUR=5      # Per authenticated user
REPORTS_MAX_PER_DAY=20      # Per authenticated user
REPORTS_IP_MAX_PER_HOUR=10  # Per IP address
```

### Tuning Recommendations

| Community Size | Recommended Limits |
|----------------|-------------------|
| Small (<1K users) | 5/hour, 20/day |
| Medium (1K-10K) | 10/hour, 50/day |
| Large (>10K) | 15/hour, 100/day |

**Considerations:**
- Higher limits for communities with active moderation teams
- Lower limits if experiencing report abuse
- Monitor rate limit violations in logs

## Testing and Validation

### Testing Profanity Detection
```powershell
# Should be blocked
Invoke-RestMethod -Uri "http://localhost:5000/profiles/user_123" -Method Put -Body '{"headline": "Damn good actor"}' -ContentType 'application/json'
```

### Testing URL Validation
```powershell
# Should be blocked
Invoke-RestMethod -Uri "http://localhost:5000/profiles/user_123" -Method Put -Body '{"socialLinks": {"website": "javascript:alert()"}}' -ContentType 'application/json'
```

### Checking Current Configuration
```powershell
Invoke-RestMethod -Uri "/moderation/health" -Method Get
```

Response shows active rules:
```json
{
  "enabled": true,
  "strictMode": false,
  "profanityAction": "block",
  "rules": {
    "allowedCategories": ["spam", "abuse", "..."],
    "allowedProtocols": ["http:", "https:", "mailto:"],
    "allowedDomainCount": 5,
    "blockedDomainCount": 2
  }
}
```

## Best Practices

1. **Start Conservative**: Use default lists and block mode
2. **Monitor Reports**: Review auto-generated reports weekly
3. **Tune Gradually**: Add words/domains based on real incidents
4. **Document Changes**: Keep changelog of rule updates
5. **Test in Staging**: Validate rule changes before production
6. **Communicate**: Inform users about content policies
7. **Review Regularly**: Quarterly audit of blocked content

## Rollback Plan

If rules are too strict:
1. Switch to warn mode: `PROFANITY_ACTION=warn`
2. Disable strict mode: `MODERATION_STRICT_MODE=false`
3. Temporarily disable: `MODERATION_ENABLED=false`
4. Reduce profanity list
5. Expand allowed domains
