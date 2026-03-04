/**
 * 清理 CDN 上的旧路径（非 i18n 结构）
 * 
 * 删除 official/dicethrone/, official/smashup/, official/summonerwars/, official/tictactoe/
 * 保留 official/i18n/, official/common/
 */

import 'dotenv/config';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const dryRun = !process.argv.includes('--execute');

// 需要删除的旧路径前缀
const OLD_PREFIXES = [
  'official/dicethrone/',
  'official/smashup/',
  'official/summonerwars/',
  'official/tictactoe/',
];

async function listObjects(prefix) {
  const objects = [];
  let continuationToken;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);
    
    if (response.Contents) {
      objects.push(...response.Contents.map(obj => obj.Key));
    }
    
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  
  return objects;
}

async function deleteObjects(keys) {
  if (keys.length === 0) return 0;
  
  let deleted = 0;
  // 批量删除（每次最多 1000 个）
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: batch.map(Key => ({ Key })) },
    });
    await s3Client.send(command);
    deleted += batch.length;
  }
  
  return deleted;
}

async function main() {
  console.log('🔍 扫描需要删除的旧路径文件...\n');
  
  const allToDelete = [];
  
  for (const prefix of OLD_PREFIXES) {
    console.log(`📦 ${prefix}`);
    const objects = await listObjects(prefix);
    console.log(`   找到 ${objects.length} 个文件`);
    allToDelete.push(...objects);
  }
  
  console.log(`\n📊 总计需要删除 ${allToDelete.length} 个文件\n`);
  
  if (allToDelete.length === 0) {
    console.log('✅ 没有需要删除的文件');
    return;
  }
  
  if (dryRun) {
    console.log('💡 这是预览模式，使用 --execute 参数执行实际删除');
    console.log('\n示例文件（前 20 个）：');
    for (const key of allToDelete.slice(0, 20)) {
      console.log(`   ${key}`);
    }
    if (allToDelete.length > 20) {
      console.log(`   ... 还有 ${allToDelete.length - 20} 个`);
    }
    return;
  }
  
  console.log('🗑️  开始删除...\n');
  
  const deleted = await deleteObjects(allToDelete);
  
  console.log(`\n✨ 删除完成！共删除 ${deleted} 个文件`);
}

main().catch(console.error);
