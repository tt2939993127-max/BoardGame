#!/usr/bin/env node

import { EventEmitter } from 'node:events';
import { createRequire, syncBuiltinESMExports } from 'node:module';

const require = createRequire(import.meta.url);

function createNoopChildProcess() {
    const child = new EventEmitter();
    child.stdin = null;
    child.stdout = null;
    child.stderr = null;
    child.kill = () => false;
    child.pid = undefined;
    return child;
}

export function installViteWindowsNetUseBypass() {
    if (process.platform !== 'win32' || process.env.BG_VITE_ALLOW_NET_USE === '1') {
        return;
    }

    const childProcess = require('node:child_process');
    if (childProcess.__bgViteNetUseBypassInstalled) {
        return;
    }

    const originalExec = childProcess.exec;
    childProcess.exec = function patchedExec(command, options, callback) {
        const commandText = typeof command === 'string' ? command.trim().toLowerCase() : '';
        if (commandText !== 'net use') {
            return originalExec.apply(this, arguments);
        }

        const cb =
            typeof callback === 'function'
                ? callback
                : typeof options === 'function'
                    ? options
                    : undefined;

        const error = new Error('skip Windows "net use" probe because child_process is restricted');
        error.code = 'EPERM';
        error.syscall = 'spawn';

        if (cb) {
            setImmediate(() => cb(error, '', ''));
        }

        return createNoopChildProcess();
    };

    childProcess.__bgViteNetUseBypassInstalled = true;
    syncBuiltinESMExports();
    console.warn('[vite-net-use-bypass] Skipped Vite Windows "net use" probe. Set BG_VITE_ALLOW_NET_USE=1 to restore it.');
}
