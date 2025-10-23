"""
Message composer for Discord verification results.
Creates formatted one-liner summaries and detailed checklists.
"""
from config.verification_config import COLOR_SUCCESS, COLOR_FAILURE


class MessageComposer:
    """Composes Discord messages for deploy verification results."""

    def __init__(self):
        """Initialize message composer."""
        pass

    def compose_verification_message(self, run_info, frontend_results, api_results):
        """
        Compose complete verification message with one-liner and checklist.

        Args:
            run_info: Dictionary with GitHub Actions run information
            frontend_results: Dictionary with frontend check results
            api_results: Dictionary with API check results

        Returns:
            Dictionary with 'content' and 'embed' for Discord message
        """
        # Determine overall status
        all_success = self._is_all_success(run_info, frontend_results, api_results)

        # Compose one-liner
        one_liner = self._compose_one_liner(run_info, frontend_results, api_results, all_success)

        # Compose checklist
        checklist_lines = self._compose_checklist(run_info, frontend_results, api_results)

        # Compose actionable fixes if there are failures
        fixes = []
        if not all_success:
            fixes = self._compose_fixes(run_info, frontend_results, api_results)

        # Build embed
        embed = {
            'title': '✅ Deploy Verification' if all_success else '❌ Deploy Verification',
            'description': '\n'.join(checklist_lines),
            'color': COLOR_SUCCESS if all_success else COLOR_FAILURE,
            'fields': [],
            'footer': {
                'text': f"Run ID: {run_info.get('run_id', 'unknown')}"
            }
        }

        # Add run link field
        if run_info and run_info.get('html_url'):
            embed['fields'].append({
                'name': 'Workflow Run',
                'value': f"[View on GitHub]({run_info['html_url']})",
                'inline': False
            })

        # Add fixes if present
        if fixes:
            embed['fields'].append({
                'name': '🔧 Suggested Fixes',
                'value': '\n'.join(f'• {fix}' for fix in fixes),
                'inline': False
            })

        return {
            'content': one_liner,
            'embed': embed
        }

    def _is_all_success(self, run_info, frontend_results, api_results):
        """Check if all verifications passed."""
        # Check Actions run
        if not run_info or run_info.get('conclusion') != 'success':
            return False

        # Check frontend
        if not frontend_results or not frontend_results.get('all_success'):
            return False

        # Check API
        if not api_results or not api_results.get('all_success'):
            return False

        return True

    def _compose_one_liner(self, run_info, frontend_results, api_results, all_success):
        """Compose the one-liner summary."""
        if all_success:
            # Success one-liner
            frontend_url = frontend_results.get('base_url', 'N/A')
            api_url = api_results.get('base_url', 'N/A')
            cf_status = 'ok' if run_info.get('step_durations', {}).get('cloudfront_invalidation') else 'missing'
            build_time = run_info.get('step_durations', {}).get('build')
            build_str = f"{build_time}s" if build_time else 'N/A'

            return (f"✅ Client deploy OK | Frontend: {frontend_url} | API: {api_url} | "
                    f"cf: {cf_status} | build: {build_str}")
        else:
            # Failure one-liner
            reason = self._get_failure_reason(run_info, frontend_results, api_results)
            run_url = run_info.get('html_url', 'N/A') if run_info else 'N/A'

            return f"❌ Client deploy check failed | {reason} | run: {run_url}"

    def _get_failure_reason(self, run_info, frontend_results, api_results):
        """Get brief failure reason for one-liner."""
        if not run_info or run_info.get('conclusion') != 'success':
            return 'Actions failed'

        if not frontend_results or not frontend_results.get('all_success'):
            return 'Frontend checks failed'

        if not api_results or not api_results.get('all_success'):
            return 'API checks failed'

        return 'Unknown issue'

    def _compose_checklist(self, run_info, frontend_results, api_results):
        """Compose detailed checklist lines."""
        lines = []

        # Actions checklist
        actions_line = self._compose_actions_line(run_info)
        lines.append(actions_line)

        # Frontend checklist
        frontend_line = self._compose_frontend_line(frontend_results)
        lines.append(frontend_line)

        # API checklist
        api_line = self._compose_api_line(api_results)
        lines.append(api_line)

        return lines

    def _compose_actions_line(self, run_info):
        """Compose Actions checklist line."""
        if not run_info:
            return '❌ Actions: no run data'

        conclusion = run_info.get('conclusion', 'unknown')
        durations = run_info.get('step_durations', {})

        build_time = durations.get('build')
        s3_time = durations.get('s3_sync')
        cf_status = 'ok' if durations.get('cloudfront_invalidation') else 'missing'

        build_str = f"{build_time}s" if build_time else 'N/A'
        s3_str = f"{s3_time}s" if s3_time else 'N/A'

        success = conclusion == 'success'
        emoji = '✅' if success else '❌'

        return f"{emoji} Actions: {conclusion} | build: {build_str} | s3 sync: {s3_str} | cf invalidation: {cf_status}"

    def _compose_frontend_line(self, frontend_results):
        """Compose frontend checklist line."""
        if not frontend_results or frontend_results.get('error'):
            error_msg = frontend_results.get('error', 'unknown error') if frontend_results else 'no data'
            return f"❌ Frontend: {error_msg}"

        endpoints = frontend_results.get('endpoints', {})

        # Check root endpoint
        root_result = endpoints.get('/', {})
        root_status = self._format_endpoint_status(root_result)

        # Check index.html
        index_result = endpoints.get('/index.html', {})
        index_status = self._format_endpoint_status(index_result)

        # Check cache control on index.html
        cache_control = index_result.get('headers', {}).get(
            'Cache-Control',
            index_result.get('headers', {}).get('cache-control', 'missing'))
        cache_valid = 'no-cache' in cache_control.lower() if cache_control != 'missing' else False
        cache_str = f"cache-control={'no-cache' if cache_valid else cache_control}"

        all_success = frontend_results.get('all_success', False)
        emoji = '✅' if all_success else '❌'

        return f"{emoji} Frontend: {root_status} | index.html: {index_status} | {cache_str}"

    def _compose_api_line(self, api_results):
        """Compose API checklist line."""
        if not api_results or api_results.get('error'):
            error_msg = api_results.get('error', 'unknown error') if api_results else 'no data'
            return f"❌ API: {error_msg}"

        endpoints = api_results.get('endpoints', {})

        # Check /health
        health_result = endpoints.get('/health', {})
        health_status = health_result.get('status_code', 'error')

        # Check /hello
        hello_result = endpoints.get('/hello', {})
        hello_status = hello_result.get('status_code', 'error')

        all_success = api_results.get('all_success', False)
        emoji = '✅' if all_success else '❌'

        return f"{emoji} API: /health {health_status} | /hello {hello_status}"

    def _format_endpoint_status(self, result):
        """Format endpoint check result for display."""
        if not result or result.get('error'):
            return 'error'

        status_code = result.get('status_code')
        if status_code == 200:
            return '200 OK'
        elif status_code:
            return str(status_code)
        else:
            return 'error'

    def _compose_fixes(self, run_info, frontend_results, api_results):
        """Compose actionable fixes for failures."""
        fixes = []

        # Check Actions failures
        if not run_info or run_info.get('conclusion') != 'success':
            fixes.append('Check GitHub Actions workflow logs for the first failed step')
            if run_info and run_info.get('html_url'):
                fixes.append(f"View logs at {run_info['html_url']}")

        # Check API failures
        if not api_results or not api_results.get('all_success'):
            if api_results and api_results.get('error'):
                fixes.append('Check VITE_API_BASE secret is set correctly')
            else:
                endpoints = api_results.get('endpoints', {}) if api_results else {}
                if any(not e.get('success') for e in endpoints.values()):
                    fixes.append('Confirm API /health and /hello endpoints are deployed and reachable')
                    fixes.append('Check VITE_API_BASE secret matches the deployed API URL')

        # Check frontend failures
        if not frontend_results or not frontend_results.get('all_success'):
            if frontend_results and frontend_results.get('error'):
                fixes.append('Check FRONTEND_BASE_URL secret is set correctly')
            else:
                endpoints = frontend_results.get('endpoints', {}) if frontend_results else {}

                # Check index.html specifically
                index_result = endpoints.get('/index.html', {})
                if not index_result.get('success'):
                    fixes.append('Ensure build outputs index.html and s3 sync uploads it')

                # Check cache control
                cache_control = index_result.get('headers', {}).get(
                    'Cache-Control',
                    index_result.get('headers', {}).get('cache-control'))
                if cache_control and 'no-cache' not in cache_control.lower():
                    fixes.append('Set Cache-Control: no-cache on index.html in deploy step')

        # Check CloudFront
        if run_info and not run_info.get('step_durations', {}).get('cloudfront_invalidation'):
            fixes.append('Confirm CLOUDFRONT_DISTRIBUTION_ID and that the Invalidate CloudFront step ran successfully')

        return fixes
