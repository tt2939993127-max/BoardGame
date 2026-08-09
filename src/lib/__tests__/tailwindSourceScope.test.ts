import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Tailwind 源码检测范围', () => {
  it('只扫描运行时 src 源码，不自动扩散到整个工作区', () => {
    const source = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

    expect(source).toContain('@import "tailwindcss" source(none);');
    expect(source).toContain('@source ".";');
    expect(source).not.toContain('@import "tailwindcss/index.css";');
  });
});
