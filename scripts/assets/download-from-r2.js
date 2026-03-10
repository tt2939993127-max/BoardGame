/**
 * 从 Cloudflare R2 下载资源到本地 public/assets
 * 
 * 使用方式：
 *   npm run assets:download                        — 增量下载图片素材（跳过音频）
 *   npm run assets:download -- --include-audio     — 下载全部资源（含音频）
 *   npm run assets:download -- --force             — 强制下载所有文件（覆盖本地）
 *   npm run assets:download -- --check             — 只检查差异，不下载
 *   npm run assets:download -- --clean             — 下载前清理本地多余文件（R2 上不存在的）
 * 
 * 环境变量（优先读 .env，fallback 到 .env.example）：
 * - R2_ACCOUNT_ID: Cloudflare 账户 ID
 * - R2_ACCESS_KEY_ID: R2 访问密钥 ID
 * - R2_SECRET_ACCESS_KEY: R2 访问密钥
 * - R2_BUCKET_NAME: R2 存储桶名称
 * 
 * 合作者 clone 后只需 npm install → npm run assets:download 即可拉取资源。
 */

import { config } from 'dotenv';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { createHash } from 'crypto';

// 加载环境变量：优先 .env，回退到 .env.example
if (existsSync('.env')) {
  config({ path: '.env' });
} else {
  console.log('⚠️  未找到 .env 文件，使用 .env.example 中的配置');
  config({ path: '.env.example' });
}

// R2 配置
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const REMOTE_PREFIX = 'official/';
const LOCAL_BASE = join(process.cwd(), 'public', 'assets');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const forceDownload = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');
const cleanLocal = process.argv.includes('--clean');

/** 音频文件扩展名 */
const AUDIO_EXTS = new Set(['.ogg', '.mp3', '.wav', '.flac', '.m4a']);

/** 
 * 过滤不需要下载的文件：
 * - 跳过 compressed/ 目录下的 JSON（R2 残留）
 * - 跳过音频文件（合作者通常只需要图片素材）
 * 如需下载音频，使用 --include-audio 参数
 */
const includeAudio = process.argv.includes('--include-audio');

function shouldDownload(remoteKey) {
  const rel = remoteKey.slice(REMOTE_PREFIX.length);
  if (rel.includes('compressed/') && rel.endsWith('.json')) return false;
  if (!includeAudio) {
    const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
    if (AUDIO_EXTS.has(ext)) return false;
    // 跳过音频目录下的所有文件（包括 registry.json 等）
    if (rel.includes('/sfx/') || rel.includes('/bgm/') || rel.startsWith('common/audio/')) return false;
  }
  return true;
}

/** 计算文件 MD5 */
function computeMD5(buffer) {
  return createHash('md5').update(buffer).digest('hex');
}

/** 列出 R2 上所有远程对象 */
async function listRemoteObjects() {
  const remoteFiles = new Map(); // key -> etag
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: REMOTE_PREFIX,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        const etag = obj.ETag?.replace(/"/g, '');
        remoteFiles.set(obj.Key, { etag, size: obj.Size });
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return remoteFiles;
}

/** 下载单个文件 */
async function downloadFile(remoteKey, localPath) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: remoteKey,
  });

  const response = await s3Client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // 确保目录存在
  const dir = dirname(localPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(localPath, buffer);
  return buffer.length;
}

/** 递归收集本地文件（用于 --clean 模式） */
function getAllLocalFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllLocalFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/** 格式化文件大小 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  // 检查环境变量
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('❌ 缺少 R2 环境变量，请在 .env 中配置 R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME');
    process.exit(1);
  }

  console.log('🔍 获取 R2 远程文件列表...');
  const remoteFiles = await listRemoteObjects();
  console.log(`📦 远程共 ${remoteFiles.size} 个文件\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  for (const [remoteKey, { etag, size }] of remoteFiles) {
    // 跳过不需要下载的文件
    if (!shouldDownload(remoteKey)) continue;

    // official/i18n/zh-CN/dicethrone/... → public/assets/i18n/zh-CN/dicethrone/...
    const relativePath = remoteKey.slice(REMOTE_PREFIX.length);
    const localPath = join(LOCAL_BASE, relativePath);

    try {
      // 增量检测：本地文件存在且 MD5 匹配则跳过
      if (!forceDownload && existsSync(localPath)) {
        const localContent = readFileSync(localPath);
        const localMD5 = computeMD5(localContent);
        if (localMD5 === etag) {
          skipped++;
          continue;
        }
        if (checkOnly) {
          console.log(`🔄 变更: ${relativePath}  (本地 md5=${localMD5}, 远程 etag=${etag})`);
          continue;
        }
      } else if (!forceDownload && checkOnly) {
        console.log(`🆕 缺失: ${relativePath}  (${formatSize(size)})`);
        continue;
      }

      if (checkOnly) {
        console.log(`📥 待下载: ${relativePath}  (${formatSize(size)})`);
        continue;
      }

      const bytes = await downloadFile(remoteKey, localPath);
      totalBytes += bytes;
      downloaded++;
      console.log(`✅ ${relativePath}  (${formatSize(bytes)})`);
    } catch (error) {
      console.error(`❌ ${relativePath}: ${error.message}`);
      failed++;
    }
  }

  // --clean 模式：删除本地多余文件（仅限 compressed/ 和音频目录下的文件）
  let cleaned = 0;
  if (cleanLocal && !checkOnly) {
    const remoteRelPaths = new Set();
    for (const key of remoteFiles.keys()) {
      remoteRelPaths.add(key.slice(REMOTE_PREFIX.length).replace(/\//g, sep));
    }

    const localFiles = getAllLocalFiles(LOCAL_BASE);
    for (const localFile of localFiles) {
      const rel = relative(LOCAL_BASE, localFile);
      // 只清理媒体文件（compressed 目录下的 webp、音频 ogg、svg），不动 JSON 等配置
      const isMedia = rel.includes('compressed') || rel.endsWith('.ogg') || rel.endsWith('.svg');
      if (isMedia && !remoteRelPaths.has(rel)) {
        unlinkSync(localFile);
        console.log(`🗑️  ${rel}`);
        cleaned++;
      }
    }
  }

  console.log('');
  if (checkOnly) {
    const missing = [...remoteFiles.entries()].filter(([key]) => {
      const rel = key.slice(REMOTE_PREFIX.length);
      return !existsSync(join(LOCAL_BASE, rel));
    }).length;
    console.log(`📋 检查完成！缺失 ${missing} 个文件，已有 ${skipped} 个（未变更）`);
  } else {
    console.log(`✨ 下载完成！下载 ${downloaded} 个（${formatSize(totalBytes)}），跳过 ${skipped}（未变更），清理 ${cleaned}，失败 ${failed}`);
  }
}

main().catch(console.error);
