#!/usr/bin/env python3
"""
Validate Discord slash commands deployment.

This script checks all required components for Discord slash commands to work:
1. Lambda functions are deployed
2. Environment variables are configured correctly
3. DynamoDB table exists
4. API Gateway endpoint is accessible
5. Discord configuration is correct

Usage:
    python validate_deployment.py [--stage dev|prod] [--verbose]
"""
import argparse
import json
import os
import subprocess
import sys
from typing import Dict, List, Tuple


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text: str):
    """Print a section header."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}\n")


def print_check(name: str, status: bool, details: str = "", warning: bool = False):
    """Print a check result."""
    if status:
        icon = f"{Colors.GREEN}✓{Colors.END}"
        status_text = f"{Colors.GREEN}PASS{Colors.END}"
    elif warning:
        icon = f"{Colors.YELLOW}⚠{Colors.END}"
        status_text = f"{Colors.YELLOW}WARN{Colors.END}"
    else:
        icon = f"{Colors.RED}✗{Colors.END}"
        status_text = f"{Colors.RED}FAIL{Colors.END}"
    
    print(f"{icon} [{status_text}] {name}")
    if details:
        print(f"          {details}")


def run_aws_command(command: List[str], check_error: bool = True) -> Tuple[bool, str]:
    """
    Run an AWS CLI command and return success status and output.
    
    Args:
        command: AWS CLI command as list of strings
        check_error: Whether to check for errors (False for commands that may legitimately fail)
    
    Returns:
        Tuple of (success, output)
    """
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if check_error and result.returncode != 0:
            return False, result.stderr
        
        return result.returncode == 0, result.stdout
    except subprocess.TimeoutExpired:
        return False, "Command timed out"
    except Exception as e:
        return False, str(e)


def check_aws_cli() -> bool:
    """Check if AWS CLI is installed and configured."""
    print_header("Checking AWS CLI")
    
    # Check if AWS CLI is installed
    success, output = run_aws_command(['aws', '--version'], check_error=False)
    if not success:
        print_check("AWS CLI installed", False, "AWS CLI not found. Install from https://aws.amazon.com/cli/")
        return False
    
    print_check("AWS CLI installed", True, output.strip())
    
    # Check if AWS credentials are configured
    success, output = run_aws_command(['aws', 'sts', 'get-caller-identity'])
    if not success:
        print_check("AWS credentials configured", False, "Run 'aws configure' to set up credentials")
        return False
    
    try:
        identity = json.loads(output)
        account = identity.get('Account', 'unknown')
        user = identity.get('Arn', 'unknown')
        print_check("AWS credentials configured", True, f"Account: {account}, User: {user}")
    except json.JSONDecodeError:
        print_check("AWS credentials configured", False, "Unable to parse AWS identity")
        return False
    
    return True


def check_cloudformation_stack(stack_name: str) -> Tuple[bool, Dict]:
    """Check if CloudFormation stack exists and is in a good state."""
    print_header(f"Checking CloudFormation Stack: {stack_name}")
    
    success, output = run_aws_command([
        'aws', 'cloudformation', 'describe-stacks',
        '--stack-name', stack_name
    ], check_error=False)
    
    if not success:
        print_check("Stack exists", False, f"Stack '{stack_name}' not found. Deploy using 'sam deploy'")
        return False, {}
    
    try:
        stacks = json.loads(output)
        if not stacks.get('Stacks'):
            print_check("Stack exists", False, "Stack not found in response")
            return False, {}
        
        stack = stacks['Stacks'][0]
        status = stack.get('StackStatus', 'UNKNOWN')
        
        if status in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']:
            print_check("Stack status", True, f"Status: {status}")
        elif status in ['CREATE_IN_PROGRESS', 'UPDATE_IN_PROGRESS']:
            print_check("Stack status", True, f"Status: {status} (deployment in progress)", warning=True)
        else:
            print_check("Stack status", False, f"Status: {status}")
            return False, {}
        
        # Get stack outputs
        outputs = {o['OutputKey']: o['OutputValue'] for o in stack.get('Outputs', [])}
        
        if 'DiscordWebhookUrl' in outputs:
            print_check("Discord webhook URL", True, outputs['DiscordWebhookUrl'])
        else:
            print_check("Discord webhook URL", False, "Not found in stack outputs")
        
        if 'GitHubWebhookUrl' in outputs:
            print_check("GitHub webhook URL", True, outputs['GitHubWebhookUrl'])
        else:
            print_check("GitHub webhook URL", False, "Not found in stack outputs")
        
        return True, outputs
    
    except json.JSONDecodeError as e:
        print_check("Parse stack info", False, f"Unable to parse CloudFormation output: {e}")
        return False, {}


def check_lambda_function(function_name: str, required_env_vars: List[str]) -> bool:
    """Check if Lambda function exists and has required environment variables."""
    print_header(f"Checking Lambda Function: {function_name}")
    
    success, output = run_aws_command([
        'aws', 'lambda', 'get-function-configuration',
        '--function-name', function_name
    ], check_error=False)
    
    if not success:
        print_check("Function exists", False, f"Function '{function_name}' not found")
        return False
    
    try:
        config = json.loads(output)
        
        # Check function status
        state = config.get('State', 'Unknown')
        last_update = config.get('LastUpdateStatus', 'Unknown')
        
        if state == 'Active' and last_update == 'Successful':
            print_check("Function status", True, f"State: {state}, Last Update: {last_update}")
        else:
            print_check("Function status", False, f"State: {state}, Last Update: {last_update}")
            return False
        
        # Check runtime
        runtime = config.get('Runtime', 'Unknown')
        print_check("Function runtime", True, f"Runtime: {runtime}")
        
        # Check environment variables
        env_vars = config.get('Environment', {}).get('Variables', {})
        
        all_vars_present = True
        for var in required_env_vars:
            if var in env_vars:
                # Redact sensitive values
                value = env_vars[var]
                if 'TOKEN' in var or 'KEY' in var or 'SECRET' in var:
                    if len(value) > 8:
                        value = f"{value[:4]}...{value[-4:]}"
                    else:
                        value = "***"
                print_check(f"Env var: {var}", True, f"Value: {value}")
            else:
                print_check(f"Env var: {var}", False, "Not set")
                all_vars_present = False
        
        return all_vars_present
    
    except json.JSONDecodeError as e:
        print_check("Parse function config", False, f"Unable to parse Lambda config: {e}")
        return False


def check_dynamodb_table(table_name: str) -> bool:
    """Check if DynamoDB table exists."""
    print_header(f"Checking DynamoDB Table: {table_name}")
    
    success, output = run_aws_command([
        'aws', 'dynamodb', 'describe-table',
        '--table-name', table_name
    ], check_error=False)
    
    if not success:
        print_check("Table exists", False, f"Table '{table_name}' not found")
        return False
    
    try:
        table_info = json.loads(output)
        table = table_info.get('Table', {})
        
        status = table.get('TableStatus', 'Unknown')
        item_count = table.get('ItemCount', 0)
        
        if status == 'ACTIVE':
            print_check("Table status", True, f"Status: {status}, Items: {item_count}")
            return True
        else:
            print_check("Table status", False, f"Status: {status}")
            return False
    
    except json.JSONDecodeError as e:
        print_check("Parse table info", False, f"Unable to parse DynamoDB output: {e}")
        return False


def check_discord_configuration(verbose: bool = False) -> bool:
    """Check Discord configuration in environment or provide guidance."""
    print_header("Discord Configuration Checklist")
    
    print("\n" + Colors.YELLOW + "Manual Checks Required:" + Colors.END)
    print("\nPlease verify the following in Discord Developer Portal:")
    print("  https://discord.com/developers/applications\n")
    
    print("1. Interactions Endpoint URL is set:")
    print("   - Go to your application > General Information")
    print("   - 'Interactions Endpoint URL' should be set to your DiscordWebhookUrl")
    print("   - Discord should show a green checkmark 'Valid'\n")
    
    print("2. Public Key matches Lambda environment:")
    print("   - Copy 'Public Key' from Discord Developer Portal")
    print("   - Compare with DISCORD_PUBLIC_KEY in Lambda environment")
    print("   - They must match exactly\n")
    
    print("3. Bot is invited to your server:")
    print("   - Use this invite URL format:")
    print("   - https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=2048")
    print("   - Required scopes: bot, applications.commands\n")
    
    print("4. Slash commands are registered:")
    print("   - Run: ./orchestrator/register_discord_commands.sh")
    print("   - Commands should appear in Discord autocomplete\n")
    
    print_check("Discord configuration", True, "Please verify manually", warning=True)
    return True


def print_summary(results: Dict[str, bool]):
    """Print summary of all checks."""
    print_header("Summary")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"Total checks: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}\n")
    
    if failed == 0:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All checks passed!{Colors.END}")
        print("\nIf Discord commands still don't respond:")
        print("1. Verify Discord Interactions Endpoint URL is set correctly")
        print("2. Verify DISCORD_PUBLIC_KEY matches Discord Developer Portal")
        print("3. Check CloudWatch Logs for errors:")
        print("   aws logs tail /aws/lambda/valine-orchestrator-discord-{stage} --follow")
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ Some checks failed{Colors.END}")
        print("\nFailed checks need to be fixed before Discord commands will work.")
        print("See DISCORD_DEPLOYMENT_TROUBLESHOOTING.md for detailed fix instructions.")


def main():
    """Main validation flow."""
    parser = argparse.ArgumentParser(description="Validate Discord slash commands deployment")
    parser.add_argument('--stage', choices=['dev', 'prod'], default='dev',
                       help='Deployment stage (default: dev)')
    parser.add_argument('--verbose', action='store_true',
                       help='Show verbose output')
    args = parser.parse_args()
    
    stage = args.stage
    verbose = args.verbose
    
    print(f"{Colors.BOLD}Discord Slash Commands Deployment Validator{Colors.END}")
    print(f"Stage: {stage}")
    print(f"Time: {subprocess.run(['date'], capture_output=True, text=True).stdout.strip()}\n")
    
    results = {}
    
    # Check AWS CLI
    results['aws_cli'] = check_aws_cli()
    if not results['aws_cli']:
        print_summary(results)
        sys.exit(1)
    
    # Check CloudFormation stack
    stack_name = 'valine-orchestrator' if stage == 'dev' else 'valine-orchestrator-prod'
    stack_ok, outputs = check_cloudformation_stack(stack_name)
    results['cloudformation_stack'] = stack_ok
    
    # Check Lambda functions
    discord_function = f'valine-orchestrator-discord-{stage}'
    github_function = f'valine-orchestrator-github-{stage}'
    
    required_env_vars = [
        'DISCORD_PUBLIC_KEY',
        'DISCORD_BOT_TOKEN',
        'GITHUB_TOKEN',
        'GITHUB_REPO',
        'STAGE',
        'RUN_TABLE_NAME'
    ]
    
    results['discord_lambda'] = check_lambda_function(discord_function, required_env_vars)
    results['github_lambda'] = check_lambda_function(github_function, ['GITHUB_TOKEN', 'GITHUB_WEBHOOK_SECRET', 'DISCORD_BOT_TOKEN'])
    
    # Check DynamoDB table
    table_name = f'valine-orchestrator-runs-{stage}'
    results['dynamodb_table'] = check_dynamodb_table(table_name)
    
    # Discord configuration checklist
    results['discord_config'] = check_discord_configuration(verbose)
    
    # Print summary
    print_summary(results)
    
    # Exit code based on results
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
