# DynamoDB Conversation Persistence for UX Agent

## Overview

This document describes the implementation of DynamoDB-based conversation persistence for the UX Agent, which replaces the previous in-memory storage to prevent "Conversation not found or expired" errors in Lambda environments.

## Problem

Previously, UX Agent conversations were stored in-memory using a Python dictionary. In AWS Lambda:
- Each invocation may use a different container
- When a user clicks the Discord Confirm/Cancel button, a new Lambda instance is often created
- The conversation dictionary is empty in the new instance, causing errors

## Solution

Replace in-memory storage with DynamoDB table for persistent conversation state.

## Implementation Details

### DynamoDB Table

**Table Name:** `ux-agent-conversations`

**Schema:**
- Primary Key: `conversation_id` (String)
- TTL Attribute: `ttl` (Number, Unix timestamp)
- TTL Enabled: Yes (auto-expire conversations after 1 hour)

**Attributes Stored:**
- `conversation_id`: Unique identifier for the conversation
- `user_id`: Discord user ID
- `section`: Target section (header, footer, navbar, home)
- `updates`: Dictionary of property updates
- `images`: List of uploaded image references
- `parsed_intent`: Parsed user intent from text/images
- `preview_message`: Generated preview message
- `confirmed`: Boolean confirmation status
- `needs_clarification`: Boolean flag for clarification needed
- `clarification_questions`: List of questions for user
- `ttl`: TTL expiration timestamp (1 hour from creation)

### Code Changes

#### UXAgent.__init__()
- Initializes DynamoDB table connection
- Replaces in-memory dictionary with table reference

#### start_conversation()
- Stores conversation in DynamoDB with 1-hour TTL
- Called when user initiates `/ux-update` command

#### confirm_and_execute()
- Retrieves conversation from DynamoDB
- Reconstructs ConversationState from stored data
- Returns "not found or expired" error if conversation missing

#### Conversation Updates
- Updates conversation in DynamoDB when user provides clarification
- Refreshes TTL on each update (extends expiration by 1 hour)

#### Conversation Cleanup
- Deletes conversation from DynamoDB when user cancels
- Auto-deletion via TTL after 1 hour of inactivity

### IAM Permissions

The Lambda execution role includes:
```yaml
- DynamoDBCrudPolicy:
    TableName: !Ref UXConversationsTable
```

This grants the following permissions:
- `dynamodb:GetItem` - Retrieve conversation
- `dynamodb:PutItem` - Store/update conversation
- `dynamodb:DeleteItem` - Delete conversation on cancel

### SAM Template

Added DynamoDB table resource:
```yaml
UXConversationsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ux-agent-conversations
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: conversation_id
        AttributeType: S
    KeySchema:
      - AttributeName: conversation_id
        KeyType: HASH
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
```

## Testing

All existing tests updated to mock DynamoDB:
- `test_dynamodb_persistence_stores_conversation` - Verifies conversation storage with TTL
- `test_dynamodb_persistence_retrieves_conversation` - Verifies conversation retrieval
- `test_dynamodb_persistence_deletes_on_cancel` - Verifies deletion on cancel
- `test_dynamodb_persistence_conversation_not_found` - Verifies error handling

## Deployment

1. Deploy updated SAM template to create DynamoDB table
2. Deploy updated Lambda function code
3. DynamoDB table will be created with TTL enabled
4. Existing workflows continue to work without changes

## Benefits

1. **Persistence Across Lambda Invocations** - Conversations survive Lambda cold starts
2. **Automatic Cleanup** - TTL automatically removes expired conversations
3. **No Manual Cleanup Required** - TTL handles garbage collection
4. **Scalability** - DynamoDB scales automatically with demand
5. **Pay-per-request Billing** - Cost-effective for sporadic usage

## Monitoring

Monitor these CloudWatch metrics:
- `ConsumedReadCapacityUnits` - Read operations
- `ConsumedWriteCapacityUnits` - Write operations
- `UserErrors` - Failed operations
- DynamoDB TTL deletions in CloudWatch Logs

## Cost Estimation

With pay-per-request billing:
- Write: $1.25 per million write requests
- Read: $0.25 per million read requests
- Storage: $0.25 per GB-month

Typical usage:
- 1 write on conversation start
- 1 read + optional write on button click
- 1 write or delete on confirm/cancel
- ~3-4 operations per conversation
- Storage: negligible (conversations < 10KB each)

## Troubleshooting

### "Conversation not found or expired"
- Check if conversation exists in DynamoDB console
- Verify TTL hasn't expired (< 1 hour old)
- Check Lambda has IAM permissions for DynamoDB

### DynamoDB Errors
- Check CloudWatch Logs for error details
- Verify table exists and has correct schema
- Verify IAM role has correct permissions

### TTL Not Working
- Verify TTL is enabled on the table
- TTL deletion can take up to 48 hours (typically minutes)
- Check DynamoDB console for TTL status
