# Changelog

All notable changes to the "PwnScanner" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-03-17

### Added

- Initial release of VS Code Security Scanner extension
- Support for scanning code files for security vulnerabilities
- Integration with OpenAI's models for vulnerability detection
- Detailed vulnerability reporting with severity levels, confidence scores, and code snippets
- HTML, PDF, and Markdown report generation
- Cross-validation feature using multiple AI providers (OpenAI, Claude, Grok)
- Confidence-based categorization (Validated ≥50%, Unconfirmed <50%)
- Standalone scanner functionality for command-line usage
- Provider information displayed in all report formats
- UI improvements for vulnerability display with color-coded severity indicators
- Support for identifying various vulnerability types (XSS, SQL Injection, etc.)

### Fixed

- Corrected display of provider information in HTML reports
- Fixed HTML generation in vulnerability panel
- Improved error handling for missing API keys

## [Unreleased]

### Planned Features

- Additional AI model support
- Customizable vulnerability detection rules
- Integration with security databases for known vulnerability checking
- Batch scanning of multiple files or projects
- Historical vulnerability tracking
- Custom report templates
- Automated fix suggestions with code snippets
- Security score and trend analysis
