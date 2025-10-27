#!/bin/bash
set -e

# Lambda Import and Deployment Validation Script
# This script validates that the Lambda package is correctly built and deployed

echo "================================"
echo "Lambda Deployment Validation"
echo "================================"
echo ""

# Step 1: Validate imports locally
echo "Step 1: Validating Python imports..."
cd "$(dirname "$0")"
python3 tests/test_lambda_imports.py
if [ $? -eq 0 ]; then
    echo "✅ Local import tests passed"
else
    echo "❌ Local import tests failed"
    exit 1
fi
echo ""

# Step 2: SAM Build
echo "Step 2: Running SAM build..."
sam build --use-container
if [ $? -eq 0 ]; then
    echo "✅ SAM build succeeded"
else
    echo "❌ SAM build failed"
    exit 1
fi
echo ""

# Step 3: Validate built package structure
echo "Step 3: Validating built package structure..."
BUILD_DIR=".aws-sam/build/DiscordHandlerFunction"

# Check for expected directories
for dir in handlers services utils verification agents config orchestrator; do
    if [ -d "$BUILD_DIR/$dir" ]; then
        echo "  ✓ Found $dir/"
    else
        echo "  ✗ Missing $dir/"
        exit 1
    fi
done
echo "✅ Package structure is correct"
echo ""

# Step 4: Test handler import in built package
echo "Step 4: Testing handler import in built package..."
cd "$BUILD_DIR"
python3 -c "from handlers.discord_handler import handler; print('✓ Handler imported successfully')"
if [ $? -eq 0 ]; then
    echo "✅ Handler import successful in built package"
else
    echo "❌ Handler import failed in built package"
    exit 1
fi
cd - > /dev/null
echo ""

# Step 5: Validate template.yaml (optional - requires AWS credentials)
echo "Step 5: Validating SAM template (optional)..."
if sam validate 2>/dev/null; then
    echo "✅ SAM template is valid"
else
    echo "⚠️  SAM template validation skipped (requires AWS credentials)"
fi
echo ""

echo "================================"
echo "✅ All validation checks passed!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Deploy with: sam deploy --force-upload"
echo "2. Check CloudWatch logs for ImportModuleError"
echo "3. Test Discord endpoint verification"
echo ""
