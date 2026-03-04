#!/usr/bin/env node
/**
 * P2 手动验证脚本 - 智能检查实际功能是否存在
 * 
 * 策略：
 * 1. 对于测试文件：检查关键测试用例是否存在（describe/it 块）
 * 2. 对于数据文件：检查关键数据结构是否存在
 * 3. 对于 i18n 文件：检查关键翻译 key 是否存在
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const HIGH_PRIORITY_FILES = [
  'src/games/dicethrone/__tests__/shield-cleanup.test.ts',
  'src/games/smashup/__tests__/specialInteractionChain.test.ts',
  'src/games/dicethrone/__tests__/monk-coverage.test.ts',
  'src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts',
  'src/games/dicethrone/__tests__/paladin-coverage.test.ts',
  'src/games/dicethrone/__tests__/viewMode.test.ts',
  'src/games/dicethrone/__tests__/pyromancer-behavior.test.ts',
  'src/games/smashup/__tests__/zombieInteractionChain.test.ts',
  'src/games/smashup/__tests__/baseAbilitiesPrompt.test.ts',
  'src/games/dicethrone/__tests__/token-execution.test.ts',
];

function getDeletedTestCases(filePath) {
  try {
    const diff = execSync(`git show 6ea1f9f -- "${filePath}"`, { encoding: 'utf-8' });
    const lines = diff.split('\n');
    
    const deletedTests = [];
    for (const line of lines) {
      if (line.startsWith('-') && !line.startsWith('---')) {
        // 提取 describe/it 测试用例名称
        const describeMatch = line.match(/describe\(['"](.+?)['"]/);
        const itMatch = line.match(/it\(['"](.+?)['"]/);
        
        if (describeMatch) {
          deletedTests.push({ type: 'describe', name: describeMatch[1] });
        } else if (itMatch) {
          deletedTests.push({ type: 'it', name: itMatch[1] });
        }
      }
    }
    
    return deletedTests;
  } catch (error) {
    return [];
  }
}

function checkTestCaseExists(filePath, testCase) {
  if (!existsSync(filePath)) {
    return false;
  }
  
  const content = readFileSync(filePath, 'utf-8');
  
  if (testCase.type === 'describe') {
    return content.includes(`describe('${testCase.name}'`) || 
           content.includes(`describe("${testCase.name}"`);
  } else if (testCase.type === 'it') {
    return content.includes(`it('${testCase.name}'`) || 
           content.includes(`it("${testCase.name}"`);
  }
  
  return false;
}

console.log('# P2 高优先级文件手动验证\n');
console.log('验证策略：检查删除的测试用例是否仍然存在\n');

for (const filePath of HIGH_PRIORITY_FILES) {
  console.log(`\n## ${filePath}\n`);
  
  const deletedTests = getDeletedTestCases(filePath);
  
  if (deletedTests.length === 0) {
    console.log('⚠️  无法提取删除的测试用例（可能是 git show 失败）\n');
    continue;
  }
  
  console.log(`删除的测试用例数量: ${deletedTests.length}\n`);
  
  let existingCount = 0;
  let missingTests = [];
  
  for (const testCase of deletedTests) {
    const exists = checkTestCaseExists(filePath, testCase);
    if (exists) {
      existingCount++;
    } else {
      missingTests.push(testCase);
    }
  }
  
  console.log(`- 仍存在: ${existingCount}/${deletedTests.length}`);
  console.log(`- 缺失: ${missingTests.length}/${deletedTests.length}\n`);
  
  if (missingTests.length > 0) {
    console.log('❌ **需要恢复** - 缺失的测试用例:\n');
    for (const test of missingTests.slice(0, 5)) {
      console.log(`  - ${test.type}: "${test.name}"`);
    }
    if (missingTests.length > 5) {
      console.log(`  - ... 还有 ${missingTests.length - 5} 个`);
    }
  } else {
    console.log('✅ **无需恢复** - 所有测试用例仍然存在');
  }
  
  console.log('\n---');
}
