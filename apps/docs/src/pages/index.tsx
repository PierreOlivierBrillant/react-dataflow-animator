import Layout from '@theme/Layout';
import { HeroSection } from '../components/HeroSection';
import { DemoShowcase } from '../components/DemoShowcase';
import { FeaturesSection } from '../components/FeaturesSection';
import { CtaSection } from '../components/CtaSection';
import { useTranslation } from '../i18n';

export default function Home() {
  const t = useTranslation();
  return (
    <Layout title={t.home.pageTitle} description={t.home.pageDescription}>
      <main className="min-h-screen relative z-0">
        <HeroSection />
        <DemoShowcase />
        <FeaturesSection />
        <CtaSection />
      </main>
    </Layout>
  );
}
