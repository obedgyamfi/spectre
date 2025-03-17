import { IAIClient, AIProvider } from '../interfaces/IAIClient';
import { ConfigManager } from '../utils/configManager';
import axios from 'axios';

export class ClaudeClient implements IAIClient {
    private apiKey: string | undefined;
    private logger: { appendLine: (message: string) => void };
    private static readonly API_URL = 'https://api.anthropic.com/v1/messages';

    constructor(private configManager: ConfigManager) {
        // Use console.log in test environment
        this.logger = {
            appendLine: (message: string) => console.log(message)
        };
    }

    async initialize(): Promise<void> {
        const apiKey = await this.configManager.getApiKey(AIProvider.Claude);
        if (!apiKey) {
            this.logger.appendLine('Error: Claude API key not configured');
            throw new Error('Claude API key not configured');
        }
        this.apiKey = apiKey;
        this.logger.appendLine('Claude client initialized successfully');
    }

    async analyze(prompt: string): Promise<string> {
        await this.initialize();

        try {
            this.logger.appendLine('Sending analysis request to Claude...');

            const response = await axios.post(
                ClaudeClient.API_URL,
                {
                    model: 'claude-3-opus-20240229',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    response_format: { type: 'json' }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );

            const content = response.data.content[0].text;
            if (!content) {
                this.logger.appendLine('Error: No content received from Claude');
                throw new Error('No content received from Claude');
            }

            // Log raw response for debugging
            this.logger.appendLine(`Raw Claude response: ${content}`);

            // Validate JSON response
            try {
                const parsedContent = JSON.parse(content);
                if (!parsedContent.vulnerabilities || !Array.isArray(parsedContent.vulnerabilities)) {
                    this.logger.appendLine('Invalid response format: Missing vulnerabilities array');
                    throw new Error('Invalid response format: Missing vulnerabilities array');
                }
                this.logger.appendLine(`Successfully validated JSON response with ${parsedContent.vulnerabilities.length} vulnerabilities`);
            } catch (error) {
                this.logger.appendLine(`Invalid JSON response: ${content}`);
                throw new Error('Invalid JSON response from Claude');
            }

            this.logger.appendLine('Successfully received analysis from Claude');
            return content;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.appendLine(`Claude API error: ${error.stack || error.message}`);
                throw new Error(`Claude API error: ${error.message}`);
            }
            this.logger.appendLine('Unknown Claude API error occurred');
            throw new Error('Claude API error: Unknown error occurred');
        }
    }
}