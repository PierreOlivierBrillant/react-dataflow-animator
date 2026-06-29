import Layout from '@theme/Layout';
import { motion } from 'motion/react';
import { DemoGallery } from '../components/DemoGallery';
import { useTranslation } from '@site/src/i18n';

export default function ExamplesPage() {
  const t = useTranslation();

  return (
    <Layout
      title={t.examples.pageTitle}
      description={t.examples.pageDescription}
    >
      <main className="min-h-screen bg-surface-alt [color-scheme:dark]">
        {/* En-tête */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-[linear-gradient(90deg,transparent,rgba(124,58,237,0.5),transparent)]" />
          <div className="max-w-6xl mx-auto px-5 pt-16 pb-10 text-center">
            <motion.p
              className="text-xs uppercase tracking-widest mb-3 text-violet-400 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {t.examples.gallery}
            </motion.p>
            <motion.h1
              className="text-white text-3xl md:text-4xl font-bold mb-4 font-heading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {t.examples.title}
            </motion.h1>
            <motion.p
              className="max-w-xl mx-auto text-base leading-[1.7] text-slate-100/50 font-sans"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.examples.subtitle}
            </motion.p>
          </div>
        </section>

        <DemoGallery />
      </main>
    </Layout>
  );
}
