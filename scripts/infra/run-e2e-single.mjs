import { runE2ECommand } from './run-e2e-command.mjs';

function parseArgs(argv) {
    let file = process.env.PW_TEST_MATCH?.trim() ?? '';
    let testCase = process.env.PW_TEST_GREP?.trim() ?? '';
    const playwrightArgs = [];

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '--file' || arg === '--match') {
            file = argv[index + 1]?.trim() ?? '';
            index += 1;
            continue;
        }

        if (arg.startsWith('--file=')) {
            file = arg.slice('--file='.length).trim();
            continue;
        }

        if (arg.startsWith('--match=')) {
            file = arg.slice('--match='.length).trim();
            continue;
        }

        if (arg === '--case' || arg === '--title') {
            testCase = argv[index + 1]?.trim() ?? '';
            index += 1;
            continue;
        }

        if (arg.startsWith('--case=')) {
            testCase = arg.slice('--case='.length).trim();
            continue;
        }

        if (arg.startsWith('--title=')) {
            testCase = arg.slice('--title='.length).trim();
            continue;
        }

        if (!arg.startsWith('-') && !file) {
            file = arg.trim();
            continue;
        }

        if (!arg.startsWith('-') && !testCase) {
            testCase = arg.trim();
            continue;
        }

        playwrightArgs.push(arg);
    }

    return { file, testCase, playwrightArgs };
}

const mode = process.argv[2];
const rawArgs = process.argv.slice(3);

if (!mode) {
    console.error('用法: node scripts/infra/run-e2e-single.mjs <default|ci> <e2e文件路径> [用例名] [...playwrightArgs]');
    process.exit(1);
}

const { file, testCase, playwrightArgs } = parseArgs(rawArgs);

if (!file) {
    console.error('用法: npm run test:e2e:ci:file -- e2e/<文件>.e2e.ts "可选用例名"');
    console.error('示例: npm run test:e2e:ci:file -- e2e/smashup-tutorial.e2e.ts "手机横屏下教程浮层不应跑出视口"');
    process.exit(1);
}

const forwardArgs = [file];
if (testCase) {
    forwardArgs.push('--grep', testCase);
}
forwardArgs.push(...playwrightArgs);

console.log(`[test:e2e:${mode}:file] 目标文件: ${file}${testCase ? ` | 用例: ${testCase}` : ''}`);

await runE2ECommand({
    mode,
    extraArgs: forwardArgs,
});
