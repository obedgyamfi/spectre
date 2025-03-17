export interface IAIClient {
    analyze(prompt: string): Promise<string>;
    initialize(): Promise<void>;
}

export enum AIProvider {
    OpenAI = 'openai',
    Claude = 'claude',
    Grok = 'grok'
}

export interface AIClientConfig {
    provider: AIProvider;
    apiKey: string;
}
