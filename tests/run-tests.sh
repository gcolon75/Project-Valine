#!/bin/bash

# Test runner script for Project Valine scripts
# Executes Node.js tests for orchestration analysis

set -e  # Exit on error

echo "🧪 Running Project Valine Script Tests..."
echo ""

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Display Node version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"
echo ""

# Run orchestration analyzer tests
echo "📊 Running orchestration analyzer tests..."
npm test -- scripts/__tests__/analyze-orchestration-run.test.mjs

echo ""
echo "✅ All script tests passed!"
exit 0
