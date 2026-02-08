import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ShockwaveProjectile } from '../ShockwaveProjectile';

vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: (_target, tag) => {
      return ({ children, ...rest }: { children?: React.ReactNode }) => (
        React.createElement(tag as string, rest, children)
      );
    },
  });

  return {
    motion,
  };
});

describe('ShockwaveProjectile', () => {
  it('渲染通用气浪投射物并带有关键样式', () => {
    const html = renderToStaticMarkup(
      <ShockwaveProjectile
        start={{ xPct: 10, yPct: 20 }}
        end={{ xPct: 60, yPct: 40 }}
        intensity="strong"
        sizePct={10}
        testId="shockwave-projectile"
      />
    );

    expect(html).toContain('data-testid="shockwave-projectile"');
    expect(html).toContain('linear-gradient(90deg');
    expect(html).toContain('repeating-linear-gradient(90deg');
    expect(html).toContain('clip-path:polygon(0% 0%');
  });
});
