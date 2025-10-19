"""
Ops Agent - Package validation specialist.

Validates packages exist on PyPI and provides version information.
"""

import re
import requests
from typing import Dict, Any
from .base_agent import Agent


class OpsAgent(Agent):
    """Agent that validates packages on PyPI."""
    
    PYPI_API_BASE = "https://pypi.org/pypi"
    REQUEST_TIMEOUT = 5
    
    def __init__(self):
        super().__init__("OpsAgent")
        self._cache = {}  # Simple cache to avoid duplicate API calls
    
    def analyze(self, failure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze package availability on PyPI.
        
        Checks:
        - Package exists on PyPI
        - Latest version available
        - Package popularity (if available)
        """
        result = {
            "confidence_boost": 0,
            "insights": [],
            "recommendations": []
        }
        
        failure_type = failure.get("type", "")
        
        # Only analyze dependency-related failures
        if failure_type not in ["missing_dependency", "import_error"]:
            return result
        
        message = failure.get("message", "")
        
        # Extract package name
        package = self._extract_package_name(message)
        if not package:
            return result
        
        # Check if package exists on PyPI
        package_info = self._check_pypi(package)
        
        if package_info is None:
            # API error or timeout
            result["confidence_boost"] = 0
            result["insights"].append(f"⚠️  Could not verify `{package}` on PyPI (API timeout)")
            result["recommendations"].append(f"Manually verify `{package}` package name")
            return result
        
        if not package_info:
            # Package not found
            result["confidence_boost"] = -20
            result["insights"].append(f"❌ `{package}` not found on PyPI - may be private or misspelled")
            result["recommendations"].append(
                f"Check package name spelling or add private repository if needed"
            )
            return result
        
        # Package exists
        version = package_info.get("version", "unknown")
        summary = package_info.get("summary", "")
        
        result["confidence_boost"] = 30
        result["insights"].append(f"✅ `{package}` exists on PyPI")
        result["insights"].append(f"📌 Latest version: `{version}`")
        
        if summary:
            result["insights"].append(f"ℹ️  {summary[:100]}")
        
        result["recommendations"].append(f"Add `{package}=={version}` to requirements.txt")
        
        # Add download stats if available
        try:
            downloads = package_info.get("downloads", {})
            if downloads and downloads.get("last_month"):
                monthly = downloads["last_month"]
                if monthly > 1000000:
                    result["insights"].append(f"🔥 Popular package ({monthly // 1000000}M+ downloads/month)")
                elif monthly > 100000:
                    result["insights"].append(f"📊 Well-used package ({monthly // 1000}K+ downloads/month)")
        except:
            pass
        
        return result
    
    def _extract_package_name(self, message: str) -> str:
        """Extract package name from error message."""
        # Pattern 1: No module named 'package'
        match = re.search(r"No module named ['\"]([^'\"]+)['\"]", message)
        if match:
            package = match.group(1)
            # Get top-level package (before any dots)
            # Some packages have different names on PyPI vs import name
            # e.g., 'PIL' (import) vs 'Pillow' (PyPI)
            return package.split('.')[0]
        
        # Pattern 2: ModuleNotFoundError: package
        match = re.search(r"ModuleNotFoundError:\s*([^\s]+)", message)
        if match:
            return match.group(1)
        
        # Pattern 3: ImportError: No module named package
        match = re.search(r"ImportError:.*?module named\s+([^\s]+)", message)
        if match:
            return match.group(1)
        
        return ""
    
    def _check_pypi(self, package: str) -> Dict[str, Any]:
        """
        Check if package exists on PyPI.
        
        Returns:
            Package info dictionary if found, empty dict if not found, None on error
        """
        # Check cache
        if package in self._cache:
            return self._cache[package]
        
        try:
            url = f"{self.PYPI_API_BASE}/{package}/json"
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            
            if response.status_code == 404:
                # Package not found
                self._cache[package] = {}
                return {}
            
            if response.status_code == 200:
                data = response.json()
                info = data.get("info", {})
                
                package_info = {
                    "version": info.get("version", "unknown"),
                    "summary": info.get("summary", ""),
                    "author": info.get("author", ""),
                    "home_page": info.get("home_page", ""),
                    "requires_python": info.get("requires_python", "")
                }
                
                self._cache[package] = package_info
                return package_info
            
            # Other status codes - treat as API error
            return None
            
        except requests.exceptions.Timeout:
            # Timeout - don't cache, might work next time
            return None
        except requests.exceptions.RequestException:
            # Other network errors
            return None
        except Exception:
            # Unexpected errors (JSON parsing, etc.)
            return None
