import { GREEK_LOWER, SPACES, SYMBOLS } from './symbols';

/**
 * A LaTeX subset for the prose fields of a spec, delimited GitHub-style by
 * `$…$` — `$B_{in}$` renders B with an "in" subscript.
 *
 * The delimiters are what make this backwards compatible: outside the `$`, text
 * stays literal, so an existing label holding `snake_case` or `a^b` is untouched.
 * Supported inside: `_`/`^` (subscript/superscript), `{}` groups,
 * `\overline{…}`, `\text{…}`/`\mathrm{…}`, spacing commands and the symbol
 * tables (Greek letters, operators, relations, arrows).
 *
 * Deliberately absent: `\frac`, matrices, `$$…$$` display math. Labels on a
 * diagram are one line tall; a construct that needs two would break the layout
 * rather than serve it. See docs/SPEC.md.
 */

/** One atom of a parsed math span. */
export type TexNode =
  /** Upright run: digits, punctuation, operators, `\text{…}`. */
  | { kind: 'text'; value: string }
  /** Italic run: a variable — latin letters, lowercase Greek. */
  | { kind: 'var'; value: string }
  /** Horizontal space, in `em` (may be negative for `\!`). */
  | { kind: 'space'; em: number }
  | { kind: 'sub'; children: TexNode[] }
  | { kind: 'sup'; children: TexNode[] }
  /** `\overline{…}` — the logic complement, drawn as an overbar. */
  | { kind: 'over'; children: TexNode[] };

/** A rich-text string is literal runs interleaved with `$…$` math spans. */
export type RichSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'math'; nodes: TexNode[] };

interface Cursor {
  s: string;
  i: number;
}

/** True when the string holds no math span, so callers can skip rendering work
 *  entirely and hand React a plain string. */
export function isPlainText(input: string): boolean {
  return !input.includes('$');
}

/**
 * Splits a string into literal runs and `$…$` math spans.
 *
 * An unpaired `$` and an escaped `\$` both stay a literal dollar sign: a spec
 * that mentions a price must not silently lose it to a half-open math span.
 */
export function parseRichText(input: string): RichSegment[] {
  const out: RichSegment[] = [];
  let literal = '';
  let i = 0;
  const pushLiteral = () => {
    if (literal) out.push({ kind: 'literal', value: literal });
    literal = '';
  };
  while (i < input.length) {
    const c = input[i];
    if (c === '\\' && input[i + 1] === '$') {
      literal += '$';
      i += 2;
      continue;
    }
    if (c === '$') {
      const end = findClosingDollar(input, i + 1);
      const body = end < 0 ? '' : input.slice(i + 1, end);
      // An empty span (`$$`) is display-math syntax we don't support, and
      // dropping it would silently eat the user's text — keep it literal.
      if (end < 0 || body.trim() === '') {
        literal += c;
        i += 1;
        continue;
      }
      pushLiteral();
      out.push({ kind: 'math', nodes: parseMath(body) });
      i = end + 1;
      continue;
    }
    literal += c;
    i += 1;
  }
  pushLiteral();
  return out;
}

/** Index of the `$` closing a span opened at `from`, or -1. A `\$` inside the
 *  span is an escape, not a terminator. */
function findClosingDollar(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') {
      i += 1;
      continue;
    }
    if (s[i] === '$') return i;
  }
  return -1;
}

/** Parses the body of a math span. */
export function parseMath(src: string): TexNode[] {
  const p: Cursor = { s: src, i: 0 };
  return parseNodes(p, false);
}

/** Parses until end of input, or until the `}` closing the current group. */
function parseNodes(p: Cursor, inGroup: boolean): TexNode[] {
  const out: TexNode[] = [];
  while (p.i < p.s.length) {
    const c = p.s[p.i];
    if (c === '}') {
      p.i += 1;
      if (inGroup) return out;
      continue; // Stray closing brace: ignore it, as LaTeX-lite forgiveness.
    }
    if (c === '{') {
      p.i += 1;
      out.push(...parseNodes(p, true));
      continue;
    }
    if (c === '_' || c === '^') {
      p.i += 1;
      const children = parseArgument(p);
      out.push({ kind: c === '_' ? 'sub' : 'sup', children });
      continue;
    }
    if (c === '\\') {
      const node = parseCommand(p);
      if (node) out.push(...node);
      continue;
    }
    out.push(parseRun(p));
  }
  return out;
}

/** The argument of `_`, `^` or a command: a `{…}` group, a command, or a
 *  single character (`x_1` is `x_{1}`). */
function parseArgument(p: Cursor): TexNode[] {
  while (p.i < p.s.length && p.s[p.i] === ' ') p.i += 1;
  if (p.i >= p.s.length) return [];
  const c = p.s[p.i];
  if (c === '{') {
    p.i += 1;
    return parseNodes(p, true);
  }
  if (c === '\\') return parseCommand(p) ?? [];
  p.i += 1;
  return [isLetter(c) ? { kind: 'var', value: c } : { kind: 'text', value: c }];
}

/** Reads a `\command` and its argument when it takes one. Returns null for an
 *  unknown command, which is dropped along with its backslash. */
function parseCommand(p: Cursor): TexNode[] | null {
  p.i += 1; // consume the backslash
  if (p.i >= p.s.length) return null;
  const c = p.s[p.i];
  // Non-alphabetic commands are single-character: `\,` `\{` `\$`…
  if (!isLetter(c)) {
    p.i += 1;
    if (c in SPACES) return [{ kind: 'space', em: SPACES[c] }];
    return [{ kind: 'text', value: c }];
  }
  let name = '';
  while (p.i < p.s.length && isLetter(p.s[p.i])) name += p.s[p.i++];
  if (name === 'overline')
    return [{ kind: 'over', children: parseArgument(p) }];
  if (name === 'text' || name === 'mathrm' || name === 'operatorname') {
    return [{ kind: 'text', value: flatten(parseArgument(p)) }];
  }
  if (name in SPACES) return [{ kind: 'space', em: SPACES[name] }];
  if (name in GREEK_LOWER) return [{ kind: 'var', value: GREEK_LOWER[name] }];
  if (name in SYMBOLS) return [{ kind: 'text', value: SYMBOLS[name] }];
  return null;
}

/** Reads a run of plain characters, splitting variables from everything else so
 *  each gets its own style: `2x` is an upright 2 next to an italic x. */
function parseRun(p: Cursor): TexNode {
  const start = p.i;
  const variable = isLetter(p.s[p.i]);
  while (p.i < p.s.length && isRunChar(p.s[p.i], variable)) p.i += 1;
  const value = p.s.slice(start, p.i);
  return variable ? { kind: 'var', value } : { kind: 'text', value };
}

function isRunChar(c: string, variable: boolean): boolean {
  if ('{}_^\\$'.includes(c)) return false;
  return isLetter(c) === variable;
}

function isLetter(c: string): boolean {
  return /[A-Za-z]/.test(c);
}

/** Text content of a subtree, for `\text{…}` where nothing but the characters
 *  survives (its argument is upright prose, not math). */
function flatten(nodes: TexNode[]): string {
  return nodes
    .map((n) => {
      if (n.kind === 'text' || n.kind === 'var') return n.value;
      if (n.kind === 'space') return ' ';
      return flatten(n.children);
    })
    .join('');
}
