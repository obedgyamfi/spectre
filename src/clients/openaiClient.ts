import OpenAI from 'openai';
import { ConfigManager } from '../utils/configManager';
import { IAIClient, AIProvider } from '../interfaces/IAIClient';

export class OpenAIClient implements IAIClient {
    private openai!: OpenAI;
    private logger: { appendLine: (message: string) => void };

    constructor(private configManager: ConfigManager) {
        // Use console.log in test environment, vscode.window.createOutputChannel in extension
        this.logger = {
            appendLine: (message: string) => console.log(message)
        };
    }

    async initialize(): Promise<void> {
        const apiKey = await this.configManager.getApiKey(AIProvider.OpenAI);
        if (!apiKey) {
            this.logger.appendLine('Error: OpenAI API key not configured');
            throw new Error('OpenAI API key not configured');
        }
        this.openai = new OpenAI({ apiKey });
        this.logger.appendLine('OpenAI client initialized successfully');
    }

    async analyze(prompt: string): Promise<string> {
        await this.initialize();

        try {
            this.logger.appendLine('Sending analysis request to OpenAI...');
            // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are a security expert analyzing code for vulnerabilities. Focus on identifying security issues like SQL injection, XSS, buffer overflows, and authentication flaws. Always respond in the exact JSON format specified in the user's prompt."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2 // Lower temperature for more consistent, focused analysis
            });

            const content = response.choices[0].message.content;
            if (!content) {
                this.logger.appendLine('Error: No content received from OpenAI');
                throw new Error('No content received from OpenAI');
            }

            // Log raw response for debugging
            this.logger.appendLine(`Raw OpenAI response: ${content}`);

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
                throw new Error('Invalid JSON response from OpenAI');
            }

            this.logger.appendLine('Successfully received analysis from OpenAI');
            return content;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.appendLine(`OpenAI API error: ${error.stack || error.message}`);
                throw new Error(`OpenAI API error: ${error.message}`);
            }
            this.logger.appendLine('Unknown OpenAI API error occurred');
            throw new Error('OpenAI API error: Unknown error occurred');
        }
    }
}