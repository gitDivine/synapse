import { Header } from '@/components/shared/header';
import { HeroSection } from '@/components/landing/hero-section';
import { PoweredByBar } from '@/components/landing/powered-by-bar';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { HowItWorks } from '@/components/landing/how-it-works';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { CtaSection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-dvh bg-background flex flex-col">
      <Header />
      <HeroSection />
      <PoweredByBar />
      <FeaturesGrid />
      <HowItWorks />
      <FeatureShowcase />
      <CtaSection />
      <Footer />
    </main>
  );
}
