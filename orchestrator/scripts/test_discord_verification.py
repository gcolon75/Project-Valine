#!/usr/bin/env python3
"""
Test Discord signature verification locally to debug endpoint verification issues.

This script helps verify that:
1. The public key format is correct
2. The signature verification logic works
3. The PING/PONG response is properly formatted

Usage:
    python3 test_discord_verification.py <PUBLIC_KEY>

Example:
    python3 test_discord_verification.py abc123def456...
"""

import sys
import json
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError


def verify_discord_signature(signature, timestamp, body, public_key):
    """
    Verify Discord interaction signature.
    
    Args:
        signature: Hex-encoded Ed25519 signature
        timestamp: Unix timestamp string
        body: Raw request body
        public_key: Hex-encoded Ed25519 public key
        
    Returns:
        bool: True if signature is valid
    """
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        verify_key.verify(f'{timestamp}{body}'.encode(), bytes.fromhex(signature))
        return True
    except (BadSignatureError, ValueError) as e:
        print(f"Verification failed: {e}")
        return False


def test_public_key_format(public_key):
    """Test that the public key is in the correct format."""
    print("=" * 60)
    print("Testing Public Key Format")
    print("=" * 60)
    
    # Check length
    if len(public_key) != 64:
        print(f"❌ FAIL: Key length is {len(public_key)}, expected 64")
        return False
    else:
        print(f"✅ PASS: Key length is 64 characters")
    
    # Check if all hex
    try:
        bytes.fromhex(public_key)
        print(f"✅ PASS: Key contains only valid hex characters")
    except ValueError as e:
        print(f"❌ FAIL: Key contains invalid characters: {e}")
        return False
    
    # Try to create verify key
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        print(f"✅ PASS: Public key can be loaded by nacl.signing.VerifyKey")
    except Exception as e:
        print(f"❌ FAIL: Cannot load public key: {e}")
        return False
    
    print(f"\n✅ Public key format is VALID")
    print(f"   First 20 chars: {public_key[:20]}...")
    print(f"   Last 20 chars:  ...{public_key[-20:]}")
    return True


def test_ping_pong_response():
    """Test the PING/PONG response format."""
    print("\n" + "=" * 60)
    print("Testing PING/PONG Response Format")
    print("=" * 60)
    
    # This is what Discord sends
    ping_body = '{"type":1}'
    
    # This is what we should respond with
    pong_response = {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'type': 1})
    }
    
    print(f"\nExpected PING request body:")
    print(f"  {ping_body}")
    
    print(f"\nExpected PONG response:")
    print(json.dumps(pong_response, indent=2))
    
    # Validate response format
    try:
        body_data = json.loads(pong_response['body'])
        if body_data.get('type') == 1:
            print(f"\n✅ PASS: PONG response format is correct")
            return True
        else:
            print(f"\n❌ FAIL: PONG response type is not 1")
            return False
    except Exception as e:
        print(f"\n❌ FAIL: Invalid PONG response: {e}")
        return False


def test_handler_logic(public_key):
    """Test the full handler logic."""
    print("\n" + "=" * 60)
    print("Testing Handler Logic")
    print("=" * 60)
    
    # Simulate a PING request
    print("\nSimulating Discord PING request...")
    
    event = {
        'headers': {
            'x-signature-ed25519': 'fake_signature',
            'x-signature-timestamp': '1234567890'
        },
        'body': '{"type":1}'
    }
    
    # Extract values like the handler does
    signature = event.get('headers', {}).get('x-signature-ed25519')
    timestamp = event.get('headers', {}).get('x-signature-timestamp')
    body = event.get('body', '')
    
    print(f"\nExtracted values:")
    print(f"  signature: {signature}")
    print(f"  timestamp: {timestamp}")
    print(f"  body: {body}")
    print(f"  public_key: {public_key[:20]}...{public_key[-20:]}")
    
    # Note: We can't actually verify without a real signature from Discord
    print(f"\n⚠️  NOTE: Cannot verify signature without real Discord request")
    print(f"   The signature verification will fail, which is expected")
    
    result = verify_discord_signature(signature, timestamp, body, public_key)
    
    if not result:
        print(f"\n✅ Expected behavior: Signature verification failed")
        print(f"   (This is normal - we're using a fake signature)")
    else:
        print(f"\n❌ Unexpected: Signature verification succeeded with fake signature")
    
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_discord_verification.py <PUBLIC_KEY>")
        print("\nExample:")
        print("  python3 test_discord_verification.py abc123def456...")
        print("\nYou can get the public key from:")
        print("  1. Discord Developer Portal → Your App → General Information")
        print("  2. AWS Lambda → valine-orchestrator-discord-dev → Environment variables")
        print("  3. GitHub Secrets → STAGING_DISCORD_PUBLIC_KEY")
        sys.exit(1)
    
    public_key = sys.argv[1].strip()
    
    print("\n" + "=" * 60)
    print("Discord Signature Verification Test")
    print("=" * 60)
    print(f"\nPublic Key (provided): {public_key[:20]}...{public_key[-20:]}")
    
    # Run tests
    all_passed = True
    
    if not test_public_key_format(public_key):
        all_passed = False
    
    if not test_ping_pong_response():
        all_passed = False
    
    if not test_handler_logic(public_key):
        all_passed = False
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    if all_passed:
        print("\n✅ All tests passed!")
        print("\nNext steps:")
        print("  1. Verify this public key matches Discord Developer Portal")
        print("  2. Verify this public key matches AWS Lambda environment variable")
        print("  3. Verify this public key matches GitHub Secret")
        print("  4. Try Discord endpoint verification again")
    else:
        print("\n❌ Some tests failed")
        print("\nAction required:")
        print("  1. Check the public key format")
        print("  2. Ensure you're using the correct bot's public key")
        print("  3. Verify no extra spaces or newlines in the key")
    
    print("\n" + "=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
