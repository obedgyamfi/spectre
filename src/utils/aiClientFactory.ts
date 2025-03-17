import { IAIClient, AIProvider } from '../interfaces/IAIClient';
import { OpenAIClient } from '../clients/openaiClient';
import { ClaudeClient } from '../clients/claudeClient';
import { GrokClient } from '../clients/grokClient';
import { ConfigManager } from './configManager';

export class AIClientFactory {
    static createClient(provider: AIProvider, configManager: ConfigManager): IAIClient {
        switch (provider) {
            case AIProvider.OpenAI:
                return new OpenAIClient(configManager);
            case AIProvider.Claude:
                return new ClaudeClient(configManager);
            case AIProvider.Grok:
                return new GrokClient(configManager);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }
}
