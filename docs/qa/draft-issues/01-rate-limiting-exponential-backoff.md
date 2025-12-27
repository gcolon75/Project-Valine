# Enhancement: Rate Limiting & Exponential Backoff for REST Retrieval

**Labels:** `enhancement`, `analyzer`  
**Dependency:** After REST fallback implementation

## Context

The orchestration analysis tool currently supports REST API fallback mode (`--no-gh` flag) for artifact retrieval when GitHub CLI is unavailable. However, it lacks sophisticated retry logic and rate limiting protection when making API calls.

## Problem Statement

When the analyzer falls back to REST API mode:
- No exponential backoff on failed requests
- No rate limit detection or handling
- Could trigger secondary rate limits with rapid consecutive calls
- No configurable retry policies for transient failures

This can lead to:
- Failed analysis runs due to temporary API issues
- Potential throttling or blocking from GitHub API
- Unnecessary load on GitHub's infrastructure
- Poor user experience during network instability

## Rationale

Implementing intelligent retry logic and rate limiting will:
- **Improve reliability**: Handle transient network failures gracefully
- **Respect API limits**: Avoid hitting GitHub's rate limits
- **Better UX**: Provide clear feedback when rate limited
- **Production ready**: Make the tool suitable for CI/CD at scale

## Proposed Solution

Add exponential backoff retry logic to the REST API artifact retrieval:

```javascript
// Example retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504]
};
```

Key features:
1. Detect rate limit responses (HTTP 429, `X-RateLimit-Remaining: 0`)
2. Parse `Retry-After` header when present
3. Exponential backoff: 1s → 2s → 4s → 8s (capped at 30s)
4. Respect `X-RateLimit-Reset` timestamp
5. Log retry attempts with clear messaging
6. Fail gracefully after max retries with actionable error message

## Acceptance Criteria

- [ ] Implement exponential backoff utility function
- [ ] Add rate limit detection from response headers
- [ ] Respect `Retry-After` and `X-RateLimit-Reset` headers
- [ ] Configure max retries and backoff parameters
- [ ] Add structured logging for retry attempts
- [ ] Include unit tests for retry logic (mocked responses)
- [ ] Update documentation with retry behavior
- [ ] Add `--no-retry` flag to disable retries if needed
- [ ] Display remaining rate limit in debug mode
- [ ] Provide clear error messages when rate limited

## Example Usage

```powershell
# Automatic retry with exponential backoff
node scripts/analyze-orchestration-run.mjs 123456 --no-gh

# Disable retry for testing
node scripts/analyze-orchestration-run.mjs 123456 --no-gh --no-retry

# Debug mode shows rate limit info
node scripts/analyze-orchestration-run.mjs 123456 --no-gh --log-level debug
# Output: Rate limit: 58/60 remaining, resets at 2025-11-10T20:30:00Z
```

## Technical Notes

- Use `Octokit` or `@octokit/rest` for automatic retry handling
- Alternative: Custom retry wrapper with `p-retry` or `async-retry` library
- Consider circuit breaker pattern for repeated failures
- Cache rate limit state across multiple artifact downloads in same run

## References

- GitHub REST API Rate Limiting: https://docs.github.com/en/rest/overview/rate-limits
- Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
- Best practices: https://docs.github.com/en/rest/guides/best-practices-for-integrators

## Related Issues

- None (foundational enhancement)

## Priority

**P2** - Nice to have for production resilience, not blocking current functionality.
