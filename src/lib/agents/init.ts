import { agentRegistry } from './registry';
import { AGENT_CONFIGS } from './configs';
import { register as registerOpenAI } from './providers/openai';
import { register as registerAnthropic } from './providers/anthropic';
import { register as registerGoogle } from './providers/google';
import { register as registerGroq } from './providers/groq';
import { register as registerOpenRouter } from './providers/openrouter';
import { register as registerCohere } from './providers/cohere';
import { register as registerTogether } from './providers/together';
import { register as registerHuggingFace } from './providers/huggingface';

let initialized = false;

export function initializeAgents() {
  if (initialized) return;

  // Register all provider factories
  registerOpenAI();
  registerAnthropic();
  registerGoogle();
  registerGroq();
  registerOpenRouter();
  registerCohere();
  registerTogether();
  registerHuggingFace();

  // Register all agent configurations
  for (const config of AGENT_CONFIGS) {
    agentRegistry.registerAgent(config);
  }

  initialized = true;
}
