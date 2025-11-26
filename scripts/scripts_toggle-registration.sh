#!/usr/bin/env bash
# Toggle ENABLE_REGISTRATION across pv-api-prod Lambda functions
# Usage: ./scripts/toggle-registration.sh enable|disable [us-west-2]
set -euo pipefail

ACTION="${1:-}"
REGION="${2:-us-west-2}"

if [[ "$ACTION" != "enable" && "$ACTION" != "disable" ]]; then
  echo "Usage: $0 enable|disable [aws-region]"
  exit 2
fi

VALUE="false"
if [[ "$ACTION" == "enable" ]]; then VALUE="true"; fi

echo "Setting ENABLE_REGISTRATION=${VALUE} for pv-api-prod functions in ${REGION}..."

# Get function names starting with pv-api-prod-
FUNC_LIST=$(aws lambda list-functions --region "$REGION" \
  --query "Functions[?starts_with(FunctionName, 'pv-api-prod-')].FunctionName" --output text)

if [[ -z "$FUNC_LIST" ]]; then
  echo "No pv-api-prod-* functions found in region $REGION"
  exit 1
fi

for FN in $FUNC_LIST; do
  echo "Patching $FN..."
  # Get current env vars
  CURRENT_ENV_JSON=$(aws lambda get-function-configuration --function-name "$FN" --region "$REGION" \
    --query 'Environment.Variables' --output json)

  # Merge/override ENABLE_REGISTRATION
  UPDATED_ENV=$(echo "$CURRENT_ENV_JSON" | jq --arg val "$VALUE" '. + {"ENABLE_REGISTRATION": $val}')

  # Update function configuration
  aws lambda update-function-configuration --function-name "$FN" --region "$REGION" \
    --environment "Variables=$UPDATED_ENV" >/dev/null

  echo "Updated $FN"
done

echo "Done. Wait ~30-60s for functions to pick up new env vars (cold starts will use new env immediately)."