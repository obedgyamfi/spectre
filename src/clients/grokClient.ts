import { IAIClient, AIProvider } from '../interfaces/IAIClient';
import { ConfigManager } from '../utils/configManager';
import axios from 'axios';

export class GrokClient implements IAIClient {
    private apiKey: string | undefined;
    private logger: { appendLine: (message: string) => void };
    private static readonly API_URL = 'https://api.grok.x/v1/chat/completions';
    
    constructor(private configManager: ConfigManager) {
        // Use console.log in test environment
        this.logger = {
            appendLine: (message: string) => console.log(message)
        };
    }

    async initialize(): Promise<void> {
        const apiKey = await this.configManager.getApiKey(AIProvider.Grok);
        if (!apiKey) {
            this.logger.appendLine('Error: Grok API key not configured');
            throw new Error('Grok API key not configured');
        }
        this.apiKey = apiKey;
        this.logger.appendLine('Grok client initialized successfully');
    }

    async analyze(prompt: string): Promise<string> {
        await this.initialize();

        try {
            this.logger.appendLine('Sending analysis request to Grok...');

            const response = await axios.post(
                GrokClient.API_URL,
                {
                    model: 'grok-1',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    response_format: { type: 'json_object' }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            if (!content) {
                this.logger.appendLine('Error: No content received from Grok');
                throw new Error('No content received from Grok');
            }

            // Log raw response for debugging
            this.logger.appendLine(`Raw Grok response: ${content}`);

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
                throw new Error('Invalid JSON response from Grok');
            }

            this.logger.appendLine('Successfully received analysis from Grok');
            return content;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.appendLine(`Grok API error: ${error.stack || error.message}`);
                throw new Error(`Grok API error: ${error.message}`);
            }
            this.logger.appendLine('Unknown Grok API error occurred');
            throw new Error('Grok API error: Unknown error occurred');
        }
    }
}