import Layout from '@theme/Layout';
import { HeroSection } from '../components/HeroSection';
import { DemoShowcase } from '../components/DemoShowcase';
import { FeaturesSection } from '../components/FeaturesSection';
import { CtaSection } from '../components/CtaSection';

export default function Home() {
  return (
    <Layout title="Accueil" description="Animations de flux de données pour React et Docusaurus.">
      <main className="min-h-screen relative z-0">
        <HeroSection />
        <DemoShowcase />
        <FeaturesSection />
        <CtaSection />
      </main>
    </Layout>
  );
}