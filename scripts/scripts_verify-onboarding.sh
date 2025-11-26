#!/usr/bin/env bash
# Verify onboardingComplete persisted by calling /auth/login then /me/profile
# Usage: ./scripts/verify-onboarding.sh https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
set -euo pipefail

API_BASE="${1:-}"
if [[ -z "$API_BASE" ]]; then
  echo "Usage: $0 <API_BASE_URL>"
  exit 2
fi

USERS=("ghawk075@gmail.com:Test123!" "valinejustin@gmail.com:Test123!")

for u in "${USERS[@]}"; do
  IFS=":" read -r EMAIL PASSWORD <<< "$u"
  echo
  echo "Logging in $EMAIL ..."
  COOKIES="/tmp/verify-cookies-$(echo $EMAIL | tr '@' '_' | tr '.' '_').txt"
  curl -sS -c "$COOKIES" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" -o /tmp/verify_login.json || true

  echo "Fetching profile for $EMAIL ..."
  curl -sS -b "$COOKIES" -X GET "$API_BASE/me/profile" -H "Accept: application/json" -o /tmp/verify_profile.json || true

  echo "Profile response:"
  cat /tmp/verify_profile.json | jq .
  echo
  echo "Check onboardingComplete value above (expect true)."
done