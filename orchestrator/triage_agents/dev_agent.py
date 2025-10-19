"""
Dev Agent - Code analysis specialist.

Analyzes Python code for imports, syntax issues, and dependency problems.
"""

import ast
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Set
from .base_agent import Agent


class DevAgent(Agent):
    """Agent that analyzes code structure and imports."""
    
    def __init__(self):
        super().__init__("DevAgent")
        self.repo_root = Path.cwd()
    
    def analyze(self, failure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze code-related failures.
        
        Focuses on:
        - Missing dependencies (imports)
        - Syntax errors
        - Module structure issues
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
        file_path = failure.get("file")
        
        # Extract package name from error message
        package = self._extract_package_name(message)
        if not package:
            return result
        
        # Check if package is imported in the codebase
        imports_found = self._find_imports_in_file(file_path, package)
        
        if imports_found:
            result["confidence_boost"] = 30
            result["insights"].append(f"✅ `{package}` is directly imported in `{file_path}`")
            result["recommendations"].append(f"Add `{package}` to requirements.txt")
        else:
            # Check if it's imported anywhere in the codebase
            files_with_import = self._find_package_in_codebase(package)
            if files_with_import:
                result["confidence_boost"] = 20
                result["insights"].append(
                    f"📦 `{package}` is imported in {len(files_with_import)} file(s): "
                    f"{', '.join([str(f) for f in files_with_import[:3]])}"
                )
                result["recommendations"].append(f"Add `{package}` to requirements.txt")
            else:
                result["confidence_boost"] = 5
                result["insights"].append(f"ℹ️  `{package}` not found in codebase imports")
                result["recommendations"].append(f"Verify `{package}` is the correct package name")
        
        return result
    
    def _extract_package_name(self, message: str) -> str:
        """Extract package name from error message."""
        # Pattern 1: No module named 'package'
        match = re.search(r"No module named ['\"]([^'\"]+)['\"]", message)
        if match:
            package = match.group(1)
            # Get top-level package (before any dots)
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
    
    def _find_imports_in_file(self, file_path: str, package: str) -> bool:
        """Check if package is imported in the specified file."""
        if not file_path:
            return False
        
        full_path = self.repo_root / file_path
        if not full_path.exists() or not full_path.is_file():
            return False
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            tree = ast.parse(content)
            imports = self._extract_imports(tree)
            
            return package in imports
        except (SyntaxError, UnicodeDecodeError, IOError):
            # If we can't parse, try simple text search
            return self._find_import_in_text(full_path, package)
    
    def _find_import_in_text(self, file_path: Path, package: str) -> bool:
        """Fallback: search for import statements as text."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            patterns = [
                rf"^\s*import\s+{package}\b",
                rf"^\s*from\s+{package}\b",
                rf"^\s*import\s+{package}\s*,",
                rf",\s*{package}\s*,"
            ]
            
            for pattern in patterns:
                if re.search(pattern, content, re.MULTILINE):
                    return True
            
            return False
        except:
            return False
    
    def _extract_imports(self, tree: ast.AST) -> Set[str]:
        """Extract all top-level package imports from AST."""
        imports = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    # Get top-level package
                    package = alias.name.split('.')[0]
                    imports.add(package)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    # Get top-level package
                    package = node.module.split('.')[0]
                    imports.add(package)
        
        return imports
    
    def _find_package_in_codebase(self, package: str, max_files: int = 5) -> List[Path]:
        """Search for package imports across the codebase."""
        files_with_import = []
        
        # Search in common Python directories
        search_dirs = ['orchestrator', 'src', 'server', 'api', 'scripts']
        
        for dir_name in search_dirs:
            dir_path = self.repo_root / dir_name
            if not dir_path.exists():
                continue
            
            # Find Python files
            for py_file in dir_path.rglob('*.py'):
                if len(files_with_import) >= max_files:
                    break
                
                # Skip __pycache__ and other generated directories
                if '__pycache__' in str(py_file) or '.venv' in str(py_file):
                    continue
                
                if self._find_imports_in_file(str(py_file.relative_to(self.repo_root)), package):
                    files_with_import.append(py_file.relative_to(self.repo_root))
        
        return files_with_import
