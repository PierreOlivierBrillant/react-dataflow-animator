/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderSubIcon, subIconNames } from './subIcons';
import { SUB_ICON_CATALOG } from './subIconCatalog';
import { SUB_ICON_GLYPHS } from './subIconData.generated';

describe('renderSubIcon — known tech glyph', () => {
  it('reproduces react-icons IconBase markup exactly', () => {
    const svg = renderSubIcon('nginx');

    // Captured verbatim from the React harness rendering the `spa` demo — this
    // is what `<SiNginx color="#009639" title="nginx" />` actually emits,
    // attribute order included.
    expect(svg.outerHTML).toMatch(
      /^<svg stroke="currentColor" fill="currentColor" stroke-width="0" role="img" viewBox="0 0 24 24" color="#009639" height="1em" width="1em" xmlns="http:\/\/www\.w3\.org\/2000\/svg" style="color: rgb\(0, 150, 57\);"><title>nginx<\/title><path d="M12 0L1\.605 6v12L12 24l10\.395-6V6L12 0z/
    );
  });

  it('carries the colour BOTH as an attribute and in style', () => {
    // `IconBase` excludes only attr/size/title from the spread, so `color`
    // reaches the element twice. Dropping either would be a silent divergence.
    const svg = renderSubIcon('react');

    expect(svg.getAttribute('color')).toBe('#61DAFB');
    expect(svg.style.color).toBe('rgb(97, 218, 251)');
  });

  it('puts <title> before the geometry', () => {
    const svg = renderSubIcon('docker');

    expect(svg.firstElementChild?.tagName).toBe('title');
    expect(svg.firstElementChild?.textContent).toBe('docker');
    expect(svg.children[1].tagName).toBe('path');
  });

  it('preserves the icon`s own viewBox rather than assuming 24×24', () => {
    // FontAwesome and Devicon packs ship other boxes; a hard-coded 24 would
    // scale those glyphs wrongly.
    expect(renderSubIcon('mssql').getAttribute('viewBox')).toBe('0 0 32 32');
    expect(renderSubIcon('aws').getAttribute('viewBox')).toBe('0 0 640 512');
  });

  it('lets an icon override the stroke/fill defaults', () => {
    // `TbApi` ships fill="none" plus its own stroke settings; the defaults must
    // come first in the spread so the icon wins.
    const svg = renderSubIcon('api');

    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke-width')).toBe('2');
  });

  it('is case-insensitive on the badge name', () => {
    expect(renderSubIcon('PostgreSQL').getAttribute('color')).toBe('#4169E1');
  });

  it('resolves every catalogued name to a glyph, never to the text fallback', () => {
    for (const name of subIconNames()) {
      expect(
        renderSubIcon(name).classList.contains('rdfa-subicon-text'),
        `${name} fell through to the text badge`
      ).toBe(false);
    }
  });
});

describe('renderSubIcon — text fallback', () => {
  it('draws the slate disc and the label', () => {
    const svg = renderSubIcon('JWT');

    expect(svg.outerHTML).toBe(
      '<svg viewBox="0 0 24 24" class="rdfa-subicon-text" role="presentation" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="12" fill="#475569"></circle>' +
        '<text x="12" y="12" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="var(--rdfa-font)" font-weight="700" font-size="14" fill="#ffffff">JWT</text>' +
        '</svg>'
    );
  });

  it('keeps the rdfa-subicon-text class — the CSS :has() rule keys off it', () => {
    // `.rdfa-node-badge:has(.rdfa-subicon-text)` supplies the badge backdrop.
    expect(renderSubIcon('v2').classList.contains('rdfa-subicon-text')).toBe(
      true
    );
  });

  // Labels chosen to be ABSENT from the catalogue — `api`, for instance, is a
  // known tech badge and would render the TbApi glyph, not a text disc.
  it.each([
    ['5', 21],
    ['v2', 17],
    ['JWT', 14],
    ['LONG', 11],
  ])('sizes %s at %ipx', (label, size) => {
    const text = renderSubIcon(label).querySelector('text');
    expect(text?.getAttribute('font-size')).toBe(String(size));
  });

  it('truncates past four characters', () => {
    const text = renderSubIcon('VERYLONG').querySelector('text');

    expect(text?.textContent).toBe('VERY');
    expect(text?.getAttribute('font-size')).toBe('11');
  });

  it('preserves the label`s original case', () => {
    expect(renderSubIcon('Gw').querySelector('text')?.textContent).toBe('Gw');
  });
});

describe('catalogue integrity', () => {
  it('has generated data for every catalogued icon', () => {
    const missing = Object.entries(SUB_ICON_CATALOG)
      .filter(([, def]) => !SUB_ICON_GLYPHS[def.icon])
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });

  it('generates no glyph the catalogue does not reference', () => {
    const referenced = new Set(
      Object.values(SUB_ICON_CATALOG).map((d) => d.icon)
    );
    const orphans = Object.keys(SUB_ICON_GLYPHS).filter(
      (n) => !referenced.has(n)
    );

    expect(orphans).toEqual([]);
  });

  it('gives every glyph a viewBox and at least one child', () => {
    for (const [name, glyph] of Object.entries(SUB_ICON_GLYPHS)) {
      expect(glyph.attr.viewBox, `${name} has no viewBox`).toBeDefined();
      expect(glyph.children.length, `${name} has no geometry`).toBeGreaterThan(
        0
      );
    }
  });
});
