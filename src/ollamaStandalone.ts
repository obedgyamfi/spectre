import * as fs from 'fs';
import * as path from 'path';
import { VulnerabilityScanner } from './scanner';
import { ConfigManager } from './utils/configManager';
import { AIProvider } from './interfaces/IAIClient';

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

async function runStandaloneScanner() {
    console.log('Starting standalone security scanner...');
    
    // Create mock context
    const mockContext: MockContext = {
        globalState: {
            get: (key: string) => {
                if (key === 'selected-ai-provider') {
                    return AIProvider.Ollama;
                }
                return undefined;
            },
            update: async () => {}
        },
        secrets: {
            get: async (key: string) => {
                // Get API keys from environment
                if (key === 'ollama-api-key') {
                    console.log('Ollama does not require an API key');
                    return undefined;
                }
            },
            store: async () => {}
        }
    };

    // Initialize scanner components
    const configManager = new ConfigManager(mockContext);
    const scanner = new VulnerabilityScanner(configManager);

    // Find test file
    const possiblePaths = [
        path.join(process.cwd(), 'src', 'test', 'test_vulnerability.ts'),
        path.join(process.cwd(), 'test_vulnerability.ts')
    ];

    let testFilePath: string | undefined;
    let testCode: string | undefined;

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
        console.error('Could not find test file!');
        return;
    }

    try {
        // Get current provider
        const currentProvider = await configManager.getSelectedProvider();
        
        console.log('======================================');
        console.log('SCANNING FOR VULNERABILITIES');
        console.log(`File: ${path.basename(testFilePath)}`);
        console.log(`Provider: ${currentProvider}`);
        console.log('======================================');

        // Run the scan
        const results = await scanner.scanCode(testCode, 'typescript');
        
        // Display results
        console.log('\n======================================');
        console.log(`FOUND ${results.length} VULNERABILITIES`);
        console.log('======================================\n');

        // Sort by confidence (highest first)
        results.sort((a, b) => b.confidence - a.confidence);
        
        results.forEach((vuln, index) => {
            const confidence = (vuln.confidence * 100).toFixed(1);
            const status = vuln.confidence >= 0.5 ? 'VALIDATED' : 'UNCONFIRMED';
            
            console.log(`\n[${status}] Vulnerability #${index + 1}: ${vuln.type}`);
            console.log(`Severity: ${vuln.severity}`);
            console.log(`Confidence: ${confidence}%`);
            console.log(`Function: ${vuln.vulnerableFunction}`);
            console.log(`Line: ${vuln.lineNumber}`);
            console.log(`Description: ${vuln.description}`);
            console.log(`Suggestion: ${vuln.suggestion}`);
            
            if (vuln.codeSnippet) {
                console.log('\nCode:');
                console.log(vuln.codeSnippet);
            }
            
            console.log('\n--------------------------------------');
        });
        
        console.log('\nScan completed successfully.');
        
    } catch (error) {
        console.error('Error during scan:', error);
    }
}

// Run the standalone scanner when this module is executed
if (require.main === module) {
    runStandaloneScanner().catch(error => {
        console.error('Standalone scanner failed:', error);
    });
}

export { runStandaloneScanner };