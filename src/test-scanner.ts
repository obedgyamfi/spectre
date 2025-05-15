import { VulnerabilityScanner } from './scanner';
import { ConfigManager } from './utils/configManager';
import * as fs from 'fs';
import * as path from 'path';

interface MockContext {
    globalState: {
        get: (key: string) => any;
        update: (key: string, value: any) => Promise<void>;
    };
    secrets: {
        get: (key: string) => Promise<string | undefined>;
        store: (key: string, value: string) => Promise<void>;
    };
}

async function testScanner() {
    const possiblePaths = [
        path.join(process.cwd(), 'src', 'test', 'test_vulnerability.ts'),
        path.join(process.cwd(), 'test_vulnerability.js')
    ];

    let testFilePath: string | undefined;
    let testCode: string | undefined;

    // Try to find the test file
    for (const filePath of possiblePaths) {
        console.log(`Checking for test file at: ${filePath}`);
        if (fs.existsSync(filePath)) {
            testFilePath = filePath;
            testCode = fs.readFileSync(filePath, 'utf8');
            console.log(`Found test file at: ${filePath}`);
            break;
        }
    }

    if (!testCode || !testFilePath) {
        console.error('Could not find test file in any of these locations:');
        possiblePaths.forEach(p => console.log(`- ${p}`));
        return;
    }

    // Create mock context without vscode dependency
    const mockContext: MockContext = {
        globalState: {
            get: (key: string) => key === 'selected-ai-provider' ? 'openai' : undefined,
            update: async () => {}
        },
        secrets: {
            get: async (key: string) => {
                // For testing, return environment variables
                if (key === 'openai-api-key') {
                    const apiKey = process.env.OPENAI_API_KEY;
                    console.log(`OpenAI API key ${apiKey ? 'found' : 'not found'} in environment`);
                    return apiKey;
                }
                if (key === 'claude-api-key') return process.env.CLAUDE_API_KEY;
                return undefined;
            },
            store: async () => {}
        }
    };

    const configManager = new ConfigManager(mockContext);
    const scanner = new VulnerabilityScanner(configManager);

    try {
        console.log('\nStarting vulnerability scan...');
        console.log(`Analyzing file: ${path.basename(testFilePath)}`);
        console.log('----------------------------------------');

        const results = await scanner.scanCode(testCode, 'typescript');

        console.log('\nScan Results:');
        console.log('----------------------------------------');

        // Group vulnerabilities by confidence
        const validatedVulns = results.filter(v => v.confidence >= 0.5);
        const unconfirmedVulns = results.filter(v => v.confidence < 0.5);

        // Log validated vulnerabilities
        if (validatedVulns.length > 0) {
            console.log('\nValidated Vulnerabilities:');
            console.log('----------------------------------------');
            validatedVulns.forEach((vulnerability, index) => {
                console.log(`\nVulnerability #${index + 1}:`);
                console.log(`Severity: ${vulnerability.severity}`);
                console.log(`Type: ${vulnerability.type}`);
                console.log(`Function: ${vulnerability.vulnerableFunction}`);
                console.log(`Line Number: ${vulnerability.lineNumber}`);
                console.log(`Description: ${vulnerability.description}`);
                console.log(`Suggestion: ${vulnerability.suggestion}`);
                console.log(`Confidence: ${(vulnerability.confidence * 100).toFixed(1)}%`);
                if (vulnerability.codeSnippet) {
                    console.log('\nVulnerable Code:');
                    console.log(vulnerability.codeSnippet);
                }
                console.log('----------------------------------------');
            });
        }

        // Log unconfirmed vulnerabilities
        if (unconfirmedVulns.length > 0) {
            console.log('\nUnconfirmed Vulnerabilities:');
            console.log('----------------------------------------');
            unconfirmedVulns.forEach((vulnerability, index) => {
                console.log(`\nPotential Vulnerability #${index + 1}:`);
                console.log(`Severity: ${vulnerability.severity}`);
                console.log(`Type: ${vulnerability.type}`);
                console.log(`Function: ${vulnerability.vulnerableFunction}`);
                console.log(`Line Number: ${vulnerability.lineNumber}`);
                console.log(`Description: ${vulnerability.description}`);
                console.log(`Suggestion: ${vulnerability.suggestion}`);
                console.log(`Confidence: ${(vulnerability.confidence * 100).toFixed(1)}%`);
                if (vulnerability.codeSnippet) {
                    console.log('\nPotentially Vulnerable Code:');
                    console.log(vulnerability.codeSnippet);
                }
                console.log('----------------------------------------');
            });
        }

        if (results.length === 0) {
            console.log('No vulnerabilities detected.');
        }
    } catch (error) {
        console.error('\nError during scan:', error);
    }
}

testScanner().catch(console.error);