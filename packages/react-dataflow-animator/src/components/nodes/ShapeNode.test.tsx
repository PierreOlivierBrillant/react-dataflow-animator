/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ShapeNode } from './ShapeNode';
import {
  SHAPE_TYPES,
  isShapeType,
} from '@react-dataflow-animator/core/render/nodeKinds';

afterEach(cleanup);

describe('ShapeNode — formes géométriques', () => {
  it('rend la forme (SVG) + son texte centré (body), sans pictogramme', () => {
    const { container } = render(
      <ShapeNode object={{ id: 's', type: 'square', body: 'DB' }} />
    );
    const shape = container.querySelector('.rdfa-shape');
    expect(shape).toBeTruthy();
    expect(shape?.classList.contains('rdfa-shape--square')).toBe(true);
    expect(container.querySelector('.rdfa-shape-bg')).toBeTruthy();
    expect(container.querySelector('.rdfa-node-icon')).toBeNull();
    expect(container.querySelector('.rdfa-shape-text')?.textContent).toBe('DB');
  });

  it('sans body : la forme est rendue mais sans zone de texte', () => {
    const { container } = render(
      <ShapeNode object={{ id: 's', type: 'circle' }} />
    );
    expect(container.querySelector('.rdfa-shape--circle')).toBeTruthy();
    expect(container.querySelector('.rdfa-shape-text')).toBeNull();
  });

  it('chaque type de forme rend une géométrie SVG et sa classe dédiée', () => {
    for (const type of SHAPE_TYPES) {
      cleanup();
      const { container } = render(
        <ShapeNode object={{ id: type, type, body: 'x' }} />
      );
      expect(container.querySelector(`.rdfa-shape--${type}`)).toBeTruthy();
      // rect (square/rectangles), ellipse (circle) or polygon (the rest).
      expect(
        container.querySelector(
          '.rdfa-shape-bg rect, .rdfa-shape-bg ellipse, .rdfa-shape-bg polygon'
        )
      ).toBeTruthy();
    }
  });

  it('isShapeType : vrai pour les formes, faux pour pictogrammes et panneaux', () => {
    expect(isShapeType('star')).toBe(true);
    expect(isShapeType('width_rectangle')).toBe(true);
    expect(isShapeType('server')).toBe(false);
    expect(isShapeType('simple_node')).toBe(false);
  });
});
