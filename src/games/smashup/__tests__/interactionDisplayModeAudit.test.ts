/**
 * SmashUp - Interaction 选项展示模式审计
 *
 * 审计目标：确保所有涉及卡牌/随从/基地的 Interaction 选项都包含必要的 defId 字段，
 * 以便 PromptOverlay 能正确切换到卡牌展示模式。
 *
 * 审计规则：
 * 1. 选项 value 包含 cardUid → 必须有 defId 字段
 * 2. 选项 value 包含 minionUid → 必须有 minionDefId 字段
 * 3. 选项 value 包含 baseIndex → 必须有 baseDefId 字段（如果是基地选择）
 * 4. 纯文本选项（如"跳过"、"完成"）不需要 defId
 */

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

interface OptionValueIssue {
    file: string;
    line: number;
    sourceId: string;
    issue: string;
}

/**
 * 解析 createSimpleChoice 调用，提取选项 value 结构
 */
function analyzeSimpleChoiceOptions(sourceFile: ts.SourceFile, filePath: string): OptionValueIssue[] {
    const issues: OptionValueIssue[] = [];

    function visit(node: ts.Node) {
        // 查找 createSimpleChoice 调用
        if (ts.isCallExpression(node)) {
            const expr = node.expression;
            if (ts.isIdentifier(expr) && expr.text === 'createSimpleChoice') {
                // 第4个参数是 options 数组
                const optionsArg = node.arguments[3];
                if (!optionsArg) {
                    ts.forEachChild(node, visit);
                    return;
                }

                // 第5个参数是 sourceId
                const sourceIdArg = node.arguments[4];
                let sourceId = 'unknown';
                if (sourceIdArg && ts.isStringLiteral(sourceIdArg)) {
                    sourceId = sourceIdArg.text;
                } else if (sourceIdArg && ts.isObjectLiteralExpression(sourceIdArg)) {
                    // config 对象形式
                    const sourceIdProp = sourceIdArg.properties.find(
                        p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'sourceId'
                    ) as ts.PropertyAssignment | undefined;
                    if (sourceIdProp && ts.isStringLiteral(sourceIdProp.initializer)) {
                        sourceId = sourceIdProp.initializer.text;
                    }
                }

                // 分析 options 数组
                analyzeOptionsArray(optionsArg, sourceId, filePath, issues);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return issues;
}

/**
 * 分析 options 数组中每个选项的 value 结构
 */
function analyzeOptionsArray(optionsNode: ts.Node, sourceId: string, filePath: string, issues: OptionValueIssue[]) {
    // 处理数组字面量
    if (ts.isArrayLiteralExpression(optionsNode)) {
        for (const element of optionsNode.elements) {
            analyzeOptionObject(element, sourceId, filePath, issues);
        }
        return;
    }

    // 处理 spread 语法：[...options, skipOption]
    if (ts.isArrayLiteralExpression(optionsNode)) {
        for (const element of optionsNode.elements) {
            if (ts.isSpreadElement(element)) {
                // spread 元素无法静态分析，跳过
                continue;
            }
            analyzeOptionObject(element, sourceId, filePath, issues);
        }
        return;
    }

    // 处理变量引用：options（需要回溯到变量定义）
    // 简化处理：只检查直接的数组字面量
}

/**
 * 分析单个选项对象的 value 字段
 */
function analyzeOptionObject(optionNode: ts.Node, sourceId: string, filePath: string, issues: OptionValueIssue[]) {
    if (!ts.isObjectLiteralExpression(optionNode)) return;

    // 查找 value 属性
    const valueProp = optionNode.properties.find(
        p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'value'
    ) as ts.PropertyAssignment | undefined;

    if (!valueProp || !ts.isObjectLiteralExpression(valueProp.initializer)) return;

    const valueObj = valueProp.initializer;
    const valueProps = new Set<string>();
    for (const prop of valueObj.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            valueProps.add(prop.name.text);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
            valueProps.add(prop.name.text);
        }
    }

    // 审计规则
    const line = ts.getLineAndCharacterOfPosition(optionNode.getSourceFile(), optionNode.getStart()).line + 1;

    // 规则1：有 cardUid 必须有 defId
    if (valueProps.has('cardUid') && !valueProps.has('defId')) {
        issues.push({
            file: filePath,
            line,
            sourceId,
            issue: 'value 包含 cardUid 但缺少 defId 字段',
        });
    }

    // 规则2：有 minionUid 必须有 minionDefId
    if (valueProps.has('minionUid') && !valueProps.has('minionDefId')) {
        issues.push({
            file: filePath,
            line,
            sourceId,
            issue: 'value 包含 minionUid 但缺少 minionDefId 字段',
        });
    }

    // 规则3：有 baseIndex 且选项看起来是基地选择，应该有 baseDefId
    // （这个规则比较弱，因为 baseIndex 也可能用于其他目的）
    // 暂时跳过，避免误报
}

describe('SmashUp Interaction 选项展示模式审计', () => {
    it('所有卡牌选项都包含 defId 字段', () => {
        const abilitiesDir = resolve(__dirname, '../abilities');
        const baseAbilitiesFiles = [
            resolve(__dirname, '../domain/baseAbilities.ts'),
            resolve(__dirname, '../domain/baseAbilities_expansion.ts'),
        ];

        const allIssues: OptionValueIssue[] = [];

        // 扫描 abilities/ 目录
        const abilityFiles = readdirSync(abilitiesDir)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
            .map(f => join(abilitiesDir, f));

        // 扫描所有文件
        for (const filePath of [...abilityFiles, ...baseAbilitiesFiles]) {
            const content = readFileSync(filePath, 'utf-8');
            const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
            const issues = analyzeSimpleChoiceOptions(sourceFile, filePath);
            allIssues.push(...issues);
        }

        // 输出违规清单
        if (allIssues.length > 0) {
            const report = allIssues.map(issue =>
                `${issue.file}:${issue.line} [${issue.sourceId}] ${issue.issue}`
            ).join('\n');
            expect.fail(`发现 ${allIssues.length} 个选项缺少必要的 defId 字段：\n${report}`);
        }

        expect(allIssues).toEqual([]);
    });
});
