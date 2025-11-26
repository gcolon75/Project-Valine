#!/usr/bin/env bash
# Create the two allowlisted accounts via the public API, login, and complete onboarding.
# Usage: ./scripts/create-accounts.sh https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
set -euo pipefail

API_BASE="${1:-}"
if [[ -z "$API_BASE" ]]; then
  echo "Usage: $0 <API_BASE_URL>   e.g. https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"
  exit 2
fi

# Users to create
USERS=(
  "ghawk075@gmail.com:Test123!:ghawk075:Gabriel"
  "valinejustin@gmail.com:Test123!:valinejustin:Justin"
)

for entry in "${USERS[@]}"; do
  IFS=":" read -r EMAIL PASSWORD USERNAME DISPLAYNAME <<< "$entry"
  echo
  echo "Registering $EMAIL ..."
  # register (if already exists backend will return an error; skip to login)
  resp=$(curl -sS -w "%{http_code}" -o /tmp/register_response.json \
    -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"username\":\"$USERNAME\",\"displayName\":\"$DISPLAYNAME\"}" ) || true
  code="${resp:(-3)}"
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "Registered $EMAIL (response code $code)."
  else
    echo "Register returned $code. Continuing to login (maybe already exists)."
    cat /tmp/register_response.json
  fi

  echo "Logging in $EMAIL ..."
  # Use cookie jar file to persist cookies
  COOKIES="/tmp/cookies-${USERNAME}.txt"
  curl -sS -c "$COOKIES" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" -o /tmp/login_${USERNAME}.json || true

  # Check login success
  if grep -q '"user"' /tmp/login_${USERNAME}.json; then
    echo "Login succeeded for $EMAIL"
  else
    echo "Login may have failed for $EMAIL — view /tmp/login_${USERNAME}.json"
    cat /tmp/login_${USERNAME}.json
    echo "Continuing..."
  fi

  echo "Completing onboarding for $EMAIL ..."
  # Example profile payload - adapt fields as needed
  PROFILE_UPDATE='{"displayName":"'"$DISPLAYNAME"'","username":"'"$USERNAME"'","headline":"Full Stack Developer","bio":"Testing account setup","roles":["Developer"],"tags":["react","node"],"onboardingComplete":true,"profileComplete":true}'

  curl -sS -b "$COOKIES" -X PATCH "$API_BASE/me/profile" \
    -H "Content-Type: application/json" \
    -d "$PROFILE_UPDATE" -o /tmp/profile_${USERNAME}.json || true

  echo "Profile update response for $EMAIL:"
  cat /tmp/profile_${USERNAME}.json
done

echo
echo "All done. You should now be able to login as both users and be past onboarding."
echo "Remember to disable registration afterwards: ./scripts/toggle-registration.sh disable"