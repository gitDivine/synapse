export function Footer() {
  return (
    <footer className="glass-subtle border-t-0 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent via-purple-500 to-cyan-500 transition-shadow hover:shadow-[0_0_16px_rgba(99,102,241,0.3)]">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">SYNAPSE</span>
              <span className="ml-2 text-xs text-text-muted">Multi-Agent AI Conversation Platform</span>
            </div>
          </div>

          <p className="text-xs text-text-muted transition-colors hover:text-text-secondary">
            Built with Next.js and Tailwind CSS
          </p>
        </div>

        <div
          className="mt-6 pt-4 text-center"
          style={{
            borderTop: '1px solid transparent',
            backgroundImage: 'linear-gradient(var(--background), var(--background)), linear-gradient(to right, transparent, var(--border), transparent)',
            backgroundOrigin: 'padding-box, border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} SYNAPSE
          </p>
        </div>
      </div>
    </footer>
  );
}
