"""
Analyst Agent - Confidence scoring specialist.

Calculates confidence scores and prioritizes failures for remediation.
"""

import re
from typing import Dict, Any
from .base_agent import Agent


class AnalystAgent(Agent):
    """Agent that calculates confidence scores and prioritizes failures."""
    
    def __init__(self):
        super().__init__("AnalystAgent")
    
    def analyze(self, failure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate confidence score and priority for a failure.
        
        Scoring factors:
        - Clear error message: +20
        - Has file + line number: +10
        - In test file: +10
        - Known failure pattern: +15
        - Has context: +5
        """
        result = {
            "confidence_boost": 0,
            "insights": [],
            "recommendations": [],
            "final_confidence": 50  # Base score
        }
        
        confidence = 50  # Start with base score
        
        message = failure.get("message", "")
        failure_type = failure.get("type", "")
        file_path = failure.get("file", "")
        line_number = failure.get("line")
        context = failure.get("context", "")
        
        # Factor 1: Clear error message patterns
        clear_errors = [
            "ModuleNotFoundError",
            "ImportError",
            "FileNotFoundError",
            "NameError",
            "SyntaxError"
        ]
        
        if any(error in message for error in clear_errors):
            confidence += 20
            result["insights"].append("🎯 Clear error type identified")
        
        # Factor 2: Has file and line number (more actionable)
        if file_path and line_number:
            confidence += 10
            result["insights"].append(f"📍 Exact location: `{file_path}:{line_number}`")
        elif file_path:
            confidence += 5
            result["insights"].append(f"📁 File identified: `{file_path}`")
        
        # Factor 3: In test file (easier to debug and fix)
        if file_path and ('test_' in file_path or '/tests/' in file_path):
            confidence += 10
            result["insights"].append("🧪 Test file - easier to debug")
        
        # Factor 4: Known failure patterns
        known_patterns = {
            "missing_dependency": 15,
            "import_error": 15,
            "test_failure": 10,
            "workflow_permission": 20,
            "python_error": 8
        }
        
        if failure_type in known_patterns:
            boost = known_patterns[failure_type]
            confidence += boost
        
        # Factor 5: Has context (more debugging info)
        if context and len(context) > 50:
            confidence += 5
            result["insights"].append("📝 Detailed context available")
        
        # Factor 6: Short, concise error (less likely to be noise)
        if len(message) < 200:
            confidence += 5
        
        # Cap confidence at 100
        confidence = min(confidence, 100)
        result["final_confidence"] = confidence
        
        # Determine priority based on confidence
        if confidence >= 80:
            priority = "🔥 Quick win"
            result["recommendations"].append("High confidence fix - prioritize this")
        elif confidence >= 60:
            priority = "⚠️  Medium priority"
            result["recommendations"].append("Moderate confidence - review before fixing")
        else:
            priority = "🤔 Needs review"
            result["recommendations"].append("Low confidence - manual investigation needed")
        
        result["insights"].append(f"{priority} (confidence: {confidence}%)")
        
        return result
    
    def can_analyze(self, failure: Dict[str, Any]) -> bool:
        """Analyst can analyze all failures."""
        return True
