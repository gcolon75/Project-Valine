"""
Tests for health_snapshot service.
"""
import os
import unittest
from unittest.mock import Mock, patch, MagicMock
from app.services.health_snapshot import HealthSnapshot


class TestHealthSnapshot(unittest.TestCase):
    """Test cases for HealthSnapshot service."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Set required environment variables
        os.environ['DISCORD_BOT_TOKEN'] = 'test_token'
        os.environ['DISCORD_STATUS_CHANNEL_ID'] = '123456789'
        os.environ['FRONTEND_BASE_URL'] = 'https://test-frontend.com'
        os.environ['VITE_API_BASE'] = 'https://test-api.com'
    
    @patch('app.services.health_snapshot.HTTPChecker')
    def test_gather_metrics_success(self, mock_http_checker):
        """Test successful metrics gathering."""
        # Mock HTTP checker responses
        mock_checker_instance = Mock()
        mock_http_checker.return_value = mock_checker_instance
        
        # Mock frontend results
        mock_checker_instance.check_frontend.return_value = {
            'base_url': 'https://test-frontend.com',
            'endpoints': {
                '/': {
                    'success': True,
                    'response_time_ms': 50,
                    'status_code': 200
                },
                '/discover': {
                    'success': True,
                    'response_time_ms': 60,
                    'status_code': 200
                }
            },
            'all_success': True
        }
        
        # Mock API results
        mock_checker_instance.check_api.return_value = {
            'base_url': 'https://test-api.com',
            'endpoints': {
                '/health': {
                    'success': True,
                    'response_time_ms': 30,
                    'status_code': 200
                },
                '/api/profiles': {
                    'success': True,
                    'response_time_ms': 40,
                    'status_code': 200
                }
            },
            'all_success': True
        }
        
        health_service = HealthSnapshot()
        metrics = health_service.gather_metrics()
        
        # Verify metrics structure
        self.assertIn('timestamp', metrics)
        self.assertIn('frontend', metrics)
        self.assertIn('api', metrics)
        self.assertIn('summary', metrics)
        
        # Verify frontend metrics
        self.assertEqual(metrics['frontend']['total_checks'], 2)
        self.assertEqual(metrics['frontend']['errors'], 0)
        self.assertEqual(metrics['frontend']['success_rate'], 100.0)
        
        # Verify API metrics
        self.assertEqual(metrics['api']['total_checks'], 2)
        self.assertEqual(metrics['api']['errors'], 0)
        self.assertEqual(metrics['api']['success_rate'], 100.0)
        
        # Verify summary
        self.assertEqual(metrics['summary']['overall_health'], 'healthy')
        self.assertEqual(metrics['summary']['total_checks'], 4)
        self.assertEqual(metrics['summary']['total_errors'], 0)
    
    @patch('app.services.health_snapshot.HTTPChecker')
    def test_gather_metrics_with_errors(self, mock_http_checker):
        """Test metrics gathering with some failures."""
        mock_checker_instance = Mock()
        mock_http_checker.return_value = mock_checker_instance
        
        # Mock frontend with one error
        mock_checker_instance.check_frontend.return_value = {
            'base_url': 'https://test-frontend.com',
            'endpoints': {
                '/': {
                    'success': True,
                    'response_time_ms': 50,
                    'status_code': 200
                },
                '/discover': {
                    'success': False,
                    'response_time_ms': None,
                    'status_code': 500,
                    'error': 'Server error'
                }
            },
            'all_success': False
        }
        
        # Mock API with no errors
        mock_checker_instance.check_api.return_value = {
            'base_url': 'https://test-api.com',
            'endpoints': {
                '/health': {
                    'success': True,
                    'response_time_ms': 30,
                    'status_code': 200
                }
            },
            'all_success': True
        }
        
        health_service = HealthSnapshot()
        metrics = health_service.gather_metrics()
        
        # Verify error tracking
        self.assertEqual(metrics['frontend']['errors'], 1)
        self.assertEqual(metrics['frontend']['success_rate'], 50.0)
        self.assertEqual(metrics['summary']['overall_health'], 'degraded')
        self.assertEqual(metrics['summary']['total_errors'], 1)
    
    def test_create_status_embed_healthy(self):
        """Test embed creation for healthy status."""
        health_service = HealthSnapshot()
        
        metrics = {
            'timestamp': '2025-11-11T16:00:00',
            'frontend': {
                'base_url': 'https://test-frontend.com',
                'total_checks': 2,
                'errors': 0,
                'success_rate': 100.0,
                'latency_p50': 50.0,
                'latency_p95': 60.0,
                'latency_avg': 55.0
            },
            'api': {
                'base_url': 'https://test-api.com',
                'total_checks': 2,
                'errors': 0,
                'success_rate': 100.0,
                'latency_p50': 30.0,
                'latency_p95': 40.0,
                'latency_avg': 35.0
            },
            'summary': {
                'overall_health': 'healthy',
                'total_checks': 4,
                'total_errors': 0,
                'overall_success_rate': 100.0
            }
        }
        
        embed = health_service.create_status_embed(metrics)
        
        # Verify embed structure
        self.assertIn('title', embed)
        self.assertIn('✅', embed['title'])
        self.assertEqual(embed['color'], 0x00ff00)  # Green
        self.assertIn('fields', embed)
        self.assertEqual(len(embed['fields']), 3)  # Overall, Frontend, API
        
        # Verify field contents
        overall_field = embed['fields'][0]
        self.assertIn('Overall Status', overall_field['name'])
        self.assertIn('100.0%', overall_field['value'])
    
    def test_create_status_embed_degraded(self):
        """Test embed creation for degraded status."""
        health_service = HealthSnapshot()
        
        metrics = {
            'timestamp': '2025-11-11T16:00:00',
            'frontend': {
                'total_checks': 2,
                'errors': 1,
                'success_rate': 50.0,
                'latency_p50': 50.0,
                'latency_p95': 60.0
            },
            'api': {
                'total_checks': 2,
                'errors': 0,
                'success_rate': 100.0,
                'latency_p50': 30.0,
                'latency_p95': 40.0
            },
            'summary': {
                'overall_health': 'degraded',
                'total_checks': 4,
                'total_errors': 1,
                'overall_success_rate': 75.0
            }
        }
        
        embed = health_service.create_status_embed(metrics)
        
        # Verify degraded status
        self.assertIn('⚠️', embed['title'])
        self.assertEqual(embed['color'], 0xffaa00)  # Orange
    
    def test_create_status_embed_critical(self):
        """Test embed creation for critical status."""
        health_service = HealthSnapshot()
        
        metrics = {
            'timestamp': '2025-11-11T16:00:00',
            'frontend': {
                'total_checks': 2,
                'errors': 2,
                'success_rate': 0.0,
                'latency_p50': None,
                'latency_p95': None
            },
            'api': {
                'total_checks': 2,
                'errors': 1,
                'success_rate': 50.0,
                'latency_p50': 30.0,
                'latency_p95': 40.0
            },
            'summary': {
                'overall_health': 'critical',
                'total_checks': 4,
                'total_errors': 3,
                'overall_success_rate': 25.0
            }
        }
        
        embed = health_service.create_status_embed(metrics)
        
        # Verify critical status
        self.assertIn('❌', embed['title'])
        self.assertEqual(embed['color'], 0xff0000)  # Red
    
    @patch('app.services.health_snapshot.DiscordService')
    def test_post_to_discord_success(self, mock_discord_service):
        """Test successful Discord posting."""
        mock_discord_instance = Mock()
        mock_discord_service.return_value = mock_discord_instance
        mock_discord_instance.send_message.return_value = {'id': '123'}
        
        health_service = HealthSnapshot()
        embed = {'title': 'Test Embed'}
        
        result = health_service.post_to_discord(embed)
        
        self.assertTrue(result)
        mock_discord_instance.send_message.assert_called_once_with(
            channel_id='123456789',
            content='',
            embeds=[embed]
        )
    
    @patch('app.services.health_snapshot.DiscordService')
    def test_post_to_discord_no_channel_id(self, mock_discord_service):
        """Test Discord posting when channel ID is not set."""
        # Remove channel ID
        if 'DISCORD_STATUS_CHANNEL_ID' in os.environ:
            del os.environ['DISCORD_STATUS_CHANNEL_ID']
        
        health_service = HealthSnapshot()
        embed = {'title': 'Test Embed'}
        
        result = health_service.post_to_discord(embed)
        
        self.assertFalse(result)
    
    @patch('app.services.health_snapshot.DiscordService')
    def test_post_to_discord_failure(self, mock_discord_service):
        """Test Discord posting failure."""
        os.environ['DISCORD_STATUS_CHANNEL_ID'] = '123456789'
        
        mock_discord_instance = Mock()
        mock_discord_service.return_value = mock_discord_instance
        mock_discord_instance.send_message.return_value = None  # Failure
        
        health_service = HealthSnapshot()
        embed = {'title': 'Test Embed'}
        
        result = health_service.post_to_discord(embed)
        
        self.assertFalse(result)
    
    def test_get_trend_arrow_improving(self):
        """Test trend arrow for improving metrics."""
        health_service = HealthSnapshot()
        
        current = {'success_rate': 95.0}
        trend_data = {
            'frontend': {'avg_success_rate': 85.0}
        }
        
        arrow = health_service._get_trend_arrow(current, trend_data, 'frontend')
        self.assertEqual(arrow, '📈')
    
    def test_get_trend_arrow_degrading(self):
        """Test trend arrow for degrading metrics."""
        health_service = HealthSnapshot()
        
        current = {'success_rate': 75.0}
        trend_data = {
            'frontend': {'avg_success_rate': 90.0}
        }
        
        arrow = health_service._get_trend_arrow(current, trend_data, 'frontend')
        self.assertEqual(arrow, '📉')
    
    def test_get_trend_arrow_stable(self):
        """Test trend arrow for stable metrics."""
        health_service = HealthSnapshot()
        
        current = {'success_rate': 92.0}
        trend_data = {
            'frontend': {'avg_success_rate': 90.0}
        }
        
        arrow = health_service._get_trend_arrow(current, trend_data, 'frontend')
        self.assertEqual(arrow, '➡️')


if __name__ == '__main__':
    unittest.main()
