# Enhancement: Streaming Artifact Extraction to Reduce Peak Memory

**Labels:** `enhancement`, `analyzer`, `performance`  
**Dependency:** None

## Context

The orchestration analysis tool currently downloads entire artifact ZIP files to memory or disk before extraction. For large artifact collections (e.g., multiple accessibility reports, Playwright traces, screenshots), this can consume significant memory and slow down the analysis phase.

## Problem Statement

Current artifact handling:
- Downloads complete ZIP to temp directory
- Extracts all files at once
- Holds uncompressed data in memory during parsing
- Peak memory can reach 200MB+ for comprehensive test runs
- Slow startup time for large artifact collections

Issues:
- Memory spikes on resource-constrained CI runners
- Unnecessary disk I/O for intermediate ZIP storage
- Slow analysis start for large workflow runs
- Potential OOM errors on constrained environments

## Rationale

Streaming extraction provides:
- **Lower memory footprint**: Process artifacts incrementally
- **Faster startup**: Begin analysis while download continues
- **Better scalability**: Handle larger artifact sets without memory issues
- **Resource efficiency**: Reduce temporary disk usage

## Proposed Solution

Implement streaming ZIP extraction using Node.js streams:

```javascript
import { pipeline } from 'stream/promises';
import unzipper from 'unzipper';

async function streamExtractArtifact(downloadStream, outputDir) {
  return pipeline(
    downloadStream,
    unzipper.Parse(),
    async function* (source) {
      for await (const entry of source) {
        const fileName = entry.path;
        
        // Skip unwanted files
        if (shouldSkip(fileName)) {
          entry.autodrain();
          continue;
        }
        
        // Process relevant files on-the-fly
        if (fileName.endsWith('.json')) {
          const content = await streamToString(entry);
          yield { fileName, content, type: 'json' };
        } else if (fileName.endsWith('.html')) {
          // Parse incrementally or save to disk
          yield { fileName, stream: entry, type: 'html' };
        }
      }
    }
  );
}
```

Key features:
1. Stream download directly from GitHub API
2. Extract and parse files on-the-fly
3. Skip irrelevant files without full extraction
4. Process JSON files in memory streaming fashion
5. Write large HTML/image files directly to disk
6. Track extraction progress with events

## Acceptance Criteria

- [ ] Implement streaming download + extraction pipeline
- [ ] Add progress tracking (bytes downloaded/extracted)
- [ ] Skip irrelevant files during extraction (e.g., node_modules in artifacts)
- [ ] Parse JSON files incrementally using streaming JSON parser
- [ ] Write large files (>10MB) directly to disk without memory buffering
- [ ] Maintain existing security limits (max size, file count)
- [ ] Add memory usage monitoring/logging
- [ ] Include benchmark comparing memory usage (before/after)
- [ ] Update documentation with performance characteristics
- [ ] Ensure error handling for corrupted ZIPs
- [ ] Add unit tests with mocked ZIP streams

## Performance Goals

| Metric | Current | Target |
|--------|---------|--------|
| Peak memory (small run) | 80MB | 40MB |
| Peak memory (large run) | 250MB | 100MB |
| Time to first analysis | 15s | 5s |
| Disk I/O operations | 100+ | 20-30 |

## Example Usage

```bash
# Enable streaming mode (default)
node scripts/analyze-orchestration-run.mjs 123456

# Monitor memory usage
node --trace-gc scripts/analyze-orchestration-run.mjs 123456 --log-level debug

# Output includes memory stats
# Memory: peak 45MB, current 32MB (streaming mode)
```

## Technical Notes

### Libraries to Consider

- **unzipper** (npm): Streaming ZIP extraction, well-maintained
- **yauzl** (npm): Fast, streaming, low-level ZIP reader
- **stream-json** (npm): Streaming JSON parser for large files

### Implementation Strategy

1. Phase 1: Stream download only (still extract to disk)
2. Phase 2: Stream extraction with selective file processing
3. Phase 3: Streaming JSON parsing for large accessibility reports
4. Phase 4: Add memory profiling and optimization

### Edge Cases

- Handle multi-part ZIP files (rare but possible)
- Corrupted ZIP handling (abort early, clear messaging)
- Network interruption during streaming (retry logic)
- Symlinks in ZIP files (security risk, skip or validate)

## Security Considerations

- Maintain existing ZIP bomb protection (max uncompressed size)
- Validate file paths to prevent directory traversal
- Limit concurrent stream processing (avoid resource exhaustion)
- Add checksums verification if GitHub provides them

## References

- Node.js Streams: https://nodejs.org/api/stream.html
- unzipper: https://github.com/ZJONSSON/node-unzipper
- stream-json: https://github.com/uhop/stream-json
- ZIP format: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

## Related Issues

- Enhancement #7: Performance profiling (can measure impact)

## Priority

**P2** - Performance optimization, significant impact for large repos but not blocking.
