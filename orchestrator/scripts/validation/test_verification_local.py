#!/usr/bin/env python3
"""
Local testing script for deploy verification.
Run this to test the verification logic without deploying to Lambda.

IMPORTANT: Run this script from the orchestrator root directory:
    cd orchestrator
    python scripts/validation/test_verification_local.py [run_id]

Usage:
    python scripts/validation/test_verification_local.py [run_id]

Examples:
    python scripts/validation/test_verification_local.py              # Test with latest run
    python scripts/validation/test_verification_local.py 12345678     # Test with specific run ID
"""
import os
import sys
from app.verification.verifier import DeployVerifier


def main():
    # Check for required environment variables
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        print('❌ Error: GITHUB_TOKEN environment variable not set')
        print('   Set it with: export GITHUB_TOKEN=your_token_here')
        sys.exit(1)

    frontend_url = os.environ.get('FRONTEND_BASE_URL')
    api_url = os.environ.get('VITE_API_BASE')

    if not frontend_url:
        print('⚠️  Warning: FRONTEND_BASE_URL not set (frontend checks will fail)')
    if not api_url:
        print('⚠️  Warning: VITE_API_BASE not set (API checks will fail)')

    print('🔍 Deploy Verification Local Test')
    print('=' * 50)

    # Get run ID from command line if provided
    run_id = None
    if len(sys.argv) > 1:
        try:
            run_id = int(sys.argv[1])
            print(f'Testing with specific run ID: {run_id}')
        except ValueError:
            print(f'❌ Error: Invalid run ID: {sys.argv[1]}')
            sys.exit(1)
    else:
        print('Testing with latest run')

    print()

    # Create verifier and run verification
    try:
        verifier = DeployVerifier(github_token=github_token)

        if run_id:
            result = verifier.verify_run(run_id)
        else:
            result = verifier.verify_latest_run()

        # Print results
        print('Results:')
        print('-' * 50)

        if 'error' in result:
            print(f'❌ Error: {result["error"]}')
            print()
            message = result.get('message', {})
            print(f'Content: {message.get("content", "N/A")}')
            return

        # Print run info
        run_info = result.get('run_info', {})
        print(f'Run ID: {run_info.get("run_id", "N/A")}')
        print(f'Status: {run_info.get("status", "N/A")}')
        print(f'Conclusion: {run_info.get("conclusion", "N/A")}')
        print(f'URL: {run_info.get("html_url", "N/A")}')
        print()

        # Print step durations
        durations = run_info.get('step_durations', {})
        print('Step Durations:')
        print(f'  Build: {durations.get("build", "N/A")}s')
        print(f'  S3 Sync: {durations.get("s3_sync", "N/A")}s')
        print(f'  CloudFront: {durations.get("cloudfront_invalidation", "N/A")}s')
        print()

        # Print frontend results
        frontend = result.get('frontend_results', {})
        print('Frontend Checks:')
        print(f'  Base URL: {frontend.get("base_url", "N/A")}')
        print(f'  All Success: {frontend.get("all_success", False)}')
        for endpoint, endpoint_result in frontend.get('endpoints', {}).items():
            status = endpoint_result.get('status_code', 'error')
            print(f'  {endpoint}: {status}')
        print()

        # Print API results
        api = result.get('api_results', {})
        print('API Checks:')
        print(f'  Base URL: {api.get("base_url", "N/A")}')
        print(f'  All Success: {api.get("all_success", False)}')
        for endpoint, endpoint_result in api.get('endpoints', {}).items():
            status = endpoint_result.get('status_code', 'error')
            print(f'  {endpoint}: {status}')
        print()

        # Print Discord message
        message = result.get('message', {})
        print('Discord Message:')
        print('-' * 50)
        print(message.get('content', 'N/A'))
        print()

        embed = message.get('embed', {})
        if embed:
            print(f'Title: {embed.get("title", "N/A")}')
            print(f'Description:')
            print(embed.get('description', 'N/A'))
            print()

            fields = embed.get('fields', [])
            if fields:
                print('Fields:')
                for field in fields:
                    print(f'  {field.get("name", "N/A")}: {field.get("value", "N/A")}')

    except Exception as e:
        print(f'❌ Error: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
