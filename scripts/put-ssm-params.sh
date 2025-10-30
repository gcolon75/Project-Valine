#!/usr/bin/env bash
# Usage: ./scripts/put-ssm-params.sh <stage> <region> <json-file>
set -euo pipefail
STAGE="${1:-dev}"
REGION="${2:-us-west-2}"
JSON="${3:-scripts/ssm-params.example.json}"
for k in $(jq -r 'keys[]' "$JSON"); do
  v="$(jq -r --arg k "$k" '.[$k]' "$JSON")"
  aws ssm put-parameter --name "/valine/$STAGE/$k" --value "$v" --type "SecureString" --overwrite --region "$REGION"
  echo "Put /valine/$STAGE/$k"
done
