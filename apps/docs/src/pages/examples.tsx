import Layout from '@theme/Layout';
import { motion } from 'motion/react';
import { DemoGallery } from '../components/DemoGallery';

export default function ExamplesPage() {
  return (
    <Layout
      title="Exemples"
      description="Parcourez la galerie d'exemples : aperçus animés, recherche et filtres par catégorie."
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
              Galerie
            </motion.p>
            <motion.h1
              className="text-white text-3xl md:text-4xl font-bold mb-4 font-heading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Explorez les exemples
            </motion.h1>
            <motion.p
              className="max-w-xl mx-auto text-base leading-[1.7] text-slate-100/50 font-sans"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Survolez une vignette pour voir l'animation, recherchez par
              mot-clé ou filtrez par catégorie. Cliquez pour ouvrir l'aperçu en
              grand, puis chargez la spec dans le Playground.
            </motion.p>
          </div>
        </section>

        <DemoGallery />
      </main>
    </Layout>
  );
}
