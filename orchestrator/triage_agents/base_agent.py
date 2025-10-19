"""
Base Agent class for triage analysis.

Provides the interface that all specialist agents implement.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class Agent(ABC):
    """Base class for triage agents."""
    
    def __init__(self, name: str):
        """
        Initialize agent.
        
        Args:
            name: Agent name for identification
        """
        self.name = name
    
    @abstractmethod
    def analyze(self, failure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a failure and provide insights.
        
        Args:
            failure: Dictionary containing failure information:
                - type: Failure type (e.g., 'missing_dependency', 'test_failure')
                - message: Error message
                - file: Optional file path where error occurred
                - line: Optional line number
                - context: Optional surrounding context
        
        Returns:
            Dictionary with analysis results:
                - confidence_boost: Points to add/subtract from confidence (0-30)
                - insights: List of human-readable insights
                - recommendations: List of actionable recommendations
        """
        pass
    
    def can_analyze(self, failure: Dict[str, Any]) -> bool:
        """
        Check if this agent can analyze the given failure.
        
        Args:
            failure: Failure dictionary
            
        Returns:
            True if agent can provide useful analysis
        """
        return True
