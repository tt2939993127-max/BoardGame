import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];
const JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.json'];
const SUPPORTED_EXTENSIONS = [...TS_EXTENSIONS, ...JS_EXTENSIONS];

function isRelativeLike(specifier) {
    return specifier.startsWith('./')
        || specifier.startsWith('../')
        || specifier.startsWith('/')
        || specifier.startsWith('file:');
}

function hasSupportedExtension(specifier) {
    const cleaned = specifier.split('?')[0].split('#')[0];
    const ext = path.extname(cleaned);
    return SUPPORTED_EXTENSIONS.includes(ext);
}

function unique(values) {
    return [...new Set(values)];
}

function createResolveCandidates(specifier) {
    const candidates = [];

    if (!hasSupportedExtension(specifier)) {
        for (const ext of SUPPORTED_EXTENSIONS) {
            candidates.push(`${specifier}${ext}`);
        }

        for (const ext of SUPPORTED_EXTENSIONS) {
            candidates.push(`${specifier}/index${ext}`);
        }

        return unique(candidates);
    }

    const ext = path.extname(specifier);
    if (JS_EXTENSIONS.includes(ext)) {
        const base = specifier.slice(0, -ext.length);
        for (const tsExt of TS_EXTENSIONS) {
            candidates.push(`${base}${tsExt}`);
        }
    }

    return unique(candidates);
}

export async function resolve(specifier, context, defaultResolve) {
    try {
        return await defaultResolve(specifier, context, defaultResolve);
    } catch (error) {
        if (!isRelativeLike(specifier)) {
            throw error;
        }
        const code = error instanceof Error && 'code' in error ? error.code : null;
        if (code !== 'ERR_MODULE_NOT_FOUND' && code !== 'ERR_UNSUPPORTED_DIR_IMPORT') {
            throw error;
        }

        const candidates = createResolveCandidates(specifier);
        for (const candidate of candidates) {
            try {
                return await defaultResolve(candidate, context, defaultResolve);
            } catch (candidateError) {
                if (
                    candidateError instanceof Error
                    && 'code' in candidateError
                    && candidateError.code === 'ERR_MODULE_NOT_FOUND'
                ) {
                    continue;
                }
                throw candidateError;
            }
        }

        throw error;
    }
}

function shouldTranspile(url) {
    return TS_EXTENSIONS.some((ext) => url.endsWith(ext));
}

export async function load(url, context, defaultLoad) {
    if (!shouldTranspile(url)) {
        return defaultLoad(url, context, defaultLoad);
    }

    const filename = fileURLToPath(url);
    const sourceText = await fs.readFile(filename, 'utf8');
    const transpiled = ts.transpileModule(sourceText, {
        fileName: filename,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            jsx: ts.JsxEmit.ReactJSX,
            sourceMap: true,
            inlineSources: true,
            allowImportingTsExtensions: true,
            verbatimModuleSyntax: true,
        },
    });

    return {
        format: 'module',
        source: transpiled.outputText,
        shortCircuit: true,
    };
}
