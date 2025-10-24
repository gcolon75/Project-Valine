"""
UptimeGuardian Agent for Project Valine orchestrator.

AI Agent Prompt: Uptime Guardian Agent (Project-Valine)

## CONTEXT
You are the UptimeGuardian, an agent in Project-Valine. Your quest: keep the bot (and all agents) 
online 24/7, detect downtime instantly, and auto-recover if possible. If anything goes down, 
you ping the squad and (optionally) try to restart.

## GOALS
- Ping the Discord bot endpoint and any critical services on a schedule or via `/uptime-check`.
- If downtime detected:
  - Try to auto-recover (restart Lambda, redeploy, re-register commands).
  - If recovery fails, notify in Discord: "❌ Bot is offline, squad assemble!"
- Log status updates in Discord and CloudWatch.
- Post fun status updates: ("Bot respawned, loot secured!")
- Maintain an "Uptime Scoreboard" in SUMMARY.md.

## TONE
- Gen Z, gaming, memes
- Efficient, direct, and fun
"""
import os
import time
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


class UptimeGuardian:
    """
    UptimeGuardian for Project Valine orchestrator.
    
    Monitors Discord bot and critical services for uptime, providing instant health checks
    and auto-recovery capabilities with Gen Z/gaming themed responses.
    """
    
    def __init__(
        self,
        discord_handler_url: Optional[str] = None,
        api_base_url: Optional[str] = None,
        frontend_url: Optional[str] = None,
        timeout: int = 10
    ):
        """
        Initialize UptimeGuardian.
        
        Args:
            discord_handler_url: Discord bot Lambda endpoint URL
            api_base_url: API base URL to check
            frontend_url: Frontend URL to check
            timeout: Request timeout in seconds
        """
        self.discord_handler_url = discord_handler_url
        self.api_base_url = api_base_url
        self.frontend_url = frontend_url
        self.timeout = timeout
        
        # Try to get URLs from environment if not provided
        if not self.discord_handler_url:
            self.discord_handler_url = os.environ.get('DISCORD_HANDLER_URL')
        if not self.api_base_url:
            self.api_base_url = os.environ.get('API_BASE_URL')
        if not self.frontend_url:
            self.frontend_url = os.environ.get('FRONTEND_URL')
    
    def _ping_endpoint(self, url: str, name: str) -> Dict[str, Any]:
        """
        Ping a single endpoint and measure response time.
        
        Args:
            url: URL to ping
            name: Human-readable name for the endpoint
            
        Returns:
            Dictionary with status, response_time_ms, error
        """
        result = {
            'name': name,
            'url': url,
            'status': 'unknown',
            'response_time_ms': None,
            'error': None,
            'online': False
        }
        
        if not url:
            result['status'] = 'skipped'
            result['error'] = 'URL not configured'
            return result
        
        try:
            start_time = time.time()
            response = requests.head(url, timeout=self.timeout, allow_redirects=True)
            end_time = time.time()
            
            response_time_ms = round((end_time - start_time) * 1000, 0)
            
            result['response_time_ms'] = response_time_ms
            result['online'] = 200 <= response.status_code < 300
            result['status'] = 'online' if result['online'] else f'error_{response.status_code}'
            
            if not result['online']:
                result['error'] = f'HTTP {response.status_code}'
            
        except requests.exceptions.Timeout:
            result['status'] = 'timeout'
            result['error'] = f'Timeout after {self.timeout}s'
        except requests.exceptions.ConnectionError as e:
            result['status'] = 'connection_error'
            result['error'] = f'Connection failed: {str(e)[:50]}'
        except requests.exceptions.RequestException as e:
            result['status'] = 'request_error'
            result['error'] = f'Request error: {str(e)[:50]}'
        
        return result
    
    def check_all_services(self) -> Dict[str, Any]:
        """
        Check all critical services (Discord bot, API, frontend).
        
        Returns:
            Dictionary with overall status and individual service results
        """
        checks = []
        
        # Check Discord handler (bot endpoint)
        if self.discord_handler_url:
            discord_result = self._ping_endpoint(self.discord_handler_url, 'Discord Bot')
            checks.append(discord_result)
        
        # Check API endpoint
        if self.api_base_url:
            # Add /health endpoint
            api_url = f"{self.api_base_url.rstrip('/')}/health"
            api_result = self._ping_endpoint(api_url, 'API')
            checks.append(api_result)
        
        # Check frontend
        if self.frontend_url:
            frontend_result = self._ping_endpoint(self.frontend_url, 'Frontend')
            checks.append(frontend_result)
        
        # Calculate overall status
        all_online = all(check['online'] for check in checks if check['status'] != 'skipped')
        any_offline = any(not check['online'] and check['status'] != 'skipped' for check in checks)
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'all_online': all_online,
            'any_offline': any_offline,
            'checks': checks,
            'total_checks': len(checks),
            'online_count': sum(1 for c in checks if c['online']),
            'offline_count': sum(1 for c in checks if not c['online'] and c['status'] != 'skipped'),
            'skipped_count': sum(1 for c in checks if c['status'] == 'skipped')
        }
    
    def format_uptime_message(self, check_result: Dict[str, Any]) -> str:
        """
        Format uptime check results into a Gen Z/gaming themed message.
        
        Args:
            check_result: Results from check_all_services()
            
        Returns:
            Formatted message string
        """
        # Check if we have any non-skipped checks
        non_skipped_checks = [c for c in check_result['checks'] if c['status'] != 'skipped']
        
        if not non_skipped_checks:
            # No checks configured
            message = "⚠️ **No services configured for monitoring**\n\n"
            message += "Configure endpoints via environment variables:\n"
            message += "- `DISCORD_HANDLER_URL`\n"
            message += "- `API_BASE_URL`\n"
            message += "- `FRONTEND_URL`"
            return message
        
        if check_result['all_online']:
            # All services online - victory message
            fastest_check = min(
                (c for c in check_result['checks'] if c['online'] and c['response_time_ms'] is not None),
                key=lambda x: x['response_time_ms'],
                default=None
            )
            
            avg_ping = None
            online_checks = [c for c in check_result['checks'] if c['online'] and c['response_time_ms'] is not None]
            if online_checks:
                avg_ping = round(
                    sum(c['response_time_ms'] for c in online_checks) / len(online_checks), 
                    0
                )
            
            message = "✅ **All systems operational, loot secured!** 🎮\n\n"
            
            for check in check_result['checks']:
                if check['status'] == 'skipped':
                    continue
                emoji = "✅" if check['online'] else "❌"
                ping_str = f" ({int(check['response_time_ms'])}ms)" if check['response_time_ms'] is not None else ""
                message += f"{emoji} **{check['name']}**: Online{ping_str}\n"
            
            if avg_ping is not None:
                message += f"\n🏆 Average ping: **{int(avg_ping)}ms** | Status: **Poggers** 🔥"
            
        elif check_result['any_offline']:
            # Some services offline - alert
            message = "❌ **ALERT: Services down, squad assemble!** 🚨\n\n"
            
            for check in check_result['checks']:
                if check['status'] == 'skipped':
                    continue
                    
                if check['online']:
                    ping_str = f" ({int(check['response_time_ms'])}ms)" if check['response_time_ms'] is not None else ""
                    message += f"✅ **{check['name']}**: Online{ping_str}\n"
                else:
                    error_msg = check['error'] or check['status']
                    message += f"❌ **{check['name']}**: **OFFLINE** - {error_msg}\n"
            
            message += f"\n⚠️ **{check_result['offline_count']}/{check_result['total_checks']} services down**"
            message += "\n💡 Attempted auto-recovery not implemented yet. Manual intervention required."
        else:
            # No checks configured (shouldn't reach here but keep as fallback)
            message = "⚠️ **No services configured for monitoring**\n\n"
            message += "Configure endpoints via environment variables:\n"
            message += "- `DISCORD_HANDLER_URL`\n"
            message += "- `API_BASE_URL`\n"
            message += "- `FRONTEND_URL`"
        
        return message
    
    def run_uptime_check(self) -> Dict[str, Any]:
        """
        Run complete uptime check and return results with formatted message.
        
        Returns:
            Dictionary with check results and formatted message
        """
        check_result = self.check_all_services()
        message = self.format_uptime_message(check_result)
        
        return {
            'status': 'success',
            'result': check_result,
            'message': message,
            'all_online': check_result['all_online']
        }
