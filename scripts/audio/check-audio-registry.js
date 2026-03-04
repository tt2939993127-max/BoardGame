import 'dotenv/config';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

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

const localPath = join(process.cwd(), 'public', 'assets', 'common', 'audio', 'registry.json');
const remotePath = 'official/common/audio/registry.json';

async function checkRegistry() {
  // 读取本地文件
  const localContent = readFileSync(localPath);
  const localMD5 = createHash('md5').update(localContent).digest('hex');
  const localSize = localContent.length;
  
  console.log('📁 本地文件:', localPath);
  console.log('   MD5:', localMD5);
  console.log('   大小:', localSize, 'bytes\n');
  
  // 获取远程文件信息
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: remotePath,
    });
    const response = await s3Client.send(command);
    const remoteETag = response.ETag?.replace(/"/g, '');
    const remoteSize = response.ContentLength;
    
    console.log('☁️  远程文件:', remotePath);
    console.log('   ETag:', remoteETag);
    console.log('   大小:', remoteSize, 'bytes\n');
    
    if (localMD5 === remoteETag) {
      console.log('✅ 文件一致，无需上传');
    } else {
      console.log('🔄 文件不一致，需要上传');
      console.log('   本地更新时间:', JSON.parse(localContent.toString()).generatedAt);
    }
  } catch (error) {
    if (error.name === 'NotFound') {
      console.log('❌ 远程文件不存在，需要上传');
    } else {
      console.error('❌ 检查失败:', error.message);
    }
  }
}

checkRegistry().catch(console.error);
