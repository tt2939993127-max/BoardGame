import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const rootDir = process.cwd();
const watchScript = path.join(rootDir, 'scripts', 'deploy', 'watch-game-server-cpu.sh');
const bashCommand = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
const bashPath = (filePath) => process.platform === 'win32' ? filePath.replace(/\\/g, '/') : filePath;

const writeExecutable = (filePath, content) => {
    writeFileSync(filePath, content, { mode: 0o755 });
};

test('持续高 CPU 时必须在重启前保留进程和线程现场', () => {
    if (process.platform === 'win32' && !existsSync('C:\\Program Files\\Git\\bin\\bash.exe')) {
        return;
    }

    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'boardgame-cpu-watch-'));
    const fakeBin = path.join(fixtureRoot, 'bin');
    const evidenceDir = path.join(fixtureRoot, 'evidence');
    const dockerCommandLog = path.join(fixtureRoot, 'docker-commands.log');
    mkdirSync(fakeBin, { recursive: true });

    writeExecutable(path.join(fakeBin, 'docker'), `#!/usr/bin/env bash
set -eu
printf 'docker %s %s\\n' "$1" "${'${2:-}'}" >> "$BG_FAKE_DOCKER_COMMAND_LOG"
case "${'${1:-}'} ${'${2:-}'}" in
  "inspect --format") printf '4242\\n' ;;
  "inspect ") exit 0 ;;
  "stats --no-stream") printf '99.00%% 100MiB / 1GiB 11\\n' ;;
  "ps ") printf 'CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES\\n' ;;
  "top ") printf 'UID PID PPID C STIME TTY TIME CMD\\nroot 4242 1 99 00:00 ? 00:01 node server.mjs\\n' ;;
  "exec boardgame-game-server") printf '# fake container process snapshot\\nTID=1 CPU=99\\n' ;;
  "restart boardgame-game-server") printf 'boardgame-game-server\\n' ;;
  *) exit 0 ;;
esac
`);
    writeExecutable(path.join(fakeBin, 'curl'), '#!/usr/bin/env bash\nexit 0\n');
    writeExecutable(path.join(fakeBin, 'hostname'), '#!/usr/bin/env bash\nprintf test-host\n');
    writeExecutable(path.join(fakeBin, 'uptime'), '#!/usr/bin/env bash\nprintf uptime\n');
    writeExecutable(path.join(fakeBin, 'free'), '#!/usr/bin/env bash\nprintf free\n');
    writeExecutable(path.join(fakeBin, 'df'), '#!/usr/bin/env bash\nprintf df\n');
    writeExecutable(path.join(fakeBin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n');

    const result = spawnSync(bashCommand, [bashPath(watchScript)], {
        cwd: rootDir,
        encoding: 'utf8',
        env: {
            ...process.env,
            PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
            BG_GAME_SERVER_CPU_SAMPLE_COUNT: '1',
            BG_GAME_SERVER_CPU_SAMPLE_INTERVAL_SECONDS: '0',
            BG_GAME_SERVER_CPU_WATCH_RESTART: '1',
            BG_GAME_SERVER_CPU_FEEDBACK: '0',
            BG_GAME_SERVER_CPU_EVIDENCE_DIR: evidenceDir,
            BG_GAME_SERVER_CPU_HISTORY_LOG: path.join(evidenceDir, 'history.log'),
            BG_GAME_SERVER_CPU_STATE_FILE: path.join(fixtureRoot, 'last-restart'),
            BG_GAME_SERVER_CPU_LOCK_FILE: path.join(fixtureRoot, 'watch.lock'),
            BG_FAKE_DOCKER_COMMAND_LOG: dockerCommandLog,
        },
    });

    try {
        assert.equal(result.status, 0, result.stderr || result.stdout);
        const evidenceFiles = readdirSync(evidenceDir).filter((fileName) => fileName.endsWith('.txt'));
        assert.deepEqual(evidenceFiles.length, 1, `expected one evidence file, got: ${evidenceFiles.join(', ')}`);
        const evidenceFile = path.join(evidenceDir, evidenceFiles[0]);
        const evidence = readFileSync(evidenceFile, 'utf8');
        assert.match(evidence, /# high CPU root-cause evidence/);
        assert.match(evidence, /## host thread snapshot/);
        assert.match(evidence, /## container process snapshot/);
        assert.match(evidence, /fake container process snapshot/);
        assert.match(evidence, /# decision/);
        const commandLog = readFileSync(dockerCommandLog, 'utf8');
        assert.ok(
            commandLog.indexOf('docker exec boardgame-game-server') < commandLog.indexOf('docker restart boardgame-game-server'),
            commandLog,
        );
    } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
    }
});
