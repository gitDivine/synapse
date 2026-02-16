import type {
  AgentConfig,
  AgentFactory,
  AIAgent,
  ProviderType,
} from './types';

class AgentRegistry {
  private factories = new Map<ProviderType, AgentFactory>();
  private configs: AgentConfig[] = [];

  registerProvider(provider: ProviderType, factory: AgentFactory): void {
    this.factories.set(provider, factory);
  }

  registerAgent(config: AgentConfig): void {
    this.configs.push(config);
  }

  createAgent(
    configId: string,
    apiKeys: Partial<Record<ProviderType, string>>
  ): AIAgent {
    const config = this.configs.find((c) => c.id === configId);
    if (!config) throw new Error(`Unknown agent config: ${configId}`);

    const factory = this.factories.get(config.provider);
    if (!factory)
      throw new Error(`No provider registered for: ${config.provider}`);

    const apiKey = apiKeys[config.provider];
    if (!apiKey)
      throw new Error(`No API key for provider: ${config.provider}`);

    return factory(config, apiKey);
  }

  createAvailableAgents(
    apiKeys: Partial<Record<ProviderType, string>>
  ): AIAgent[] {
    return this.configs
      .filter((c) => apiKeys[c.provider])
      .map((c) => this.createAgent(c.id, apiKeys));
  }

  getConfigs(capabilityId?: string): AgentConfig[] {
    if (!capabilityId) return [...this.configs];
    return this.configs.filter((c) =>
      c.capabilities.some((cap) => cap.id === capabilityId)
    );
  }

  getAvailableConfigs(
    apiKeys: Partial<Record<ProviderType, string>>
  ): AgentConfig[] {
    return this.configs.filter((c) => apiKeys[c.provider]);
  }
}

export const agentRegistry = new AgentRegistry();
