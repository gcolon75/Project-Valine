/**
 * Test harness for CloudFront Function spaRewrite.js
 * 
 * Usage: node infra/cloudfront/functions/spaRewrite.test.mjs
 */

// Create a simple inline handler for testing
// (CloudFront Functions don't use module.exports, so we inline it)
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Skip API requests
  if (uri.startsWith('/api/')) {
    return request;
  }
  
  // Get the last segment of the path
  var segments = uri.split('/');
  var lastSegment = segments[segments.length - 1];
  
  // Check if the last segment has a file extension (contains a dot)
  var hasExtension = lastSegment.indexOf('.') !== -1;
  
  // If no extension, rewrite to index.html for SPA routing
  if (!hasExtension) {
    request.uri = '/index.html';
  }
  
  return request;
}

// Test cases
const testCases = [
  // Extension-less paths should rewrite to /index.html
  { uri: '/', expected: '/index.html', description: 'Root path' },
  { uri: '/about', expected: '/index.html', description: 'Extension-less route' },
  { uri: '/users/123', expected: '/index.html', description: 'Nested extension-less route' },
  { uri: '/profile/edit', expected: '/index.html', description: 'Deep extension-less route' },
  
  // Paths with extensions should pass through
  { uri: '/assets/index-yrgN6q4Q.js', expected: '/assets/index-yrgN6q4Q.js', description: 'JS bundle' },
  { uri: '/assets/index-Bl2CTW-N.css', expected: '/assets/index-Bl2CTW-N.css', description: 'CSS file' },
  { uri: '/theme-init.js', expected: '/theme-init.js', description: 'Root-level JS file' },
  { uri: '/manifest.json', expected: '/manifest.json', description: 'JSON file' },
  { uri: '/favicon-32x32.png', expected: '/favicon-32x32.png', description: 'PNG file' },
  { uri: '/index.html', expected: '/index.html', description: 'HTML file' },
  
  // API paths should pass through
  { uri: '/api/posts', expected: '/api/posts', description: 'API route without extension' },
  { uri: '/api/users/123', expected: '/api/users/123', description: 'Nested API route' },
  { uri: '/api/data.json', expected: '/api/data.json', description: 'API route with extension' },
];

// Run tests
console.log('Running CloudFront Function Tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const event = {
    request: {
      uri: testCase.uri
    }
  };
  
  const result = handler(event);
  const actualUri = result.uri;
  
  if (actualUri === testCase.expected) {
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
    console.log(`  ${testCase.uri} → ${actualUri}`);
    passed++;
  } else {
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  ${testCase.uri}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${actualUri}`);
    failed++;
  }
  console.log('');
});

// Summary
console.log('='.repeat(50));
console.log(`Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
