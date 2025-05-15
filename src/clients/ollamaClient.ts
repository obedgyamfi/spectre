// ollama import will be here
import ollama from "ollama";
import { IAIClient, AIProvider } from "../interfaces/IAIClient";
import { json } from "stream/consumers";

const OLLAMA_MODEL = "llama3.2"

export class OllamaClient implements IAIClient {
    private logger: { appendLine: (message: string) => void };
    private ollamaModel!: string;
    private ollamaURL: string | undefined;

    constructor() {
        this.logger = {
            appendLine: (message: string) => console.log(message)
        };
        this.ollamaModel = process.env.OLLAMA_MODEL || OLLAMA_MODEL;
        this.ollamaURL = process.env.OLLAMA_URL || "http://localhost:11434";
    }

    // async initialize(): Promise<void> {
    //     this.ollamaURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    //     if(this.ollama) return ;
    //     if (!this.ollamaURL) {
    //         this.logger.appendLine('Error: Ollama URL not configured');
    //         throw new Error('Ollama URL not configured');
    //     }

    //     this.ollamaModel = process.env.OLLAMA_MODEL || OLLAMA_MODEL;
    //     this.logger.appendLine('Ollama client initialized successfully');
    // }
    async initialize(): Promise<void> {
        return undefined ;
    }

    async analyze(prompt: string): Promise<string> {
        const model = this.ollamaModel;
        try {
            this.logger.appendLine('Sending analysis request to Ollama...');

            const response = await ollama?.chat(
                {
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        },
                    ]
                }
            )

            const content = response.message?.content;

            if(!content) {
                this.logger.appendLine('Error: No content received from Ollama');
                throw new Error('No content received from Ollama');
            }
            
            // log raw response for debugging
            this.logger.appendLine(`Raw Ollama response: ${content}`);

            // Validate JSON response 
            // try {
            //     const parsedContent = JSON.parse(content);
            //     if(!parsedContent.vulnerabilities || !Array.isArray(parsedContent.vulnerabilities)) {
            //         this.logger.appendLine('Invalid response format: Missing vulnerabilities array');
            //         throw new Error('Invalid response format: Missing vulnerabilities array');
            //     }
            //     this.logger.appendLine(`Sucessfully validated JSON response with ${parsedContent.vulnerabilities.length} vulnerabilities`);
            // } catch (error) {
            //     this.logger.appendLine(`Invalid JSON repsonse: ${content}`);
            //     throw new Error('Invalid JSON response from Ollama Server');
            // }

            try {
                const jsonStart = content.indexOf('{');
                if (jsonStart == -1){
                    throw new Error('No JSON found in response');
                }
                const jsonString = content.substring(jsonStart);
                const parsedContent = JSON.parse(jsonString);

                if (!parsedContent.vulnerabilities || !Array.isArray(parsedContent.vulnerabilities)){
                    this.logger.appendLine('Invalid repsonse format: Missing vulnerabilites array');
                    throw new Error('Invalid response format: Missing vulnerabilites array');
                }

                this.logger.appendLine(`Successfully validate JSON response with ${parsedContent}`);
            } catch(error){
                this.logger.appendLine(`Invalid JSON reponse: {error}`);
                throw new Error('Invalid JSON response from Ollama Server');
            }
            
            this.logger.appendLine('Successfully received analysis from Ollama Server');
            return content;
        } catch (error) {
            const errMsg = error instanceof Error ? error.stack || error.message : "Unknown error";
            this.logger.appendLine(`Ollama Server error: ${errMsg}`);
            throw new Error("Ollama Server error: " + errMsg);
        }
    }

}