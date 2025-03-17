import { AIProvider } from '../interfaces/IAIClient';

// Interface that works in both vscode and test environments
export interface ConfigContext {
    globalState: {
        get: (key: string) => any;
        update: (key: string, value: any) => Promise<void>;
    };
    secrets: {
        get: (key: string) => Promise<string | undefined>;
        store: (key: string, value: string) => Promise<void>;
    };
}

export class ConfigManager {
    private static readonly API_KEY_MAP = {
        [AIProvider.OpenAI]: 'openai-api-key',
        [AIProvider.Claude]: 'claude-api-key',
        [AIProvider.Grok]: 'grok-api-key'
    };

    constructor(private context: ConfigContext) {}

    async getApiKey(provider: AIProvider): Promise<string | undefined> {
        return await this.context.secrets.get(ConfigManager.API_KEY_MAP[provider]);
    }

    async setApiKey(provider: AIProvider, apiKey: string): Promise<void> {
        await this.context.secrets.store(ConfigManager.API_KEY_MAP[provider], apiKey);
    }

    async getSelectedProvider(): Promise<AIProvider> {
        return this.context.globalState.get('selected-ai-provider') || AIProvider.OpenAI;
    }

    async setSelectedProvider(provider: AIProvider): Promise<void> {
        await this.context.globalState.update('selected-ai-provider', provider);
    }
}