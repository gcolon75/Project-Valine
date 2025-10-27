# Changelog

## [Unreleased]

### Changed
- Reorganized orchestrator documentation into structured folders:
  - Getting started guides moved to docs/getting-started/
  - Agent guides moved to docs/guides/agents/
  - Discord guides moved to docs/guides/discord/
  - Operations guides moved to docs/guides/operations/
  - Troubleshooting guides moved to docs/troubleshooting/
  - Command references moved to docs/reference/commands/
- Organized scripts into subdirectories:
  - Deployment scripts moved to scripts/deployment/
  - Setup scripts moved to scripts/setup/
  - Validation scripts moved to scripts/validation/
- Moved example Python files to examples/ directory
- Created comprehensive documentation index at docs/README.md
- Updated all cross-references in documentation and code

### Fixed
- Remove trailing whitespace (W293) in app/utils/url_validator.py
- Wrap long lines exceeding 120 characters in app/verification/message_composer.py
- Cosmetic formatting fixes reported in validation PR #40
