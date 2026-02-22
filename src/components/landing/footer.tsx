export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-raised px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Logo + tagline */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">SYNAPSE</span>
              <span className="ml-2 text-xs text-text-muted">Multi-Agent AI Conversation Platform</span>
            </div>
          </div>

          {/* Tech */}
          <p className="text-xs text-text-muted">
            Built with Next.js and Tailwind CSS
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} SYNAPSE
          </p>
        </div>
      </div>
    </footer>
  );
}
