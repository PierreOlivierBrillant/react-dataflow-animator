import { describe, expect, it } from 'vitest';
import { registerNodeIcon, registerSubIcon } from './registry';

/**
 * This file deliberately carries NO environment docblock, so it runs in core's
 * default `node` environment where `document` does not exist. That omission is
 * the test.
 *
 * Do not name the jsdom directive in a comment here, not even to say it is
 * absent: vitest looks for it with a regex over the file, so merely writing it
 * switches this suite to jsdom and quietly destroys what it checks.
 *
 * A consumer may legitimately register icons at module scope in a bundle that
 * also renders on the server. If registration parsed the markup eagerly, that
 * import would crash the server — so parsing is deferred to the first
 * resolution, which only ever happens while rendering in a browser.
 */

describe('icon registration is SSR-safe', () => {
  it('has no document to touch', () => {
    expect(typeof document).toBe('undefined');
  });

  it('accepts markup without parsing it', () => {
    expect(() =>
      registerNodeIcon('ssr-node', '<svg viewBox="0 0 24 24"><rect/></svg>')
    ).not.toThrow();
  });

  it('accepts a factory without calling it', () => {
    expect(() =>
      registerSubIcon('ssr-sub', () => {
        throw new Error('a factory must not run at registration time');
      })
    ).not.toThrow();
  });
});
