import { AnimateOnScroll } from './animate-on-scroll';

const PROVIDERS = [
  'Anthropic',
  'OpenAI',
  'Google AI',
  'Groq',
  'Cohere',
  'Together',
  'HuggingFace',
];

export function PoweredByBar() {
  return (
    <AnimateOnScroll>
      <div className="border-y border-border bg-surface-raised/50 px-4 py-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-muted">
            Powered by leading AI models
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {PROVIDERS.map((provider) => (
              <span
                key={provider}
                className="text-xs font-medium text-text-muted/70"
              >
                {provider}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  );
}
