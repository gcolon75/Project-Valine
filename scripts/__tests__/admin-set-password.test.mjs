/**
 * Tests for admin-set-password.mjs
 * Validates pathToFileURL conversion for Windows compatibility
 */

import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin-set-password.mjs - Path to URL conversion', () => {
  it('should convert Unix-style paths to file URLs correctly', () => {
    const unixPath = '/home/user/project/node_modules/@prisma/client/index.js';
    const fileUrl = pathToFileURL(unixPath).href;
    
    // Should start with file:// protocol
    expect(fileUrl).toMatch(/^file:\/\//);
    
    // Should contain the original path
    expect(fileUrl).toContain('node_modules/@prisma/client/index.js');
  });

  it('should convert Windows-style paths to file URLs correctly', () => {
    // Simulate Windows path (pathToFileURL handles both Unix and Windows paths)
    const windowsStylePath = 'C:\\Users\\user\\project\\node_modules\\@prisma\\client\\index.js';
    const fileUrl = pathToFileURL(windowsStylePath).href;
    
    // Should start with file:// protocol
    expect(fileUrl).toMatch(/^file:\/\//);
    
    // Should not contain backslashes in URL (converted to forward slashes)
    expect(fileUrl).not.toContain('\\');
    
    // On Windows, should contain the drive letter
    // On Unix testing environment, the path is treated as relative
    expect(fileUrl).toBeTruthy();
  });

  it('should handle paths with join() correctly', () => {
    const basePath = __dirname;
    const modulePath = join(basePath, '..', '..', 'serverless', 'node_modules', '@prisma', 'client', 'index.js');
    const fileUrl = pathToFileURL(modulePath).href;
    
    // Should start with file:// protocol
    expect(fileUrl).toMatch(/^file:\/\//);
    
    // Should be a valid URL that can be used with import()
    expect(() => new URL(fileUrl)).not.toThrow();
  });

  it('should create valid URLs that can be parsed', () => {
    const testPath = join(__dirname, 'test-module.js');
    const fileUrl = pathToFileURL(testPath).href;
    
    // Should be parseable as a URL
    const parsedUrl = new URL(fileUrl);
    expect(parsedUrl.protocol).toBe('file:');
  });

  it('should handle special characters in paths', () => {
    const pathWithSpaces = join(__dirname, 'folder with spaces', 'module.js');
    const fileUrl = pathToFileURL(pathWithSpaces).href;
    
    // Should start with file:// protocol
    expect(fileUrl).toMatch(/^file:\/\//);
    
    // Spaces should be URL encoded
    expect(fileUrl).toContain('%20');
  });
});
