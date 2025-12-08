#!/bin/bash
# CloudFormation Stack Recovery Script
# Recovers from DELETE_FAILED or UPDATE_ROLLBACK_FAILED states
#
# Usage: ./scripts/recover-failed-stack.sh [stack-name] [region]

set -e

STACK_NAME="${1:-pv-api-prod}"
REGION="${2:-us-west-2}"

echo "=========================================="
echo "CloudFormation Stack Recovery"
echo "=========================================="
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""

# Check if stack exists
echo "Checking stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
  echo "✅ Stack does not exist. No recovery needed."
  echo "You can proceed with a fresh deployment."
  exit 0
fi

echo "Current status: $STACK_STATUS"
echo ""

# Handle different failure states
case $STACK_STATUS in
  DELETE_FAILED|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED)
    echo "⚠️  Stack is in a failed state: $STACK_STATUS"
    echo ""
    echo "Checking for resources that failed to delete..."
    
    FAILED_RESOURCES=$(aws cloudformation describe-stack-resources \
      --stack-name "$STACK_NAME" \
      --region "$REGION" \
      --query 'StackResources[?ResourceStatus==`DELETE_FAILED`].[LogicalResourceId,ResourceType,PhysicalResourceId]' \
      --output text 2>/dev/null || echo "")
    
    if [ -n "$FAILED_RESOURCES" ]; then
      echo ""
      echo "Resources that failed to delete:"
      echo "================================="
      echo "$FAILED_RESOURCES"
      echo ""
      echo "⚠️  You have two options:"
      echo ""
      echo "1. Manual cleanup (recommended for production):"
      echo "   - Delete each resource manually via AWS Console"
      echo "   - Then re-run this script to delete the stack"
      echo ""
      echo "2. Force delete with retention (faster but leaves orphaned resources):"
      echo "   - Press 'y' to retain failed resources and delete the stack"
      echo "   - You'll need to clean up retained resources manually later"
      echo ""
      read -p "Proceed with option 2 (retain and delete)? (y/N): " -n 1 -r
      echo
      
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Extracting resource IDs to retain..."
        RETAIN_IDS=$(echo "$FAILED_RESOURCES" | awk '{print $1}' | tr '\n' ' ')
        
        echo "Deleting stack with retained resources: $RETAIN_IDS"
        aws cloudformation delete-stack \
          --stack-name "$STACK_NAME" \
          --region "$REGION" \
          --retain-resources $RETAIN_IDS
        
        echo ""
        echo "⏳ Waiting for stack deletion (this may take a few minutes)..."
        aws cloudformation wait stack-delete-complete \
          --stack-name "$STACK_NAME" \
          --region "$REGION" 2>/dev/null || true
        
        echo ""
        echo "✅ Stack deleted (with retained resources)"
        echo ""
        echo "⚠️  IMPORTANT: The following resources were retained and must be deleted manually:"
        echo "$FAILED_RESOURCES"
        echo ""
        echo "To clean up retained resources, use the AWS Console or CLI for each resource type."
      else
        echo "Aborted. Please manually delete failed resources and re-run this script."
        exit 1
      fi
    else
      echo "No failed resources found. Attempting normal delete..."
      aws cloudformation delete-stack \
        --stack-name "$STACK_NAME" \
        --region "$REGION"
      
      echo ""
      echo "⏳ Waiting for stack deletion (this may take a few minutes)..."
      aws cloudformation wait stack-delete-complete \
        --stack-name "$STACK_NAME" \
        --region "$REGION" 2>/dev/null || {
        echo ""
        echo "⚠️  Stack deletion is taking longer than expected."
        echo "Check the CloudFormation console for details:"
        echo "https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
        exit 1
      }
      
      echo "✅ Stack deleted successfully"
    fi
    ;;
    
  DELETE_COMPLETE)
    echo "✅ Stack is already deleted."
    ;;
    
  CREATE_COMPLETE|UPDATE_COMPLETE)
    echo "✅ Stack is in a healthy state: $STACK_STATUS"
    echo "No recovery needed."
    exit 0
    ;;
    
  CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|DELETE_IN_PROGRESS)
    echo "⏳ Stack is currently being modified: $STACK_STATUS"
    echo "Wait for the current operation to complete before recovering."
    exit 1
    ;;
    
  *)
    echo "⚠️  Unexpected stack status: $STACK_STATUS"
    echo "Check the CloudFormation console for details:"
    echo "https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "Recovery Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Build the Prisma layer:"
echo "   cd serverless && ./scripts/build-prisma-layer.sh"
echo ""
echo "2. Verify the layer artifact exists:"
echo "   ls -lh serverless/layers/prisma-layer.zip"
echo ""
echo "3. Deploy fresh stack:"
echo "   cd serverless && ./deploy.sh"
echo ""
