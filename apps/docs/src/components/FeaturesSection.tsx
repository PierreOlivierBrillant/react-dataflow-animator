import React from 'react';
import { motion } from 'motion/react';
import { Zap, Layers, Code2, GitFork, Navigation, Palette } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Placement automatique',
    description:
      'Définissez uniquement les lanes — la librairie positionne chaque nœud automatiquement, en left-to-right, circular ou top-to-bottom.',
    color: '#fbbf24',
  },
  {
    icon: Navigation,
    title: 'Lecteur intégré',
    description:
      "Lecture, pause, retour au début et navigation step-by-step. Vos utilisateurs contrôlent l'animation à leur propre rythme.",
    color: '#60a5fa',
  },
  {
    icon: Code2,
    title: 'Spec JSON simple',
    description:
      "Décrivez nœuds, connexions et actions dans un seul objet JSON. TypeScript first, avec un schéma complet pour l'autocomplétion.",
    color: '#a78bfa',
  },
  {
    icon: GitFork,
    title: 'Actions parallèles',
    description:
      'Lancez plusieurs animations simultanément avec le type `parallel`. Idéal pour illustrer des requêtes concurrentes ou microservices.',
    color: '#34d399',
  },
  {
    icon: Layers,
    title: 'Contenu riche',
    description:
      "Les nœuds peuvent afficher du code avec coloration syntaxique, du texte formaté ou des images. Le contenu mute en cours d'animation.",
    color: '#f472b6',
  },
  {
    icon: Palette,
    title: 'Sous-icônes technos',
    description:
      "Ajoutez un badge `subicon` pour afficher une technologie connue (React, PostgreSQL, Node…) ou n'importe quelle icône personnalisée.",
    color: '#22d3ee',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.3),transparent)]" />

      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <motion.p
            className="text-xs uppercase tracking-widest mb-3 text-cyan-400 font-mono"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Fonctionnalités
          </motion.p>
          <motion.h2
            className="text-white text-3xl md:text-4xl font-bold mb-4 font-heading"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Tout ce qu'il vous faut,{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              rien de plus.
            </span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="group rounded-2xl p-6 transition-all duration-300 cursor-default bg-white/[0.025] border border-white/[0.06]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: `${f.color}30`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{
                  background: `${f.color}14`,
                  border: `1px solid ${f.color}28`,
                }}
              >
                <f.icon
                  size={18}
                  style={{ color: f.color }}
                  strokeWidth={1.6}
                />
              </div>
              <h3 className="text-white mb-2 font-heading font-semibold text-base leading-tight">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-100/40 font-sans">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
