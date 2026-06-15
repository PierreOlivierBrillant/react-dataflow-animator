import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from '@docusaurus/Link';
import { DataFlowPlayer } from 'react-dataflow-animator';
import { demos } from '../site-content';

// Quelques exemples mis en avant sur l'accueil ; la galerie complète
// (recherche + filtres) vit sur la page /examples.
const featured = demos.slice(0, 6);

export function DemoShowcase() {
  const [activeId, setActiveId] = useState(featured[0].id);
  const active = demos.find((d) => d.id === activeId)!;
  const [codeVisible, setCodeVisible] = useState(false);

  return (
    <section className="py-28 relative overflow-hidden">
      {/* Top separator glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-[linear-gradient(90deg,transparent,rgba(124,58,237,0.5),transparent)]" />

      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.p
            className="text-xs uppercase tracking-widest mb-3 text-violet-400 font-mono"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Démonstrations
          </motion.p>
          <motion.h2
            className="text-white text-3xl md:text-4xl font-bold mb-4 font-heading"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Trois lignes de JSON.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Des animations infinies.
            </span>
          </motion.h2>
          <motion.p
            className="max-w-lg mx-auto text-base leading-[1.7] text-slate-100/45 font-sans"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Chaque scénario ci-dessous est généré depuis la spec JSON affichée.
            Modifiez la spec, l'animation se met à jour instantanément.
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {featured.map((demo) => (
            <button
              key={demo.id}
              onClick={() => setActiveId(demo.id)}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm transition-all cursor-pointer font-sans ${activeId === demo.id ? 'bg-violet-600/20 border border-violet-600/50 text-violet-300' : 'bg-white/[0.03] border border-white/[0.07] text-white/45'}`}
            >
              {demo.title}
            </button>
          ))}
        </div>

        {/* Demo + code */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-center mb-6 text-sm text-white/35 font-sans">
              {active.description}
            </p>

            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#0c0a1e] border border-white/[0.07]">
              <DataFlowPlayer
                theme="dark"
                spec={active.spec}
                autoPlay
                loop
                controls
                height={400}
              />
            </div>

            {/* Toggle JSON */}
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setCodeVisible((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all cursor-pointer font-mono text-white/40 border border-white/[0.07] bg-white/[0.02]"
              >
                {codeVisible ? '▲ Masquer' : '▼ Voir la spec JSON'}
              </button>
            </div>

            <AnimatePresence>
              {codeVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.02]">
                    <div className="flex items-center px-4 py-2.5 border-b border-white/[0.06] text-xs text-white/25 font-mono">
                      {active.id}.json
                    </div>
                    <pre className="p-5 text-xs overflow-x-auto font-mono text-violet-400/90 leading-7 m-0 bg-transparent">
                      <code>{JSON.stringify(active.spec, null, 2)}</code>
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Vers la galerie complète */}
        <div className="text-center mt-12">
          <Link
            to="/examples"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-sans text-violet-200 bg-violet-600/15 border border-violet-600/40 hover:bg-violet-600/25 transition-colors no-underline"
          >
            Explorer les {demos.length} exemples
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
