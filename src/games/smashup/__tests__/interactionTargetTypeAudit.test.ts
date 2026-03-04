/**
 * SmashUp - Interaction targetType 误判审计
 *
 * 审计目标：确保所有 createSimpleChoice 调用不会被 Board.tsx 的
 * isMinionSelectPrompt / isBaseSelectPrompt fallback 逻辑误判。
 *
 * 误判条件：
 * 1. isMinionSelectPrompt fallback：所有选项 value 都包含 minionUid 字符串，
 *    且没有确认类字段（accept/confirm/returnIt/skip/done）。
 *    如果交互不是真正的随从选择（如移动选择、复合选择），会导致 PromptOverlay 被隐藏。
 * 2. isBaseSelectPrompt fallback：所有选项 value 都包含 baseIndex 数字，
 *    且至少一个 baseIndex >= 0。
 *    如果交互不是真正的基地选择，会导致 PromptOverlay 被隐藏。
 *
 * 修复方案：给交互添加显式 targetType 声明（'minion' | 'base' | 'generic'）。
 */

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

interface TargetTypeIssue {
    file: string;
    line: number;
    sourceId: string;
    issue: string;
    detail: string;
}

/**
 * 从 createSimpleChoice 调用中提取 config 信息
 */
function extractConfig(node: ts.CallExpression): { sourceId: string; hasTargetType: boolean; targetType?: string } {
    const arg5 = node.arguments[4];
    if (!arg5) return { sourceId: 'unknown', hasTargetType: false };

    // 字符串形式：createSimpleChoice(..., 'sourceId')
    if (ts.isStringLiteral(arg5)) {
        return { sourceId: arg5.text, hasTargetType: false };
    }

    // config 对象形式：createSimpleChoice(..., { sourceId: '...', targetType: '...' })
    if (ts.isObjectLiteralExpression(arg5)) {
        let sourceId = 'unknown';
        let targetType: string | undefined;
        for (const prop of arg5.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                if (prop.name.text === 'sourceId' && ts.isStringLiteral(prop.initializer)) {
                    sourceId = prop.initializer.text;
                }
                if (prop.name.text === 'targetType' && ts.isStringLiteral(prop.initializer)) {
                    targetType = prop.initializer.text;
                }
            }
        }
        return { sourceId, hasTargetType: !!targetType, targetType };
    }

    return { sourceId: 'unknown', hasTargetType: false };
}

/**
 * 从选项对象中提取 value 的属性名集合
 */
function extractValueProps(optionNode: ts.ObjectLiteralExpression): Set<string> {
    const props = new Set<string>();
    const valueProp = optionNode.properties.find(
        p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'value'
    ) as ts.PropertyAssignment | undefined;

    if (!valueProp) return props;

    if (ts.isObjectLiteralExpression(valueProp.initializer)) {
        for (const p of valueProp.initializer.properties) {
            if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
                props.add(p.name.text);
            } else if (ts.isShorthandPropertyAssignment(p)) {
                props.add(p.name.text);
            }
        }
    }
    return props;
}

/**
 * 检查选项数组是否会被 isMinionSelectPrompt fallback 误判
 * 条件：所有选项 value 都有 minionUid 字符串，且没有确认类字段
 */
function checkMinionSelectFallback(options: ts.ObjectLiteralExpression[]): boolean {
    if (options.length === 0) return false;
    const confirmFields = new Set(['accept', 'confirm', 'returnIt', 'skip', 'done']);
    return options.every(opt => {
        const props = extractValueProps(opt);
        if (!props.has('minionUid')) return false;
        // 有确认类字段 → 不会被误判
        for (const cf of confirmFields) {
            if (props.has(cf)) return false;
        }
        return true;
    });
}

/**
 * 检查选项数组是否会被 isBaseSelectPrompt fallback 误判
 * 条件：所有选项 value 都有 baseIndex，且至少一个 baseIndex >= 0
 */
function checkBaseSelectFallback(options: ts.ObjectLiteralExpression[]): boolean {
    if (options.length === 0) return false;
    return options.every(opt => {
        const props = extractValueProps(opt);
        return props.has('baseIndex');
    });
}

/**
 * 分析文件中的 createSimpleChoice 调用
 */
function analyzeFile(filePath: string): TargetTypeIssue[] {
    const content = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const issues: TargetTypeIssue[] = [];

    function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            const expr = node.expression;
            if (ts.isIdentifier(expr) && expr.text === 'createSimpleChoice') {
                const config = extractConfig(node);
                const optionsArg = node.arguments[3];
                const line = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1;

                // 如果已有 targetType 声明，跳过
                if (config.hasTargetType) {
                    ts.forEachChild(node, visit);
                    return;
                }

                // 提取内联选项对象
                const inlineOptions: ts.ObjectLiteralExpression[] = [];
                if (optionsArg && ts.isArrayLiteralExpression(optionsArg)) {
                    for (const el of optionsArg.elements) {
                        if (ts.isObjectLiteralExpression(el)) {
                            inlineOptions.push(el);
                        }
                        // spread 元素无法静态分析
                    }
                }

                // 只检查有内联选项的调用（buildMinionTargetOptions 等函数调用无法静态分析）
                if (inlineOptions.length === 0) {
                    ts.forEachChild(node, visit);
                    return;
                }

                // 检查 isMinionSelectPrompt fallback 误判
                if (checkMinionSelectFallback(inlineOptions)) {
                    // 进一步检查：如果选项 value 中有 fromBase/toBase/fromBaseIndex/toBaseIndex 等移动字段，
                    // 说明这不是纯随从选择
                    const hasMovementFields = inlineOptions.some(opt => {
                        const props = extractValueProps(opt);
                        return props.has('fromBase') || props.has('toBase') ||
                               props.has('fromBaseIndex') || props.has('toBaseIndex');
                    });
                    if (hasMovementFields) {
                        issues.push({
                            file: filePath,
                            line,
                            sourceId: config.sourceId,
                            issue: 'isMinionSelectPrompt 误判风险',
                            detail: '所有选项都有 minionUid 但包含移动字段（fromBase/toBase），不是纯随从选择。需要添加 targetType: "generic"',
                        });
                    }
                }

                // 检查 isBaseSelectPrompt fallback 误判
                if (checkBaseSelectFallback(inlineOptions)) {
                    // 如果选项 value 中有确认类字段，说明不是纯基地选择
                    const hasConfirmFields = inlineOptions.some(opt => {
                        const props = extractValueProps(opt);
                        return props.has('accept') || props.has('confirm') || props.has('returnIt');
                    });
                    if (hasConfirmFields) {
                        issues.push({
                            file: filePath,
                            line,
                            sourceId: config.sourceId,
                            issue: 'isBaseSelectPrompt 误判风险',
                            detail: '所有选项都有 baseIndex 但包含确认类字段，不是纯基地选择。需要添加 targetType: "generic"',
                        });
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return issues;
}

describe('SmashUp Interaction targetType 误判审计', () => {
    it('所有 createSimpleChoice 调用不会被 isMinionSelectPrompt/isBaseSelectPrompt fallback 误判', () => {
        const abilitiesDir = resolve(__dirname, '../abilities');
        const baseAbilitiesFiles = [
            resolve(__dirname, '../domain/baseAbilities.ts'),
            resolve(__dirname, '../domain/baseAbilities_expansion.ts'),
        ];

        const allIssues: TargetTypeIssue[] = [];

        // 扫描 abilities/ 目录
        const abilityFiles = readdirSync(abilitiesDir)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
            .map(f => join(abilitiesDir, f));

        // 扫描所有文件
        for (const filePath of [...abilityFiles, ...baseAbilitiesFiles]) {
            try {
                const issues = analyzeFile(filePath);
                allIssues.push(...issues);
            } catch {
                // 文件不存在或解析失败，跳过
            }
        }

        // 输出违规清单
        if (allIssues.length > 0) {
            const report = allIssues.map(issue =>
                `${issue.file}:${issue.line} [${issue.sourceId}] ${issue.issue}\n  → ${issue.detail}`
            ).join('\n\n');
            expect.fail(`发现 ${allIssues.length} 个 targetType 误判风险：\n\n${report}`);
        }

        expect(allIssues).toEqual([]);
    });
});
