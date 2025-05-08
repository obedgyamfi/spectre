# Spectre

## What It Does

The VS Code Security Scanner identifies potential security vulnerabilities in your code by leveraging advanced AI models. It analyzes your code for common security issues such as:

- SQL Injection
- Cross-site Scripting (XSS)
- Command Injection
- Insecure Cryptography
- Business Logic Flaws
- Race Conditions
- And more...

## Features

- **Multi-Provider AI Analysis**: Scan with multiple AI providers (OpenAI, Claude, Grok) for enhanced accuracy
- **Cross-Validation**: Combine results from multiple AI providers to reduce false positives
- **Confidence-Based Categorization**: Vulnerabilities are classified as Validated (≥50% confidence) or Unconfirmed (<50%)
- **Rich Visualization**: Detailed vulnerability reports with severity indicators, code snippets, and remediation suggestions
- **Comprehensive Reporting**: Generate reports in multiple formats (HTML, PDF, and Markdown)
- **Standalone Scanner**: Run vulnerability scans outside of VS Code using the command line interface
- **Code Context Recognition**: Identify vulnerable functions, line numbers, and associated code snippets

## How It Works

1. The extension analyzes your code using AI-powered language models trained to identify security vulnerabilities
2. Each potential vulnerability is assigned a confidence score based on the AI's analysis
3. Results are categorized and displayed in an interactive panel with detailed information
4. Optional cross-validation can be enabled to compare results from multiple AI providers
5. Reports can be generated in multiple formats for documentation and sharing

## Requirements

- Visual Studio Code 1.60.0 or higher
- Node.js 14.0.0 or higher
- An API key for at least one of the supported AI providers:
  - OpenAI (GPT-4 or later)
  - Anthropic Claude (optional)
  - Grok AI (optional)


### Getting Help

If you encounter any issues not listed here, please open an issue in the GitHub repository with:

- The exact error message
- Steps to reproduce the issue
- Your environment details (OS, Node.js version, VS Code version)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
