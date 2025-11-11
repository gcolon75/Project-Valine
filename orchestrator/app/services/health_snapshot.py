"""
Health Snapshot service for gathering and reporting system health metrics.
Collects latency, error rates, and other health indicators for daily reporting.
"""
import os
import time
import json
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from verification.http_checker import HTTPChecker
from services.discord import DiscordService


class HealthSnapshot:
    """Service for gathering and reporting health metrics."""
    
    def __init__(self):
        """Initialize health snapshot service."""
        self.http_checker = HTTPChecker()
        self.frontend_base_url = os.environ.get('FRONTEND_BASE_URL', '')
        self.api_base_url = os.environ.get('VITE_API_BASE', '')
        self.discord_service = DiscordService()
        self.status_channel_id = os.environ.get('DISCORD_STATUS_CHANNEL_ID', '')
    
    def gather_metrics(self) -> Dict:
        """
        Gather current health metrics from endpoints.
        
        Returns:
            Dictionary containing health metrics
        """
        from datetime import timezone
        metrics = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'frontend': {},
            'api': {},
            'summary': {}
        }
        
        # Check frontend endpoints
        if self.frontend_base_url:
            frontend_results = self.http_checker.check_frontend(self.frontend_base_url)
            latencies = []
            errors = 0
            total = 0
            
            for endpoint, result in frontend_results.get('endpoints', {}).items():
                total += 1
                if result.get('success'):
                    if result.get('response_time_ms'):
                        latencies.append(result['response_time_ms'])
                else:
                    errors += 1
            
            metrics['frontend'] = {
                'base_url': self.frontend_base_url,
                'total_checks': total,
                'errors': errors,
                'success_rate': round((total - errors) / total * 100, 1) if total > 0 else 0,
                'latency_p50': round(statistics.median(latencies), 1) if latencies else None,
                'latency_p95': round(statistics.quantiles(latencies, n=20)[18], 1) if len(latencies) > 1 else (latencies[0] if latencies else None),
                'latency_avg': round(statistics.mean(latencies), 1) if latencies else None
            }
        
        # Check API endpoints
        if self.api_base_url:
            api_results = self.http_checker.check_api(self.api_base_url)
            latencies = []
            errors = 0
            total = 0
            
            for endpoint, result in api_results.get('endpoints', {}).items():
                total += 1
                if result.get('success'):
                    if result.get('response_time_ms'):
                        latencies.append(result['response_time_ms'])
                else:
                    errors += 1
            
            metrics['api'] = {
                'base_url': self.api_base_url,
                'total_checks': total,
                'errors': errors,
                'success_rate': round((total - errors) / total * 100, 1) if total > 0 else 0,
                'latency_p50': round(statistics.median(latencies), 1) if latencies else None,
                'latency_p95': round(statistics.quantiles(latencies, n=20)[18], 1) if len(latencies) > 1 else (latencies[0] if latencies else None),
                'latency_avg': round(statistics.mean(latencies), 1) if latencies else None
            }
        
        # Overall summary
        total_checks = metrics['frontend'].get('total_checks', 0) + metrics['api'].get('total_checks', 0)
        total_errors = metrics['frontend'].get('errors', 0) + metrics['api'].get('errors', 0)
        
        metrics['summary'] = {
            'overall_health': 'healthy' if total_errors == 0 else ('degraded' if total_errors < total_checks / 2 else 'critical'),
            'total_checks': total_checks,
            'total_errors': total_errors,
            'overall_success_rate': round((total_checks - total_errors) / total_checks * 100, 1) if total_checks > 0 else 0
        }
        
        return metrics
    
    def create_status_embed(self, metrics: Dict, trend_data: Optional[Dict] = None) -> Dict:
        """
        Create Discord embed for status report.
        
        Args:
            metrics: Current health metrics
            trend_data: Optional trend data for comparison
            
        Returns:
            Discord embed object
        """
        summary = metrics.get('summary', {})
        frontend = metrics.get('frontend', {})
        api = metrics.get('api', {})
        
        # Determine color based on health
        health_status = summary.get('overall_health', 'unknown')
        if health_status == 'healthy':
            color = 0x00ff00  # Green
            status_emoji = '✅'
        elif health_status == 'degraded':
            color = 0xffaa00  # Orange
            status_emoji = '⚠️'
        else:
            color = 0xff0000  # Red
            status_emoji = '❌'
        
        embed = {
            'title': f'{status_emoji} System Health Snapshot',
            'color': color,
            'timestamp': metrics.get('timestamp'),
            'fields': []
        }
        
        # Overall status
        embed['fields'].append({
            'name': '📊 Overall Status',
            'value': (
                f"**Health:** {health_status.title()}\n"
                f"**Success Rate:** {summary.get('overall_success_rate', 0)}%\n"
                f"**Total Checks:** {summary.get('total_checks', 0)}\n"
                f"**Errors:** {summary.get('total_errors', 0)}"
            ),
            'inline': False
        })
        
        # Frontend metrics
        if frontend:
            trend_arrow = self._get_trend_arrow(frontend, trend_data, 'frontend') if trend_data else ''
            embed['fields'].append({
                'name': f'🌐 Frontend {trend_arrow}',
                'value': (
                    f"**Success Rate:** {frontend.get('success_rate', 0)}%\n"
                    f"**Latency (p50):** {frontend.get('latency_p50', 'N/A')}ms\n"
                    f"**Latency (p95):** {frontend.get('latency_p95', 'N/A')}ms\n"
                    f"**Errors:** {frontend.get('errors', 0)}/{frontend.get('total_checks', 0)}"
                ),
                'inline': True
            })
        
        # API metrics
        if api:
            trend_arrow = self._get_trend_arrow(api, trend_data, 'api') if trend_data else ''
            embed['fields'].append({
                'name': f'⚙️ API {trend_arrow}',
                'value': (
                    f"**Success Rate:** {api.get('success_rate', 0)}%\n"
                    f"**Latency (p50):** {api.get('latency_p50', 'N/A')}ms\n"
                    f"**Latency (p95):** {api.get('latency_p95', 'N/A')}ms\n"
                    f"**Errors:** {api.get('errors', 0)}/{api.get('total_checks', 0)}"
                ),
                'inline': True
            })
        
        embed['footer'] = {
            'text': 'Health metrics gathered from endpoint checks'
        }
        
        return embed
    
    def _get_trend_arrow(self, current: Dict, trend_data: Dict, category: str) -> str:
        """
        Get trend arrow based on comparison with historical data.
        
        Args:
            current: Current metrics
            trend_data: Historical trend data
            category: Category to compare (frontend/api)
            
        Returns:
            Trend arrow emoji
        """
        if not trend_data or category not in trend_data:
            return ''
        
        historical = trend_data[category]
        current_success = current.get('success_rate', 0)
        historical_avg = historical.get('avg_success_rate', current_success)
        
        if current_success > historical_avg + 5:
            return '📈'  # Improving
        elif current_success < historical_avg - 5:
            return '📉'  # Degrading
        else:
            return '➡️'  # Stable
    
    def post_to_discord(self, embed: Dict) -> bool:
        """
        Post health snapshot to Discord status channel.
        
        Args:
            embed: Discord embed object
            
        Returns:
            True if successful, False otherwise
        """
        if not self.status_channel_id:
            print('Warning: DISCORD_STATUS_CHANNEL_ID not set, cannot post health snapshot')
            return False
        
        try:
            result = self.discord_service.send_message(
                channel_id=self.status_channel_id,
                content='',
                embeds=[embed]
            )
            return result is not None
        except Exception as e:
            print(f'Error posting health snapshot to Discord: {str(e)}')
            return False
    
    def generate_and_post_snapshot(self, trend_data: Optional[Dict] = None) -> Tuple[bool, Dict]:
        """
        Generate health snapshot and post to Discord.
        
        Args:
            trend_data: Optional trend data for comparison
            
        Returns:
            Tuple of (success, metrics)
        """
        try:
            metrics = self.gather_metrics()
            embed = self.create_status_embed(metrics, trend_data)
            success = self.post_to_discord(embed)
            return success, metrics
        except Exception as e:
            print(f'Error generating health snapshot: {str(e)}')
            return False, {}
