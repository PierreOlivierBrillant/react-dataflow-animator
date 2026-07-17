/**
 * Command tables for the LaTeX subset. Each command resolves to a literal
 * character, so rendering needs no font beyond the theme's — the whole point of
 * not pulling in KaTeX and its woff2 payload.
 *
 * The split mirrors LaTeX's own convention rather than being cosmetic: lowercase
 * Greek letters are variables and render italic, while uppercase Greek letters
 * and operators are upright. `\Omega` staying upright is what makes `10 kΩ` look
 * like a unit instead of a variable.
 */

/** Italic-rendered commands: lowercase Greek, which LaTeX treats as variables. */
export const GREEK_LOWER: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ϵ',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'ϕ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
};

/** Upright commands: uppercase Greek, operators, relations and arrows. */
export const SYMBOLS: Record<string, string> = {
  // Uppercase Greek (upright in LaTeX).
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
  // Binary operators.
  cdot: '·',
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  ast: '∗',
  star: '⋆',
  circ: '∘',
  bullet: '•',
  oplus: '⊕',
  ominus: '⊖',
  otimes: '⊗',
  // Relations.
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  propto: '∝',
  // Logic and sets — the vocabulary the circuit demos actually reach for.
  land: '∧',
  wedge: '∧',
  lor: '∨',
  vee: '∨',
  lnot: '¬',
  neg: '¬',
  forall: '∀',
  exists: '∃',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  subseteq: '⊆',
  cup: '∪',
  cap: '∩',
  emptyset: '∅',
  // Arrows.
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  // Misc.
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  sum: '∑',
  prod: '∏',
  int: '∫',
  sqrt: '√',
  degree: '°',
  deg: '°',
  ldots: '…',
  dots: '…',
  cdots: '⋯',
  prime: '′',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  ohm: 'Ω',
  micro: 'µ',
};

/** Spacing commands, in `em` of the surrounding text. */
export const SPACES: Record<string, number> = {
  ',': 0.167,
  ':': 0.222,
  ';': 0.278,
  ' ': 0.25,
  quad: 1,
  qquad: 2,
  '!': -0.167,
};
