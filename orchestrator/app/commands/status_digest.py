"""
Status Digest Command - Shows system health snapshot.
"""
from commands import BaseCommand
from services.health_snapshot import HealthSnapshot


class StatusDigestCommand(BaseCommand):
    """Command to show health snapshot with latency and error metrics."""
    
    @property
    def name(self) -> str:
        return 'status-digest'
    
    @property
    def description(self) -> str:
        return 'Show system health snapshot with latency and error metrics'
    
    async def execute(self, interaction: dict) -> dict:
        """
        Execute status-digest command.
        
        Args:
            interaction: Discord interaction payload
            
        Returns:
            Discord response with health embed
        """
        try:
            # Initialize health snapshot service
            health_service = HealthSnapshot()
            
            # Generate and get metrics
            metrics = health_service.gather_metrics()
            
            # Create embed for Discord
            embed = health_service.create_status_embed(metrics)
            
            # Return as ephemeral message to the user
            return {
                'type': 4,
                'data': {
                    'embeds': [embed],
                    'flags': 64  # Ephemeral
                }
            }
        
        except Exception as e:
            print(f'Error in status-digest command: {str(e)}')
            import traceback
            traceback.print_exc()
            
            return {
                'type': 4,
                'data': {
                    'content': f'❌ Error generating health snapshot: {str(e)}',
                    'flags': 64
                }
            }
