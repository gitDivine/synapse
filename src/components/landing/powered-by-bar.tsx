import { AnimateOnScroll } from './animate-on-scroll';

const PROVIDERS = [
  { name: 'Groq', model: 'Llama 3' },
  { name: 'Mistral', model: 'Mistral Small' },
  { name: 'Cohere', model: 'Command A' },
  { name: 'Google', model: 'Gemini Flash' },
];

export function PoweredByBar() {
  return (
    <AnimateOnScroll variant="fade-blur">
      <div
        className="px-4 py-6"
        style={{
          borderTop: '1px solid transparent',
          borderBottom: '1px solid transparent',
          backgroundImage:
            'linear-gradient(var(--background), var(--background)), linear-gradient(to right, transparent, var(--border), transparent), linear-gradient(var(--background), var(--background)), linear-gradient(to right, transparent, var(--border), transparent)',
          backgroundOrigin: 'padding-box, border-box, padding-box, border-box',
          backgroundClip: 'padding-box, border-box, padding-box, border-box',
        }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-muted">
            Powered by leading AI models
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PROVIDERS.map((provider) => (
              <div
                key={provider.name}
                className="glass-subtle flex flex-col items-center rounded-full px-4 py-1.5 transition-colors hover:border-accent/20"
              >
                <span className="text-xs font-medium text-text-secondary">{provider.name}</span>
                <span className="text-[10px] text-text-muted">{provider.model}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  );
}
