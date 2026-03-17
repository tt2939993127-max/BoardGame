#!/usr/bin/env node

import { assertChildProcessSupport } from './assert-child-process-support.mjs';
import { installViteWindowsNetUseBypass } from './vite-windows-net-use-bypass.mjs';

const readCliFlagValue = (flagName) => {
    const exactFlag = `--${flagName}`;
    const prefix = `${exactFlag}=`;

    for (let index = 2; index < process.argv.length; index += 1) {
        const arg = process.argv[index];
        if (arg === exactFlag) {
            const next = process.argv[index + 1];
            return next && !next.startsWith('-') ? next : undefined;
        }

        if (arg.startsWith(prefix)) {
            return arg.slice(prefix.length);
        }
    }

    return undefined;
};

const shouldProbeFork = () => {
    const pool = readCliFlagValue('pool');
    return pool == null || pool === 'forks' || pool === 'vmForks';
};

installViteWindowsNetUseBypass();
await assertChildProcessSupport('Vitest CLI', {
    probeEsbuild: true,
    probeFork: shouldProbeFork(),
});

await import(new URL('../../node_modules/vitest/vitest.mjs', import.meta.url));
