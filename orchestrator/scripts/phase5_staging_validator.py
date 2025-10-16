#!/usr/bin/env python3
"""
Phase 5 Staging Validator and Flag Manager

This agent validates Phase 5 (observability + alerts) features in staging,
manages feature flags safely, and produces validation artifacts.

Role: Senior SRE/Platform Engineer Agent
Goals:
1. Safely toggle and validate Phase 5 features in staging
2. Collect redacted evidence (CloudWatch logs, /debug-last, Discord alerts)
3. Produce PHASE5_VALIDATION.md update and executive validation artifact

Usage:
    python phase5_staging_validator.py --help
    python phase5_staging_validator.py preflight --config config.json
    python phase5_staging_validator.py validate-debug --config config.json
    python phase5_staging_validator.py validate-alerts --config config.json
    python phase5_staging_validator.py full-validation --config config.json
"""

import os
import sys
import json
import time
import argparse
import hashlib
import subprocess
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class ValidationConfig:
    """Configuration for Phase 5 staging validation"""
    # Deployment method
    staging_deploy_method: str  # aws_parameter_store, sam_deploy, github_repo_var
    
    # AWS Configuration
    aws_region: str = "us-west-2"
    staging_lambda_discord: Optional[str] = None  # Lambda function name for Discord handler
    staging_lambda_github: Optional[str] = None  # Lambda function name for GitHub handler
    staging_api_endpoint: Optional[str] = None  # API Gateway endpoint URL
    
    # Discord Configuration
    test_channel_id: Optional[str] = None  # Staging Discord channel for alerts
    test_user_id: Optional[str] = None  # Test user for /debug-last
    discord_bot_token: Optional[str] = None  # Bot token for testing
    
    # GitHub Configuration
    github_repo: str = "gcolon75/Project-Valine"
    github_token: Optional[str] = None
    
    # Feature Flags
    enable_debug_cmd: bool = True  # Enable debug command in staging
    enable_alerts: bool = False  # Start with alerts disabled
    alert_channel_id: Optional[str] = None  # Alert channel (staging)
    alert_allowlist_users: Optional[List[str]] = None  # User allowlist
    
    # CloudWatch
    log_group_discord: Optional[str] = None
    log_group_github: Optional[str] = None
    
    # Validation Settings
    correlation_id_prefix: str = "STG"  # Prefix for staging test runs
    evidence_output_dir: str = "./validation_evidence"  # Output directory for evidence
    
    @classmethod
    def from_file(cls, config_file: str) -> 'ValidationConfig':
        """Load configuration from JSON file"""
        with open(config_file, 'r') as f:
            data = json.load(f)
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class ValidationEvidence:
    """Evidence collected during validation"""
    timestamp: str
    test_name: str
    status: str  # pass, fail, skip
    details: Dict[str, Any]
    logs: Optional[List[str]] = None
    screenshots: Optional[List[str]] = None
    artifacts: Optional[List[str]] = None


class Phase5StagingValidator:
    """Phase 5 Staging Validator and Flag Manager"""
    
    def __init__(self, config: ValidationConfig):
        self.config = config
        self.evidence: List[ValidationEvidence] = []
        self.correlation_id = self._generate_correlation_id()
        
        # Ensure evidence directory exists
        os.makedirs(config.evidence_output_dir, exist_ok=True)
        
        # Track test results
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "skipped": 0
        }
    
    def _generate_correlation_id(self) -> str:
        """Generate unique correlation ID for this validation run"""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        random_suffix = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        return f"{self.config.correlation_id_prefix}-{timestamp}-{random_suffix}"
    
    def _log(self, level: str, message: str, **kwargs):
        """Log message with structured format"""
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": "phase5-validator",
            "correlation_id": self.correlation_id,
            "msg": message,
            **kwargs
        }
        print(json.dumps(log_entry))
    
    def _run_command(self, command: List[str], capture_output: bool = True) -> subprocess.CompletedProcess:
        """Run shell command and capture output"""
        self._log("debug", f"Running command: {' '.join(command)}")
        try:
            result = subprocess.run(
                command,
                capture_output=capture_output,
                text=True,
                timeout=60
            )
            return result
        except subprocess.TimeoutExpired:
            self._log("error", f"Command timeout: {' '.join(command)}")
            raise
        except Exception as e:
            self._log("error", f"Command failed: {str(e)}")
            raise
    
    def _check_aws_cli(self) -> bool:
        """Check if AWS CLI is available"""
        try:
            result = self._run_command(["aws", "--version"])
            return result.returncode == 0
        except Exception:
            return False
    
    def _check_github_cli(self) -> bool:
        """Check if GitHub CLI is available"""
        try:
            result = self._run_command(["gh", "--version"])
            return result.returncode == 0
        except Exception:
            return False
    
    def _record_evidence(self, test_name: str, status: str, details: Dict[str, Any], 
                         logs: Optional[List[str]] = None):
        """Record evidence for a test"""
        evidence = ValidationEvidence(
            timestamp=datetime.now(timezone.utc).isoformat(),
            test_name=test_name,
            status=status,
            details=details,
            logs=logs
        )
        self.evidence.append(evidence)
        
        # Update test results
        if status == "pass":
            self.test_results["passed"] += 1
        elif status == "fail":
            self.test_results["failed"] += 1
        else:
            self.test_results["skipped"] += 1
    
    # ============================================
    # Step 1: Preflight Checks
    # ============================================
    
    def preflight_checks(self) -> bool:
        """Run preflight checks before validation"""
        self._log("info", "Starting preflight checks", correlation_id=self.correlation_id)
        
        checks_passed = True
        
        # Check AWS CLI
        if not self._check_aws_cli():
            self._log("error", "AWS CLI not found or not configured")
            self._record_evidence("preflight_aws_cli", "fail", 
                                {"error": "AWS CLI not available"})
            checks_passed = False
        else:
            self._record_evidence("preflight_aws_cli", "pass", 
                                {"message": "AWS CLI available"})
        
        # Check GitHub CLI (optional)
        if self._check_github_cli():
            self._record_evidence("preflight_github_cli", "pass", 
                                {"message": "GitHub CLI available"})
        else:
            self._log("warn", "GitHub CLI not found (optional)")
            self._record_evidence("preflight_github_cli", "skip", 
                                {"message": "GitHub CLI not available (optional)"})
        
        # Verify required configuration
        required_configs = {
            "staging_lambda_discord": self.config.staging_lambda_discord,
            "test_channel_id": self.config.test_channel_id,
            "staging_deploy_method": self.config.staging_deploy_method
        }
        
        for key, value in required_configs.items():
            if not value:
                self._log("error", f"Missing required configuration: {key}")
                self._record_evidence(f"preflight_config_{key}", "fail",
                                    {"error": f"Missing {key}"})
                checks_passed = False
            else:
                self._record_evidence(f"preflight_config_{key}", "pass",
                                    {"message": f"{key} configured"})
        
        # Check test channel exists and is isolated
        if self.config.test_channel_id:
            if "prod" in self.config.test_channel_id.lower() or \
               "production" in self.config.test_channel_id.lower():
                self._log("error", "Test channel ID appears to be production channel!")
                self._record_evidence("preflight_channel_safety", "fail",
                                    {"error": "Production channel detected"})
                checks_passed = False
            else:
                self._record_evidence("preflight_channel_safety", "pass",
                                    {"message": "Test channel is staging/test channel"})
        
        if checks_passed:
            self._log("info", "Preflight checks passed")
        else:
            self._log("error", "Preflight checks failed")
        
        return checks_passed
    
    # ============================================
    # Step 2: Feature Flag Management
    # ============================================
    
    def set_environment_variable_lambda(self, lambda_name: str, var_name: str, 
                                       var_value: str) -> bool:
        """Set environment variable on Lambda function"""
        self._log("info", f"Setting {var_name}={var_value} on Lambda {lambda_name}")
        
        try:
            # Get current environment variables
            result = self._run_command([
                "aws", "lambda", "get-function-configuration",
                "--function-name", lambda_name,
                "--region", self.config.aws_region
            ])
            
            if result.returncode != 0:
                self._log("error", f"Failed to get Lambda config: {result.stderr}")
                return False
            
            config_data = json.loads(result.stdout)
            env_vars = config_data.get("Environment", {}).get("Variables", {})
            
            # Update environment variable
            env_vars[var_name] = var_value
            
            # Update Lambda configuration
            result = self._run_command([
                "aws", "lambda", "update-function-configuration",
                "--function-name", lambda_name,
                "--environment", f"Variables={json.dumps(env_vars)}",
                "--region", self.config.aws_region
            ])
            
            if result.returncode != 0:
                self._log("error", f"Failed to update Lambda config: {result.stderr}")
                return False
            
            self._log("info", f"Successfully updated {var_name} on {lambda_name}")
            
            # Wait for update to complete
            time.sleep(5)
            
            return True
        
        except Exception as e:
            self._log("error", f"Error setting environment variable: {str(e)}")
            return False
    
    def enable_debug_command(self) -> bool:
        """Enable debug command in staging"""
        self._log("info", "Enabling debug command in staging")
        
        if not self.config.staging_lambda_discord:
            self._log("error", "staging_lambda_discord not configured")
            self._record_evidence("enable_debug_cmd", "fail",
                                {"error": "Lambda name not configured"})
            return False
        
        success = self.set_environment_variable_lambda(
            self.config.staging_lambda_discord,
            "ENABLE_DEBUG_CMD",
            "true"
        )
        
        if success:
            self._record_evidence("enable_debug_cmd", "pass",
                                {"lambda": self.config.staging_lambda_discord,
                                 "ENABLE_DEBUG_CMD": "true"})
        else:
            self._record_evidence("enable_debug_cmd", "fail",
                                {"error": "Failed to set environment variable"})
        
        return success
    
    def enable_alerts(self, channel_id: str) -> bool:
        """Enable alerts in staging"""
        self._log("info", f"Enabling alerts with channel {channel_id}")
        
        if not self.config.staging_lambda_discord:
            self._log("error", "staging_lambda_discord not configured")
            self._record_evidence("enable_alerts", "fail",
                                {"error": "Lambda name not configured"})
            return False
        
        # Set ALERT_CHANNEL_ID first
        success = self.set_environment_variable_lambda(
            self.config.staging_lambda_discord,
            "ALERT_CHANNEL_ID",
            channel_id
        )
        
        if not success:
            self._record_evidence("enable_alerts_channel", "fail",
                                {"error": "Failed to set ALERT_CHANNEL_ID"})
            return False
        
        # Then enable alerts
        success = self.set_environment_variable_lambda(
            self.config.staging_lambda_discord,
            "ENABLE_ALERTS",
            "true"
        )
        
        if success:
            self._record_evidence("enable_alerts", "pass",
                                {"lambda": self.config.staging_lambda_discord,
                                 "ENABLE_ALERTS": "true",
                                 "ALERT_CHANNEL_ID": channel_id})
        else:
            self._record_evidence("enable_alerts", "fail",
                                {"error": "Failed to set ENABLE_ALERTS"})
        
        return success
    
    def disable_alerts(self) -> bool:
        """Disable alerts in staging"""
        self._log("info", "Disabling alerts")
        
        if not self.config.staging_lambda_discord:
            return False
        
        success = self.set_environment_variable_lambda(
            self.config.staging_lambda_discord,
            "ENABLE_ALERTS",
            "false"
        )
        
        return success
    
    # ============================================
    # Step 3: Validate /debug-last Command
    # ============================================
    
    def validate_debug_last(self) -> bool:
        """Validate /debug-last command"""
        self._log("info", "Validating /debug-last command")
        
        # This would require Discord API interaction or manual testing
        # For now, we'll document the manual test steps
        
        test_steps = [
            "1. Execute a command (e.g., /diagnose) in staging Discord",
            "2. Immediately execute /debug-last",
            "3. Verify response is ephemeral (only visible to user)",
            "4. Verify trace ID present and matches CloudWatch logs",
            "5. Verify steps and timings are present",
            "6. Verify secrets are redacted (last 4 chars visible only)",
            "7. Verify output length < 1900 chars"
        ]
        
        self._record_evidence("validate_debug_last", "skip",
                            {"message": "Manual testing required",
                             "test_steps": test_steps})
        
        self._log("info", "/debug-last validation requires manual testing")
        return True
    
    # ============================================
    # Step 4: Validate Alerts
    # ============================================
    
    def validate_alerts(self) -> bool:
        """Validate Discord alerts with dedupe"""
        self._log("info", "Validating Discord alerts")
        
        # This would require triggering actual alerts
        # For now, we'll document the test procedure
        
        test_steps = [
            "1. Ensure ENABLE_ALERTS=true and ALERT_CHANNEL_ID is set",
            "2. Trigger a controlled failure (e.g., invalid workflow dispatch)",
            "3. Verify single alert posted to staging channel",
            "4. Verify alert includes severity emoji, root cause, trace_id, links",
            "5. Verify no secrets in alert message",
            "6. Trigger same failure again within 5 minutes",
            "7. Verify second alert is suppressed (rate-limited)",
            "8. Wait 6 minutes and trigger again",
            "9. Verify third alert is posted (dedupe window expired)"
        ]
        
        self._record_evidence("validate_alerts", "skip",
                            {"message": "Manual testing required",
                             "test_steps": test_steps})
        
        self._log("info", "Alerts validation requires manual testing")
        return True
    
    # ============================================
    # Step 5: Collect Evidence from CloudWatch
    # ============================================
    
    def collect_cloudwatch_logs(self, trace_id: Optional[str] = None) -> List[str]:
        """Collect logs from CloudWatch"""
        self._log("info", "Collecting CloudWatch logs")
        
        logs = []
        
        if not self.config.log_group_discord:
            self._log("warn", "log_group_discord not configured, skipping log collection")
            return logs
        
        try:
            # Build query
            if trace_id:
                filter_pattern = f'{{ $.trace_id = "{trace_id}" }}'
            else:
                filter_pattern = f'{{ $.correlation_id = "{self.correlation_id}" }}'
            
            # Get logs from last 1 hour
            start_time = int((time.time() - 3600) * 1000)
            end_time = int(time.time() * 1000)
            
            result = self._run_command([
                "aws", "logs", "filter-log-events",
                "--log-group-name", self.config.log_group_discord,
                "--start-time", str(start_time),
                "--end-time", str(end_time),
                "--filter-pattern", filter_pattern,
                "--region", self.config.aws_region,
                "--max-items", "50"
            ])
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                events = data.get("events", [])
                logs = [event.get("message", "") for event in events]
                
                self._log("info", f"Collected {len(logs)} log entries")
                self._record_evidence("collect_cloudwatch_logs", "pass",
                                    {"log_count": len(logs),
                                     "log_group": self.config.log_group_discord})
            else:
                self._log("error", f"Failed to collect logs: {result.stderr}")
                self._record_evidence("collect_cloudwatch_logs", "fail",
                                    {"error": result.stderr})
        
        except Exception as e:
            self._log("error", f"Error collecting logs: {str(e)}")
            self._record_evidence("collect_cloudwatch_logs", "fail",
                                {"error": str(e)})
        
        return logs
    
    # ============================================
    # Step 6: Generate Validation Report
    # ============================================
    
    def generate_validation_report(self) -> str:
        """Generate validation report"""
        self._log("info", "Generating validation report")
        
        report_lines = [
            "# Phase 5 Staging Validation Report",
            "",
            f"**Correlation ID:** `{self.correlation_id}`",
            f"**Timestamp:** {datetime.now(timezone.utc).isoformat()}",
            f"**Staging Deploy Method:** {self.config.staging_deploy_method}",
            "",
            "## Test Results Summary",
            "",
            f"- ✅ Passed: {self.test_results['passed']}",
            f"- ❌ Failed: {self.test_results['failed']}",
            f"- ⏭️ Skipped: {self.test_results['skipped']}",
            "",
            "## Configuration",
            "",
            "```json",
            json.dumps(self.config.to_dict(), indent=2),
            "```",
            "",
            "## Evidence",
            ""
        ]
        
        # Add evidence for each test
        for evidence in self.evidence:
            status_emoji = "✅" if evidence.status == "pass" else "❌" if evidence.status == "fail" else "⏭️"
            report_lines.append(f"### {status_emoji} {evidence.test_name}")
            report_lines.append("")
            report_lines.append(f"**Status:** {evidence.status}")
            report_lines.append(f"**Timestamp:** {evidence.timestamp}")
            report_lines.append("")
            report_lines.append("**Details:**")
            report_lines.append("```json")
            report_lines.append(json.dumps(evidence.details, indent=2))
            report_lines.append("```")
            report_lines.append("")
            
            if evidence.logs:
                report_lines.append("**Logs:**")
                report_lines.append("```")
                for log in evidence.logs[:10]:  # Limit to 10 logs
                    report_lines.append(log)
                report_lines.append("```")
                report_lines.append("")
        
        # Add manual test procedures
        report_lines.extend([
            "## Manual Testing Required",
            "",
            "The following tests require manual execution:",
            "",
            "### /debug-last Command Validation",
            "",
            "1. Execute `/diagnose` command in staging Discord channel",
            "2. Immediately execute `/debug-last`",
            "3. Verify:",
            "   - Response is ephemeral (only visible to you)",
            "   - Trace ID present and matches CloudWatch logs",
            "   - Steps and timings displayed",
            "   - Secrets redacted (last 4 chars visible)",
            "   - Output length < 1900 chars",
            "",
            "### Alerts Validation",
            "",
            "1. Ensure `ENABLE_ALERTS=true` and `ALERT_CHANNEL_ID` is set",
            "2. Trigger a controlled failure",
            "3. Verify alert posted with correct format",
            "4. Trigger same failure again within 5 minutes",
            "5. Verify second alert is rate-limited",
            "6. Wait 6 minutes and trigger again",
            "7. Verify third alert is posted (dedupe expired)",
            "",
            "## Next Steps",
            "",
            "1. Review this report and evidence",
            "2. Complete manual testing procedures",
            "3. Update PHASE5_VALIDATION.md with staging evidence",
            "4. Create executive summary for stakeholders",
            "5. Sign off on staging validation",
            ""
        ])
        
        report = "\n".join(report_lines)
        
        # Save report to file
        report_file = os.path.join(self.config.evidence_output_dir, 
                                   f"validation_report_{self.correlation_id}.md")
        with open(report_file, 'w') as f:
            f.write(report)
        
        self._log("info", f"Validation report saved to {report_file}")
        
        return report
    
    # ============================================
    # High-Level Validation Flows
    # ============================================
    
    def run_full_validation(self) -> bool:
        """Run complete Phase 5 staging validation"""
        self._log("info", "Starting full Phase 5 staging validation",
                 correlation_id=self.correlation_id)
        
        try:
            # Step 1: Preflight checks
            if not self.preflight_checks():
                self._log("error", "Preflight checks failed, aborting validation")
                return False
            
            # Step 2: Enable debug command
            if self.config.enable_debug_cmd:
                if not self.enable_debug_command():
                    self._log("error", "Failed to enable debug command")
                    return False
                
                # Wait for propagation
                time.sleep(10)
                
                # Validate debug command
                self.validate_debug_last()
            
            # Step 3: Prepare for alerts (disable first)
            self.disable_alerts()
            time.sleep(5)
            
            # Step 4: Enable alerts
            if self.config.test_channel_id:
                if not self.enable_alerts(self.config.test_channel_id):
                    self._log("error", "Failed to enable alerts")
                    return False
                
                # Wait for propagation
                time.sleep(10)
                
                # Validate alerts
                self.validate_alerts()
            
            # Step 5: Collect evidence
            self.collect_cloudwatch_logs()
            
            # Step 6: Generate report
            report = self.generate_validation_report()
            print("\n" + "="*80)
            print(report)
            print("="*80 + "\n")
            
            self._log("info", "Full validation completed",
                     passed=self.test_results["passed"],
                     failed=self.test_results["failed"],
                     skipped=self.test_results["skipped"])
            
            return self.test_results["failed"] == 0
        
        except Exception as e:
            self._log("error", f"Validation failed with error: {str(e)}")
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Phase 5 Staging Validator and Flag Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run preflight checks
  python phase5_staging_validator.py preflight --config config.json
  
  # Enable debug command
  python phase5_staging_validator.py enable-debug --config config.json
  
  # Enable alerts
  python phase5_staging_validator.py enable-alerts --config config.json --channel-id CHANNEL_ID
  
  # Run full validation
  python phase5_staging_validator.py full-validation --config config.json
  
  # Generate example config
  python phase5_staging_validator.py generate-config --output config.json
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Preflight command
    preflight_parser = subparsers.add_parser("preflight", help="Run preflight checks")
    preflight_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    
    # Enable debug command
    enable_debug_parser = subparsers.add_parser("enable-debug", help="Enable debug command")
    enable_debug_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    
    # Enable alerts command
    enable_alerts_parser = subparsers.add_parser("enable-alerts", help="Enable alerts")
    enable_alerts_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    enable_alerts_parser.add_argument("--channel-id", help="Alert channel ID (overrides config)")
    
    # Disable alerts command
    disable_alerts_parser = subparsers.add_parser("disable-alerts", help="Disable alerts")
    disable_alerts_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    
    # Validate debug command
    validate_debug_parser = subparsers.add_parser("validate-debug", 
                                                   help="Validate /debug-last command")
    validate_debug_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    
    # Validate alerts command
    validate_alerts_parser = subparsers.add_parser("validate-alerts", 
                                                    help="Validate alerts")
    validate_alerts_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    
    # Collect logs command
    collect_logs_parser = subparsers.add_parser("collect-logs", help="Collect CloudWatch logs")
    collect_logs_parser.add_argument("--config", required=True, help="Configuration file (JSON)")
    collect_logs_parser.add_argument("--trace-id", help="Specific trace ID to collect")
    
    # Full validation command
    full_validation_parser = subparsers.add_parser("full-validation", 
                                                    help="Run full validation")
    full_validation_parser.add_argument("--config", required=True, 
                                        help="Configuration file (JSON)")
    
    # Generate config command
    generate_config_parser = subparsers.add_parser("generate-config", 
                                                    help="Generate example config")
    generate_config_parser.add_argument("--output", default="config.example.json",
                                        help="Output file path")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Generate config command
    if args.command == "generate-config":
        example_config = {
            "staging_deploy_method": "aws_parameter_store",
            "aws_region": "us-west-2",
            "staging_lambda_discord": "valine-orchestrator-discord-staging",
            "staging_lambda_github": "valine-orchestrator-github-staging",
            "staging_api_endpoint": "https://api.staging.example.com",
            "test_channel_id": "STAGING_CHANNEL_ID",
            "test_user_id": "TEST_USER_ID",
            "discord_bot_token": "ENV:DISCORD_BOT_TOKEN",
            "github_repo": "gcolon75/Project-Valine",
            "github_token": "ENV:GITHUB_TOKEN",
            "enable_debug_cmd": True,
            "enable_alerts": False,
            "alert_channel_id": "STAGING_ALERT_CHANNEL_ID",
            "log_group_discord": "/aws/lambda/valine-orchestrator-discord-staging",
            "log_group_github": "/aws/lambda/valine-orchestrator-github-staging",
            "correlation_id_prefix": "STG",
            "evidence_output_dir": "./validation_evidence"
        }
        
        with open(args.output, 'w') as f:
            json.dump(example_config, f, indent=2)
        
        print(f"Example configuration saved to {args.output}")
        print("\nEdit this file with your actual values before running validation.")
        sys.exit(0)
    
    # Load configuration
    try:
        config = ValidationConfig.from_file(args.config)
    except FileNotFoundError:
        print(f"Error: Configuration file not found: {args.config}")
        print("\nGenerate an example config with:")
        print(f"  python {sys.argv[0]} generate-config --output {args.config}")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading configuration: {str(e)}")
        sys.exit(1)
    
    # Create validator
    validator = Phase5StagingValidator(config)
    
    # Execute command
    success = False
    
    if args.command == "preflight":
        success = validator.preflight_checks()
    
    elif args.command == "enable-debug":
        success = validator.enable_debug_command()
    
    elif args.command == "enable-alerts":
        channel_id = args.channel_id or config.test_channel_id
        if not channel_id:
            print("Error: --channel-id required")
            sys.exit(1)
        success = validator.enable_alerts(channel_id)
    
    elif args.command == "disable-alerts":
        success = validator.disable_alerts()
    
    elif args.command == "validate-debug":
        success = validator.validate_debug_last()
    
    elif args.command == "validate-alerts":
        success = validator.validate_alerts()
    
    elif args.command == "collect-logs":
        logs = validator.collect_cloudwatch_logs(args.trace_id)
        print(f"\nCollected {len(logs)} log entries:")
        for log in logs:
            print(log)
        success = True
    
    elif args.command == "full-validation":
        success = validator.run_full_validation()
    
    # Generate final report
    if args.command != "generate-config":
        report = validator.generate_validation_report()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
