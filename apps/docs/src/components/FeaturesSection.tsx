import { motion } from 'motion/react';
import { Zap, Layers, Code2, GitFork, Navigation, Palette } from 'lucide-react';
import { useTranslation } from '../i18n';

// Icon and color are purely presentational: they stay here and
// are associated by index to the translated text (`messages.features.items`).
const FEATURE_STYLES = [
  { icon: Zap, color: '#fbbf24' },
  { icon: Navigation, color: '#60a5fa' },
  { icon: Code2, color: '#a78bfa' },
  { icon: GitFork, color: '#34d399' },
  { icon: Layers, color: '#f472b6' },
  { icon: Palette, color: '#22d3ee' },
];

export function FeaturesSection() {
  const t = useTranslation();
  const features = t.features.items.map((item, i) => ({
    ...item,
    ...FEATURE_STYLES[i],
  }));

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
            {t.features.eyebrow}
          </motion.p>
          <motion.h2
            className="text-white text-3xl md:text-4xl font-bold mb-4 font-heading"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {t.features.titlePre}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {t.features.titleHighlight}
            </span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
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
