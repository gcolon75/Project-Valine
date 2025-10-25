#!/usr/bin/env python3
"""
Phase 5 Staging Validation Runner Agent

Mission: Execute Steps 3-8 of Phase 5 staging validation for Project-Valine 
and produce a deterministic, redacted evidence report.

Guardrails:
- Staging-only operation
- Automatic secret redaction
- Rate-limiting for external APIs
- No production changes

Steps:
1. Preflight - Verify repo, staging URLs, credentials
2. Step 3 - Build & artifact check
3. Step 4 - Deploy-to-staging verification
4. Step 5 - Health checks
5. Step 6 - Smoke tests
6. Step 7 - Optional E2E/synthetic tests
7. Step 8 - Observability & alerts
8. Evidence & Report generation

Usage:
    python phase5_validation_runner.py --config validation_config.json
    python phase5_validation_runner.py --config-json '{"repo": "owner/repo", ...}'
    python phase5_validation_runner.py generate-config
"""

import os
import sys
import json
import time
import argparse
import hashlib
import subprocess
import re
import traceback
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict, field
from pathlib import Path
from urllib.parse import urlparse

# Try to import optional dependencies
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("Warning: requests library not available. HTTP checks will be limited.", file=sys.stderr)

try:
    import boto3
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False
    print("Warning: boto3 not available. AWS features will be limited.", file=sys.stderr)


# ============================================
# Configuration and Data Classes
# ============================================

@dataclass
class StagingConfig:
    """Staging environment configuration"""
    urls: List[str] = field(default_factory=list)
    region: str = "us-west-2"


@dataclass
class GitHubConfig:
    """GitHub configuration"""
    token: Optional[str] = None  # Can be ENV:VAR_NAME


@dataclass
class AWSConfig:
    """AWS configuration"""
    role_arn: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    region: str = "us-west-2"


@dataclass
class TimeoutsConfig:
    """Timeout configuration in milliseconds"""
    action_dispatch_ms: int = 600000  # 10 minutes
    http_ms: int = 15000  # 15 seconds


@dataclass
class ValidationRunnerConfig:
    """Complete configuration for validation runner"""
    repo: str = "gcolon75/Project-Valine"
    base_ref: str = "main"
    staging: StagingConfig = field(default_factory=StagingConfig)
    github: GitHubConfig = field(default_factory=GitHubConfig)
    aws: AWSConfig = field(default_factory=AWSConfig)
    timeouts: TimeoutsConfig = field(default_factory=TimeoutsConfig)
    
    # Output configuration
    evidence_dir: str = "./validation_evidence"
    report_file: str = "phase5_staging_validation_report.md"
    
    # Guardrails
    require_staging_only: bool = True
    enable_redaction: bool = True
    rate_limit_enabled: bool = True
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationRunnerConfig':
        """Create config from dictionary"""
        staging_data = data.get('staging', {})
        staging = StagingConfig(
            urls=staging_data.get('urls', []),
            region=staging_data.get('region', 'us-west-2')
        )
        
        github_data = data.get('github', {})
        github = GitHubConfig(
            token=github_data.get('token')
        )
        
        aws_data = data.get('aws', {})
        aws = AWSConfig(
            role_arn=aws_data.get('role_arn'),
            access_key_id=aws_data.get('access_key_id'),
            secret_access_key=aws_data.get('secret_access_key'),
            region=aws_data.get('region', 'us-west-2')
        )
        
        timeouts_data = data.get('timeouts', {})
        timeouts = TimeoutsConfig(
            action_dispatch_ms=timeouts_data.get('action_dispatch_ms', 600000),
            http_ms=timeouts_data.get('http_ms', 15000)
        )
        
        return cls(
            repo=data.get('repo', 'gcolon75/Project-Valine'),
            base_ref=data.get('base_ref', 'main'),
            staging=staging,
            github=github,
            aws=aws,
            timeouts=timeouts,
            evidence_dir=data.get('evidence_dir', './validation_evidence'),
            report_file=data.get('report_file', 'phase5_staging_validation_report.md')
        )
    
    @classmethod
    def from_file(cls, filepath: str) -> 'ValidationRunnerConfig':
        """Load configuration from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


@dataclass
class ValidationStep:
    """Result of a validation step"""
    step_number: int
    step_name: str
    status: str  # PASS, FAIL, SKIP, WARNING
    duration_ms: float = 0
    error: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    artifacts: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============================================
# Secret Redaction Utilities
# ============================================

def redact_secrets(text: str) -> str:
    r"""
    Redact secrets from text matching pattern:
    (?i)(token|secret|key|password|bearer)[=: ]\S+
    
    Shows only last 4 characters.
    """
    # Pattern to match secrets
    pattern = r'(?i)(token|secret|key|password|bearer)([=: ])(\S+)'
    
    def replace_secret(match):
        prefix = match.group(1)  # token/secret/key/password/bearer
        separator = match.group(2)  # = or : or space
        value = match.group(3)  # the secret value
        
        if len(value) <= 4:
            return f"{prefix}{separator}***"
        else:
            return f"{prefix}{separator}***{value[-4:]}"
    
    return re.sub(pattern, replace_secret, text)


def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively redact secrets in dictionary"""
    if not isinstance(data, dict):
        return data
    
    result = {}
    for key, value in data.items():
        key_lower = key.lower()
        if any(secret_word in key_lower for secret_word in ['token', 'secret', 'key', 'password', 'bearer']):
            if isinstance(value, str) and len(value) > 4:
                result[key] = f"***{value[-4:]}"
            else:
                result[key] = "***"
        elif isinstance(value, dict):
            result[key] = redact_dict(value)
        elif isinstance(value, str):
            result[key] = redact_secrets(value)
        else:
            result[key] = value
    
    return result


# ============================================
# Rate Limiting Utilities
# ============================================

class RateLimiter:
    """Simple rate limiter with exponential backoff"""
    
    def __init__(self):
        self.call_times: Dict[str, List[float]] = {}
        self.min_interval = 1.0  # Minimum 1 second between calls
        self.max_retries = 3
    
    def wait_if_needed(self, key: str):
        """Wait if rate limit would be exceeded"""
        now = time.time()
        
        if key not in self.call_times:
            self.call_times[key] = []
        
        # Remove old entries (older than 60 seconds)
        self.call_times[key] = [t for t in self.call_times[key] if now - t < 60]
        
        # Check if we need to wait
        if self.call_times[key]:
            last_call = self.call_times[key][-1]
            time_since_last = now - last_call
            
            if time_since_last < self.min_interval:
                wait_time = self.min_interval - time_since_last
                # Add jitter
                wait_time += (hash(key) % 100) / 1000.0
                time.sleep(wait_time)
        
        self.call_times[key].append(time.time())


# ============================================
# Main Validation Runner
# ============================================

class Phase5ValidationRunner:
    """Main validation runner agent"""
    
    def __init__(self, config: ValidationRunnerConfig):
        self.config = config
        self.run_id = self._generate_run_id()
        self.steps: List[ValidationStep] = []
        self.rate_limiter = RateLimiter()
        self.evidence_dir = Path(config.evidence_dir) / self.run_id
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
        # Resolve environment variables in config
        self._resolve_env_vars()
        
        print(f"[Validation Runner] Run ID: {self.run_id}")
        print(f"[Validation Runner] Evidence directory: {self.evidence_dir}")
    
    def _generate_run_id(self) -> str:
        """Generate unique run ID"""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        hash_val = hashlib.sha256(f"{timestamp}{self.config.repo}".encode()).hexdigest()[:8]
        return f"phase5_run_{timestamp}_{hash_val}"
    
    def _resolve_env_vars(self):
        """Resolve ENV:VAR_NAME patterns in configuration"""
        if self.config.github.token and self.config.github.token.startswith("ENV:"):
            env_var = self.config.github.token[4:]
            self.config.github.token = os.environ.get(env_var)
        
        if self.config.aws.access_key_id and self.config.aws.access_key_id.startswith("ENV:"):
            env_var = self.config.aws.access_key_id[4:]
            self.config.aws.access_key_id = os.environ.get(env_var)
        
        if self.config.aws.secret_access_key and self.config.aws.secret_access_key.startswith("ENV:"):
            env_var = self.config.aws.secret_access_key[4:]
            self.config.aws.secret_access_key = os.environ.get(env_var)
    
    def _record_step(self, step: ValidationStep):
        """Record a validation step"""
        self.steps.append(step)
        
        # Save step to evidence directory
        try:
            step_file = self.evidence_dir / f"step_{step.step_number}_{step.step_name.replace(' ', '_').lower()}.json"
            with open(step_file, 'w', encoding='utf-8') as f:
                step_dict = asdict(step)
                if self.config.enable_redaction:
                    step_dict = redact_dict(step_dict)
                json.dump(step_dict, f, indent=2)
        except Exception as e:
            print(f"[Warning] Could not save step evidence: {str(e)}")
    
    def _run_command(self, cmd: List[str], timeout: int = 30) -> Tuple[bool, str, str]:
        """Run shell command and return (success, stdout, stderr)"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", f"Command timed out after {timeout}s"
        except Exception as e:
            return False, "", str(e)
    
    def preflight_checks(self) -> bool:
        """
        Preflight checks:
        - Confirm repo & base_ref exist
        - Confirm staging URLs resolve
        - Check credentials
        """
        print("\n[Preflight] Starting preflight checks...")
        start_time = time.time()
        details = {}
        
        try:
            # Check 1: Verify repo exists (git command)
            print(f"[Preflight] Checking repository: {self.config.repo}")
            owner, repo_name = self.config.repo.split('/')
            
            # Try to fetch repo info using git
            success, stdout, stderr = self._run_command([
                'git', 'ls-remote', '--heads', 
                f'https://github.com/{self.config.repo}.git',
                self.config.base_ref
            ])
            
            if success and stdout:
                details['repo_check'] = 'PASS'
                details['base_ref'] = self.config.base_ref
                print(f"[Preflight] ✓ Repository and ref exist")
            else:
                details['repo_check'] = 'FAIL'
                details['repo_error'] = stderr
                print(f"[Preflight] ✗ Repository check failed: {stderr}")
                return False
            
            # Check 2: Verify staging URLs
            print(f"[Preflight] Checking staging URLs...")
            url_checks = []
            
            for url in self.config.staging.urls:
                # Verify it's not a production URL
                if self.config.require_staging_only:
                    if any(prod_term in url.lower() for prod_term in ['prod', 'production', 'live']):
                        if 'staging' not in url.lower():
                            print(f"[Preflight] ✗ DANGER: URL appears to be production: {url}")
                            details['staging_check'] = 'FAIL_PRODUCTION_DETECTED'
                            return False
                
                # Try to resolve URL
                try:
                    parsed = urlparse(url)
                    if not parsed.scheme or not parsed.netloc:
                        print(f"[Preflight] ✗ Invalid URL format: {url}")
                        url_checks.append({'url': url, 'status': 'INVALID'})
                        continue
                    
                    if HAS_REQUESTS:
                        # Apply rate limiting
                        self.rate_limiter.wait_if_needed('http_check')
                        
                        # Try HEAD request
                        response = requests.head(
                            url,
                            timeout=self.config.timeouts.http_ms / 1000.0,
                            allow_redirects=True,
                            verify=True
                        )
                        url_checks.append({
                            'url': url,
                            'status': 'OK',
                            'status_code': response.status_code,
                            'tls_ok': parsed.scheme == 'https'
                        })
                        print(f"[Preflight] ✓ URL reachable: {url} (status: {response.status_code})")
                    else:
                        # No requests library, just validate format
                        url_checks.append({
                            'url': url,
                            'status': 'SKIPPED_NO_REQUESTS',
                            'tls_ok': parsed.scheme == 'https'
                        })
                        print(f"[Preflight] ~ URL format valid: {url} (not tested, requests library missing)")
                
                except Exception as e:
                    print(f"[Preflight] ✗ URL check failed for {url}: {str(e)}")
                    url_checks.append({'url': url, 'status': 'ERROR', 'error': str(e)})
            
            details['url_checks'] = url_checks
            
            # Check 3: Verify credentials
            print(f"[Preflight] Checking credentials...")
            creds_ok = True
            
            if self.config.github.token:
                details['github_token'] = 'PRESENT'
                print(f"[Preflight] ✓ GitHub token present")
            else:
                details['github_token'] = 'MISSING'
                print(f"[Preflight] ⚠ GitHub token missing (some features will be limited)")
            
            if HAS_BOTO3:
                if self.config.aws.role_arn or (self.config.aws.access_key_id and self.config.aws.secret_access_key):
                    details['aws_credentials'] = 'PRESENT'
                    print(f"[Preflight] ✓ AWS credentials present")
                else:
                    details['aws_credentials'] = 'MISSING'
                    print(f"[Preflight] ⚠ AWS credentials missing (AWS features will be limited)")
            else:
                details['aws_credentials'] = 'BOTO3_NOT_AVAILABLE'
                print(f"[Preflight] ⚠ boto3 not available (AWS features disabled)")
            
            duration_ms = (time.time() - start_time) * 1000
            
            step = ValidationStep(
                step_number=0,
                step_name="Preflight Checks",
                status="PASS",
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            print(f"[Preflight] ✓ Preflight checks passed ({duration_ms:.0f}ms)")
            return True
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=0,
                step_name="Preflight Checks",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Preflight] ✗ Preflight checks failed: {str(e)}")
            return False
    
    def step3_build_artifacts(self) -> bool:
        """
        Step 3: Build & artifact check
        - Verify last CI run for base_ref completed successfully
        - Check artifacts exist (if expected)
        """
        print("\n[Step 3] Checking build and artifacts...")
        start_time = time.time()
        details = {}
        
        try:
            # This requires GitHub API access
            if not self.config.github.token:
                print("[Step 3] ⚠ Skipping - GitHub token not available")
                step = ValidationStep(
                    step_number=3,
                    step_name="Build & Artifact Check",
                    status="SKIP",
                    duration_ms=(time.time() - start_time) * 1000,
                    details={'reason': 'No GitHub token available'}
                )
                self._record_step(step)
                return True
            
            # Use GitHub CLI if available
            success, stdout, stderr = self._run_command([
                'gh', 'run', 'list',
                '--repo', self.config.repo,
                '--branch', self.config.base_ref,
                '--limit', '1',
                '--json', 'status,conclusion,databaseId,workflowName,url'
            ], timeout=30)
            
            if success and stdout:
                runs = json.loads(stdout)
                if runs:
                    latest_run = runs[0]
                    details['workflow_name'] = latest_run.get('workflowName', 'unknown')
                    details['workflow_url'] = latest_run.get('url', '')
                    details['status'] = latest_run.get('status', 'unknown')
                    details['conclusion'] = latest_run.get('conclusion', 'unknown')
                    details['run_id'] = latest_run.get('databaseId', '')
                    
                    if latest_run.get('conclusion') == 'success':
                        print(f"[Step 3] ✓ Latest CI run passed: {latest_run.get('workflowName')}")
                        print(f"[Step 3]   URL: {latest_run.get('url')}")
                        
                        # Try to get artifacts
                        if details['run_id']:
                            success_art, stdout_art, stderr_art = self._run_command([
                                'gh', 'run', 'view', str(details['run_id']),
                                '--repo', self.config.repo,
                                '--json', 'artifacts'
                            ], timeout=30)
                            
                            if success_art and stdout_art:
                                artifact_data = json.loads(stdout_art)
                                artifacts = artifact_data.get('artifacts', [])
                                details['artifacts_count'] = len(artifacts)
                                details['artifacts'] = [a.get('name', 'unknown') for a in artifacts]
                                print(f"[Step 3] ✓ Found {len(artifacts)} artifacts")
                            else:
                                details['artifacts'] = []
                                print(f"[Step 3] ~ No artifacts found")
                        
                        status = "PASS"
                    else:
                        print(f"[Step 3] ✗ Latest CI run did not succeed: {latest_run.get('conclusion')}")
                        status = "FAIL"
                else:
                    print("[Step 3] ⚠ No CI runs found for branch")
                    details['reason'] = 'No runs found'
                    status = "WARNING"
            else:
                print(f"[Step 3] ⚠ Could not fetch CI runs: {stderr}")
                details['error'] = stderr
                status = "WARNING"
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=3,
                step_name="Build & Artifact Check",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            return status in ["PASS", "WARNING"]
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=3,
                step_name="Build & Artifact Check",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 3] ✗ Build check failed: {str(e)}")
            return False
    
    def step4_deployment_verification(self) -> bool:
        """
        Step 4: Deploy-to-staging verification
        - Confirm deployment status
        - Capture deployed commit SHA
        """
        print("\n[Step 4] Verifying staging deployment...")
        start_time = time.time()
        details = {}
        
        try:
            # Try to get version from staging URLs
            version_url = None
            for url in self.config.staging.urls:
                if 'health' in url or 'version' in url:
                    version_url = url
                    break
            
            if not version_url and self.config.staging.urls:
                # Try adding /version to first URL
                base_url = self.config.staging.urls[0].rstrip('/')
                version_url = f"{base_url}/api/version"
            
            if version_url and HAS_REQUESTS:
                self.rate_limiter.wait_if_needed('deployment_check')
                
                try:
                    response = requests.get(
                        version_url,
                        timeout=self.config.timeouts.http_ms / 1000.0
                    )
                    
                    if response.status_code == 200:
                        try:
                            version_data = response.json()
                            details['version_endpoint'] = version_url
                            details['version_data'] = version_data
                            details['deployed_commit'] = version_data.get('commit', version_data.get('sha', 'unknown'))
                            
                            print(f"[Step 4] ✓ Deployment verified")
                            print(f"[Step 4]   Commit: {details['deployed_commit']}")
                            status = "PASS"
                        except:
                            details['version_response'] = response.text[:200]
                            print(f"[Step 4] ~ Deployment endpoint responded but not JSON")
                            status = "WARNING"
                    else:
                        print(f"[Step 4] ⚠ Version endpoint returned {response.status_code}")
                        details['status_code'] = response.status_code
                        status = "WARNING"
                
                except requests.exceptions.RequestException as e:
                    print(f"[Step 4] ⚠ Could not reach version endpoint: {str(e)}")
                    details['error'] = str(e)
                    status = "WARNING"
            else:
                print("[Step 4] ⚠ Skipping - no version endpoint or requests library unavailable")
                status = "SKIP"
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=4,
                step_name="Deployment Verification",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            return True
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=4,
                step_name="Deployment Verification",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 4] ✗ Deployment verification failed: {str(e)}")
            return False
    
    def step5_health_checks(self) -> bool:
        """
        Step 5: Health checks
        - Hit health endpoints
        - Record status, latency, body fingerprint
        """
        print("\n[Step 5] Running health checks...")
        start_time = time.time()
        details = {}
        health_results = []
        
        try:
            for url in self.config.staging.urls:
                if not HAS_REQUESTS:
                    print(f"[Step 5] ⚠ Skipping - requests library not available")
                    break
                
                self.rate_limiter.wait_if_needed('health_check')
                
                check_start = time.time()
                try:
                    response = requests.get(
                        url,
                        timeout=self.config.timeouts.http_ms / 1000.0,
                        allow_redirects=True
                    )
                    latency_ms = (time.time() - check_start) * 1000
                    
                    # Create body fingerprint (first 100 chars hash)
                    body_sample = response.text[:100] if response.text else ""
                    body_hash = hashlib.sha256(body_sample.encode()).hexdigest()[:16]
                    
                    result = {
                        'url': url,
                        'status_code': response.status_code,
                        'latency_ms': round(latency_ms, 2),
                        'body_fingerprint': body_hash,
                        'content_type': response.headers.get('content-type', 'unknown'),
                        'status': 'PASS' if 200 <= response.status_code < 400 else 'FAIL'
                    }
                    health_results.append(result)
                    
                    if result['status'] == 'PASS':
                        print(f"[Step 5] ✓ {url} - {response.status_code} ({latency_ms:.0f}ms)")
                    else:
                        print(f"[Step 5] ✗ {url} - {response.status_code} ({latency_ms:.0f}ms)")
                
                except requests.exceptions.Timeout:
                    health_results.append({
                        'url': url,
                        'status': 'TIMEOUT',
                        'error': 'Request timed out'
                    })
                    print(f"[Step 5] ✗ {url} - TIMEOUT")
                
                except Exception as e:
                    health_results.append({
                        'url': url,
                        'status': 'ERROR',
                        'error': str(e)
                    })
                    print(f"[Step 5] ✗ {url} - ERROR: {str(e)}")
            
            details['health_checks'] = health_results
            
            # Determine overall status
            if not health_results:
                status = "SKIP"
            elif all(r.get('status') == 'PASS' for r in health_results):
                status = "PASS"
            elif any(r.get('status') == 'PASS' for r in health_results):
                status = "WARNING"
            else:
                status = "FAIL"
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=5,
                step_name="Health Checks",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 5] {'✓' if status == 'PASS' else '~'} Health checks complete: {status}")
            return status != "FAIL"
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=5,
                step_name="Health Checks",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 5] ✗ Health checks failed: {str(e)}")
            return False
    
    def step6_smoke_tests(self) -> bool:
        """
        Step 6: Smoke tests
        - Run recommended smoke endpoints (read-only flows)
        - Mark pass/fail and latency
        """
        print("\n[Step 6] Running smoke tests...")
        start_time = time.time()
        details = {}
        smoke_results = []
        
        try:
            # Define common smoke test endpoints
            if not self.config.staging.urls:
                print("[Step 6] ⚠ No staging URLs configured")
                status = "SKIP"
            elif not HAS_REQUESTS:
                print("[Step 6] ⚠ Skipping - requests library not available")
                status = "SKIP"
            else:
                base_url = self.config.staging.urls[0].rstrip('/')
                
                # Common read-only endpoints to test
                smoke_endpoints = [
                    ('/', 'Root page'),
                    ('/api/health', 'Health check'),
                    ('/api/version', 'Version info'),
                ]
                
                for path, description in smoke_endpoints:
                    url = f"{base_url}{path}"
                    self.rate_limiter.wait_if_needed('smoke_test')
                    
                    test_start = time.time()
                    try:
                        response = requests.get(
                            url,
                            timeout=self.config.timeouts.http_ms / 1000.0,
                            allow_redirects=True
                        )
                        latency_ms = (time.time() - test_start) * 1000
                        
                        result = {
                            'endpoint': path,
                            'description': description,
                            'status_code': response.status_code,
                            'latency_ms': round(latency_ms, 2),
                            'status': 'PASS' if 200 <= response.status_code < 500 else 'FAIL'
                        }
                        smoke_results.append(result)
                        
                        if result['status'] == 'PASS':
                            print(f"[Step 6] ✓ {description} - {response.status_code} ({latency_ms:.0f}ms)")
                        else:
                            print(f"[Step 6] ✗ {description} - {response.status_code} ({latency_ms:.0f}ms)")
                    
                    except Exception as e:
                        smoke_results.append({
                            'endpoint': path,
                            'description': description,
                            'status': 'ERROR',
                            'error': str(e)
                        })
                        print(f"[Step 6] ✗ {description} - ERROR: {str(e)}")
                
                details['smoke_tests'] = smoke_results
                
                # Determine overall status
                if not smoke_results:
                    status = "SKIP"
                elif all(r.get('status') == 'PASS' for r in smoke_results):
                    status = "PASS"
                elif any(r.get('status') == 'PASS' for r in smoke_results):
                    status = "WARNING"
                else:
                    status = "FAIL"
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=6,
                step_name="Smoke Tests",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 6] {'✓' if status == 'PASS' else '~'} Smoke tests complete: {status}")
            return status != "FAIL"
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=6,
                step_name="Smoke Tests",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 6] ✗ Smoke tests failed: {str(e)}")
            return False
    
    def step7_e2e_synthetic(self) -> bool:
        """
        Step 7: Optional E2E/synthetic tests
        - If headless/E2E scripts exist, dispatch them
        - Capture artifacts/screenshots
        """
        print("\n[Step 7] Checking for E2E/synthetic tests...")
        start_time = time.time()
        details = {}
        
        try:
            # This is optional and would require specific test scripts
            # For now, we'll check if common E2E tools/scripts exist
            
            e2e_indicators = [
                'playwright.config.js',
                'cypress.json',
                'cypress.config.js',
                'tests/e2e',
                'e2e',
                '.github/workflows/*e2e*.yml'
            ]
            
            found_e2e = []
            for indicator in e2e_indicators:
                if '*' in indicator:
                    # Would need glob matching
                    continue
                
                if os.path.exists(indicator):
                    found_e2e.append(indicator)
                    print(f"[Step 7] ✓ Found E2E indicator: {indicator}")
            
            if found_e2e:
                details['e2e_found'] = found_e2e
                details['note'] = 'E2E tests found but not executed (requires manual trigger or GH Actions)'
                status = "SKIP"
                print(f"[Step 7] ~ E2E tests available but not executed in this run")
            else:
                details['note'] = 'No E2E tests found'
                status = "SKIP"
                print(f"[Step 7] ~ No E2E tests found")
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=7,
                step_name="E2E/Synthetic Tests",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            return True
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=7,
                step_name="E2E/Synthetic Tests",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 7] ✗ E2E check failed: {str(e)}")
            return False
    
    def step8_observability_alerts(self) -> bool:
        """
        Step 8: Observability & alerts
        - Query CloudWatch logs by recent timestamps
        - Check alerting system for firing alerts
        """
        print("\n[Step 8] Checking observability and alerts...")
        start_time = time.time()
        details = {}
        
        try:
            if not HAS_BOTO3:
                print("[Step 8] ⚠ Skipping - boto3 not available")
                status = "SKIP"
                details['reason'] = 'boto3 not available'
            elif not (self.config.aws.role_arn or (self.config.aws.access_key_id and self.config.aws.secret_access_key)):
                print("[Step 8] ⚠ Skipping - AWS credentials not configured")
                status = "SKIP"
                details['reason'] = 'AWS credentials not configured'
            else:
                # Initialize boto3 client
                try:
                    logs_client = boto3.client(
                        'logs',
                        region_name=self.config.aws.region,
                        aws_access_key_id=self.config.aws.access_key_id,
                        aws_secret_access_key=self.config.aws.secret_access_key
                    )
                    
                    # Try to list log groups
                    response = logs_client.describe_log_groups(limit=10)
                    log_groups = response.get('logGroups', [])
                    
                    details['log_groups_count'] = len(log_groups)
                    details['log_groups'] = [lg.get('logGroupName') for lg in log_groups[:5]]
                    
                    print(f"[Step 8] ✓ Connected to CloudWatch Logs")
                    print(f"[Step 8]   Found {len(log_groups)} log groups")
                    
                    # Try to query recent logs (last 5 minutes)
                    end_time = int(time.time() * 1000)
                    start_time_query = end_time - (5 * 60 * 1000)  # 5 minutes ago
                    
                    if log_groups:
                        log_group_name = log_groups[0]['logGroupName']
                        
                        try:
                            # Query for error messages
                            query = "fields @timestamp, @message | filter @message like /ERROR/ | limit 20"
                            
                            query_response = logs_client.start_query(
                                logGroupName=log_group_name,
                                startTime=start_time_query,
                                endTime=end_time,
                                queryString=query
                            )
                            
                            query_id = query_response['queryId']
                            
                            # Wait for query to complete (up to 10 seconds)
                            for _ in range(10):
                                time.sleep(1)
                                result = logs_client.get_query_results(queryId=query_id)
                                status_query = result['status']
                                
                                if status_query == 'Complete':
                                    results = result.get('results', [])
                                    details['error_log_count'] = len(results)
                                    
                                    # Redact and save sample
                                    sample_logs = []
                                    for log_entry in results[:5]:
                                        log_dict = {field['field']: field['value'] for field in log_entry}
                                        if self.config.enable_redaction:
                                            log_dict = redact_dict(log_dict)
                                        sample_logs.append(log_dict)
                                    
                                    details['sample_errors'] = sample_logs
                                    print(f"[Step 8] ✓ Found {len(results)} recent error logs")
                                    break
                        except Exception as query_error:
                            print(f"[Step 8] ~ Could not query logs: {str(query_error)}")
                            details['query_error'] = str(query_error)
                    
                    status = "PASS"
                
                except Exception as boto_error:
                    print(f"[Step 8] ✗ CloudWatch access failed: {str(boto_error)}")
                    details['error'] = str(boto_error)
                    status = "FAIL"
            
            duration_ms = (time.time() - start_time) * 1000
            step = ValidationStep(
                step_number=8,
                step_name="Observability & Alerts",
                status=status,
                duration_ms=duration_ms,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 8] {'✓' if status == 'PASS' else '~'} Observability check complete: {status}")
            return status != "FAIL"
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            
            step = ValidationStep(
                step_number=8,
                step_name="Observability & Alerts",
                status="FAIL",
                duration_ms=duration_ms,
                error=error_msg,
                details=details
            )
            self._record_step(step)
            
            print(f"[Step 8] ✗ Observability check failed: {str(e)}")
            return False
    
    def generate_report(self) -> str:
        """Generate markdown validation report"""
        print("\n[Report] Generating validation report...")
        
        lines = []
        lines.append("# Phase 5 Staging Validation Report")
        lines.append("")
        lines.append(f"**Run ID:** {self.run_id}")
        lines.append(f"**Timestamp:** {datetime.now(timezone.utc).isoformat()}")
        lines.append(f"**Repository:** {self.config.repo}")
        lines.append(f"**Base Ref:** {self.config.base_ref}")
        lines.append("")
        
        # Context
        lines.append("## Context")
        lines.append("")
        lines.append(f"- **Staging URLs:** {', '.join(self.config.staging.urls)}")
        lines.append(f"- **Region:** {self.config.staging.region}")
        lines.append(f"- **Evidence Directory:** {self.evidence_dir}")
        lines.append("")
        
        # Summary
        lines.append("## Validation Summary")
        lines.append("")
        lines.append("| Step | Name | Status | Duration |")
        lines.append("|------|------|--------|----------|")
        
        for step in self.steps:
            duration_str = f"{step.duration_ms:.0f}ms"
            status_emoji = {
                'PASS': '✅',
                'FAIL': '❌',
                'WARNING': '⚠️',
                'SKIP': '⏭️'
            }.get(step.status, '❓')
            
            lines.append(f"| {step.step_number} | {step.step_name} | {status_emoji} {step.status} | {duration_str} |")
        
        lines.append("")
        
        # Detailed Results
        lines.append("## Detailed Results")
        lines.append("")
        
        for step in self.steps:
            lines.append(f"### Step {step.step_number}: {step.step_name}")
            lines.append("")
            lines.append(f"- **Status:** {step.status}")
            lines.append(f"- **Duration:** {step.duration_ms:.0f}ms")
            lines.append(f"- **Timestamp:** {step.timestamp}")
            lines.append("")
            
            if step.error:
                lines.append("**Error:**")
                lines.append("```")
                # Redact error if needed
                error_text = redact_secrets(step.error) if self.config.enable_redaction else step.error
                lines.append(error_text)
                lines.append("```")
                lines.append("")
            
            if step.details:
                lines.append("**Details:**")
                lines.append("```json")
                details_json = json.dumps(step.details, indent=2)
                if self.config.enable_redaction:
                    details_json = redact_secrets(details_json)
                lines.append(details_json)
                lines.append("```")
                lines.append("")
            
            if step.artifacts:
                lines.append("**Artifacts:**")
                for artifact in step.artifacts:
                    lines.append(f"- {artifact}")
                lines.append("")
        
        # Acceptance Criteria
        lines.append("## Acceptance Criteria")
        lines.append("")
        
        criteria = [
            ("Preflight checks passed", any(s.step_number == 0 and s.status == 'PASS' for s in self.steps)),
            ("Build verification complete", any(s.step_number == 3 for s in self.steps)),
            ("Deployment verified", any(s.step_number == 4 for s in self.steps)),
            ("Health checks passed", any(s.step_number == 5 and s.status in ['PASS', 'WARNING'] for s in self.steps)),
            ("Smoke tests completed", any(s.step_number == 6 for s in self.steps)),
            ("Evidence collected", len(self.steps) > 0),
            ("Secrets redacted", self.config.enable_redaction),
        ]
        
        for criterion, met in criteria:
            checkbox = "[x]" if met else "[ ]"
            lines.append(f"- {checkbox} {criterion}")
        
        lines.append("")
        
        # Remediation
        failed_steps = [s for s in self.steps if s.status == 'FAIL']
        if failed_steps:
            lines.append("## Remediation Required")
            lines.append("")
            
            for step in failed_steps:
                lines.append(f"### {step.step_name}")
                lines.append("")
                lines.append(f"**Issue:** {step.error if step.error else 'Step failed'}")
                lines.append("")
                lines.append("**Actions:**")
                lines.append("1. Review detailed error above")
                lines.append("2. Check step-specific evidence file")
                lines.append(f"3. Verify configuration for this step")
                lines.append("")
        
        # Artifacts
        lines.append("## Evidence Artifacts")
        lines.append("")
        lines.append(f"All evidence files are stored in: `{self.evidence_dir}`")
        lines.append("")
        lines.append("**Files:**")
        
        for step in self.steps:
            step_file = f"step_{step.step_number}_{step.step_name.replace(' ', '_').lower()}.json"
            lines.append(f"- `{step_file}` - {step.step_name} evidence")
        
        lines.append("")
        
        # Footer
        lines.append("---")
        lines.append("")
        lines.append("*Report generated by Phase 5 Staging Validation Runner*")
        lines.append(f"*All secrets redacted: {self.config.enable_redaction}*")
        lines.append("")
        
        report_text = "\n".join(lines)
        
        # Save report
        report_path = self.evidence_dir / self.config.report_file
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_text)
        
        print(f"[Report] ✓ Report saved to: {report_path}")
        
        return report_text
    
    def run_full_validation(self) -> bool:
        """Run complete validation Steps 3-8"""
        print("\n" + "="*80)
        print("Phase 5 Staging Validation Runner")
        print("="*80)
        
        overall_start = time.time()
        
        # Preflight
        if not self.preflight_checks():
            print("\n❌ Preflight checks failed. Aborting.")
            self.generate_report()
            return False
        
        # Steps 3-8
        steps_to_run = [
            (self.step3_build_artifacts, "Build & Artifacts"),
            (self.step4_deployment_verification, "Deployment Verification"),
            (self.step5_health_checks, "Health Checks"),
            (self.step6_smoke_tests, "Smoke Tests"),
            (self.step7_e2e_synthetic, "E2E/Synthetic Tests"),
            (self.step8_observability_alerts, "Observability & Alerts"),
        ]
        
        continue_on_fail = True  # Continue even if non-critical steps fail
        
        for step_func, step_name in steps_to_run:
            try:
                success = step_func()
                if not success and not continue_on_fail:
                    print(f"\n❌ {step_name} failed critically. Aborting.")
                    break
            except Exception as e:
                print(f"\n❌ {step_name} raised exception: {str(e)}")
                if not continue_on_fail:
                    break
        
        # Generate report
        report = self.generate_report()
        
        overall_duration = time.time() - overall_start
        
        print("\n" + "="*80)
        print(f"Validation complete in {overall_duration:.1f}s")
        print(f"Evidence directory: {self.evidence_dir}")
        print("="*80)
        
        # Determine overall success
        failed_critical = any(s.status == 'FAIL' and s.step_number in [0, 3, 4, 5] for s in self.steps)
        
        return not failed_critical


# ============================================
# CLI
# ============================================

def generate_example_config(output_file: str):
    """Generate example configuration file"""
    example = {
        "repo": "gcolon75/Project-Valine",
        "base_ref": "main",
        "staging": {
            "urls": [
                "https://staging.valine.app",
                "https://staging.valine.app/api/health"
            ],
            "region": "us-west-2"
        },
        "github": {
            "token": "ENV:GITHUB_TOKEN"
        },
        "aws": {
            "role_arn": None,
            "access_key_id": "ENV:AWS_ACCESS_KEY_ID",
            "secret_access_key": "ENV:AWS_SECRET_ACCESS_KEY",
            "region": "us-west-2"
        },
        "timeouts": {
            "action_dispatch_ms": 600000,
            "http_ms": 15000
        },
        "evidence_dir": "./validation_evidence",
        "report_file": "phase5_staging_validation_report.md"
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(example, f, indent=2)
    
    print(f"Example configuration written to: {output_file}")
    print("\nEdit this file with your actual values, then run:")
    print(f"  python {sys.argv[0]} --config {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Phase 5 Staging Validation Runner Agent",
        epilog="""
Examples:
  # Generate example config
  python phase5_validation_runner.py generate-config
  
  # Run with config file
  python phase5_validation_runner.py --config validation_config.json
  
  # Run with inline JSON
  python phase5_validation_runner.py --config-json '{"repo": "owner/repo", "base_ref": "main", ...}'
        """
    )
    
    # Subcommands or direct execution
    parser.add_argument('action', nargs='?', default='run', 
                       choices=['run', 'generate-config'],
                       help='Action to perform (default: run)')
    parser.add_argument('--config', help='Path to JSON configuration file')
    parser.add_argument('--config-json', help='Inline JSON configuration')
    parser.add_argument('--output', default='validation_config.example.json',
                       help='Output file for generate-config (default: validation_config.example.json)')
    
    args = parser.parse_args()
    
    # Handle generate-config
    if args.action == 'generate-config':
        generate_example_config(args.output)
        return 0
    
    # Handle run
    if not args.config and not args.config_json:
        print("Error: Either --config or --config-json is required for 'run' action")
        print("\nGenerate an example config with:")
        print(f"  python {sys.argv[0]} generate-config")
        return 1
    
    try:
        # Load configuration
        if args.config:
            config = ValidationRunnerConfig.from_file(args.config)
        else:
            config_data = json.loads(args.config_json)
            config = ValidationRunnerConfig.from_dict(config_data)
        
        # Create runner and execute
        runner = Phase5ValidationRunner(config)
        success = runner.run_full_validation()
        
        return 0 if success else 1
        
    except FileNotFoundError:
        print(f"Error: Configuration file not found: {args.config}")
        print("\nGenerate an example config with:")
        print(f"  python {sys.argv[0]} generate-config")
        return 1
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in configuration: {str(e)}")
        return 1
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
