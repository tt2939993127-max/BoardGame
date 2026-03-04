#!/usr/bin/env node
/**
 * P0 文件恢复脚本
 * 
 * 从 commit 6ea1f9f 恢复被删除的代码
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

// 需要恢复的文件列表
const filesToRestore = [
    {
        path: 'src/pages/admin/Matches.tsx',
        description: 'MatchDetailModal 功能',
        priority: 1,
        strategy: 'merge', // 需要合并,不能直接覆盖
    },
    {
        path: 'src/games/dicethrone/Board.tsx',
        description: '自动响应系统和变体选择逻辑',
        priority: 2,
        strategy: 'partial', // 部分恢复
    },
    {
        path: 'src/components/game/framework/widgets/RematchActions.tsx',
        description: 'renderButton prop 和可扩展性',
        priority: 2,
        strategy: 'merge',
    },
    {
        path: 'src/games/smashup/__tests__/newOngoingAbilities.test.ts',
        description: '测试用例',
        priority: 3,
        strategy: 'merge',
    },
    {
        path: 'src/games/smashup/__tests__/factionAbilities.test.ts',
        description: '测试用例',
        priority: 3,
        strategy: 'merge',
    },
    {
        path: 'src/games/dicethrone/__tests__/monk-coverage.test.ts',
        description: '测试用例',
        priority: 3,
        strategy: 'merge',
    },
];

function getOldVersion(filePath) {
    try {
        const content = execSync(`git show 6ea1f9f:"${filePath}"`, { encoding: 'utf-8' });
        return content;
    } catch (error) {
        console.error(`❌ 无法获取文件 ${filePath} 的旧版本:`, error.message);
        return null;
    }
}

function getCurrentVersion(filePath) {
    try {
        return readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`❌ 无法读取当前文件 ${filePath}:`, error.message);
        return null;
    }
}

function saveFile(filePath, content) {
    try {
        // 确保目录存在
        const dir = dirname(filePath);
        mkdirSync(dir, { recursive: true });
        
        writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ 已保存: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ 保存文件失败 ${filePath}:`, error.message);
        return false;
    }
}

function restoreFile(fileInfo) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 处理文件: ${fileInfo.path}`);
    console.log(`   描述: ${fileInfo.description}`);
    console.log(`   优先级: P${fileInfo.priority}`);
    console.log(`   策略: ${fileInfo.strategy}`);
    console.log(`${'='.repeat(80)}\n`);

    const oldVersion = getOldVersion(fileInfo.path);
    if (!oldVersion) {
        console.log(`⚠️  跳过: 无法获取旧版本\n`);
        return false;
    }

    const currentVersion = getCurrentVersion(fileInfo.path);
    if (!currentVersion) {
        console.log(`⚠️  跳过: 无法读取当前版本\n`);
        return false;
    }

    // 检查是否有差异
    if (oldVersion === currentVersion) {
        console.log(`✅ 无需恢复: 文件内容相同\n`);
        return true;
    }

    // 根据策略处理
    if (fileInfo.strategy === 'full') {
        // 完全恢复
        console.log(`🔄 完全恢复文件...`);
        return saveFile(fileInfo.path, oldVersion);
    } else {
        // 需要手动合并
        console.log(`⚠️  需要手动合并:`);
        console.log(`   - 旧版本行数: ${oldVersion.split('\n').length}`);
        console.log(`   - 当前版本行数: ${currentVersion.split('\n').length}`);
        console.log(`   - 请手动审查并合并代码\n`);
        
        // 保存旧版本到临时文件供参考
        const tempPath = `temp-${fileInfo.path.replace(/\//g, '-')}.old`;
        saveFile(tempPath, oldVersion);
        console.log(`   - 旧版本已保存到: ${tempPath}`);
        console.log(`   - 当前版本位置: ${fileInfo.path}\n`);
        
        return false;
    }
}

function main() {
    console.log('\n' + '='.repeat(80));
    console.log('P0 文件恢复脚本');
    console.log('='.repeat(80));
    console.log(`\n总共需要处理 ${filesToRestore.length} 个文件\n`);

    const results = {
        success: [],
        needsManual: [],
        failed: [],
    };

    for (const fileInfo of filesToRestore) {
        const result = restoreFile(fileInfo);
        if (result === true) {
            results.success.push(fileInfo.path);
        } else if (result === false && fileInfo.strategy !== 'full') {
            results.needsManual.push(fileInfo.path);
        } else {
            results.failed.push(fileInfo.path);
        }
    }

    // 输出总结
    console.log('\n' + '='.repeat(80));
    console.log('恢复总结');
    console.log('='.repeat(80));
    console.log(`\n✅ 成功恢复: ${results.success.length} 个文件`);
    results.success.forEach(path => console.log(`   - ${path}`));
    
    console.log(`\n⚠️  需要手动合并: ${results.needsManual.length} 个文件`);
    results.needsManual.forEach(path => console.log(`   - ${path}`));
    
    console.log(`\n❌ 失败: ${results.failed.length} 个文件`);
    results.failed.forEach(path => console.log(`   - ${path}`));
    
    console.log('\n' + '='.repeat(80));
    console.log('下一步:');
    console.log('1. 审查需要手动合并的文件');
    console.log('2. 使用 git diff 查看变更');
    console.log('3. 运行 npm run lint 检查代码');
    console.log('4. 运行测试确保功能正常');
    console.log('='.repeat(80) + '\n');
}

main();
