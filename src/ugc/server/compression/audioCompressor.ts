/**
 * UGC 音频压缩器
 * 
 * 将音频压缩为 OGG/MP3 格式（不保留原图）
 * 注：实际压缩需要 ffmpeg 或类似工具
 */

import type {
    AssetVariant,
    AudioCompressionConfig,
    AudioMetadata,
} from '../../assets/types';
import {
    DEFAULT_AUDIO_COMPRESSION,
    COMPRESSED_AUDIO_FORMATS,
    generateAssetPath,
} from '../../assets/types';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// 类型定义
// ============================================================================

/** 压缩输入 */
export interface AudioCompressionInput {
    /** 原始文件 Buffer */
    buffer: Buffer;
    /** 原始文件名 */
    filename: string;
    /** 原始格式 */
    format: string;
    /** 用户 ID */
    userId: string;
    /** 游戏包 ID */
    packageId: string;
    /** 资产 ID */
    assetId: string;
}

/** 压缩输出 */
export interface AudioCompressionOutput {
    /** 是否成功 */
    success: boolean;
    /** 错误信息 */
    error?: string;
    /** 是否跳过（已是压缩格式） */
    skipped: boolean;
    /** 压缩后的 Buffer */
    compressedBuffer?: Buffer;
    /** 变体信息 */
    variant?: AssetVariant;
    /** 元数据 */
    metadata?: AudioMetadata;
}

// ============================================================================
// 音频压缩器
// ============================================================================

export class AudioCompressor {
    private config: AudioCompressionConfig;

    constructor(config: Partial<AudioCompressionConfig> = {}) {
        this.config = { ...DEFAULT_AUDIO_COMPRESSION, ...config };
    }

    /** 检查是否需要压缩 */
    shouldCompress(format: string): boolean {
        const lower = format.toLowerCase().replace('.', '');
        return !COMPRESSED_AUDIO_FORMATS.includes(lower as typeof COMPRESSED_AUDIO_FORMATS[number]);
    }

    /** 压缩音频 */
    async compress(input: AudioCompressionInput): Promise<AudioCompressionOutput> {
        const formatLower = input.format.toLowerCase().replace('.', '');

        // 已是压缩格式，跳过
        if (!this.shouldCompress(formatLower)) {
            return {
                success: true,
                skipped: true,
                compressedBuffer: input.buffer,
                variant: {
                    id: `${input.assetId}-original`,
                    format: formatLower,
                    path: generateAssetPath(input.userId, input.packageId, input.assetId, formatLower),
                    size: input.buffer.length,
                    hash: this.generateHash(input.buffer),
                    url: '',
                },
                metadata: this.extractMetadata(input.buffer, formatLower),
            };
        }

        // 注：实际音频压缩需要 ffmpeg
        // 这里提供一个占位实现，生产环境需要集成 ffmpeg
        try {
            const ffmpegPath = this.resolveFfmpegPath();
            const ffmpegAvailable = await this.checkFfmpeg(ffmpegPath);
            
            if (!ffmpegAvailable) {
                return {
                    success: false,
                    skipped: false,
                    error: 'ffmpeg 未安装，无法压缩音频',
                };
            }

            // TODO: 使用 ffmpeg 进行实际压缩
            // 这里返回占位结果
            const targetFormat = this.config.targetFormat;
            const variantPath = generateAssetPath(input.userId, input.packageId, input.assetId, targetFormat);

            return {
                success: true,
                skipped: false,
                compressedBuffer: input.buffer, // 占位：实际应为压缩后的 buffer
                variant: {
                    id: `${input.assetId}-${targetFormat}`,
                    format: targetFormat,
                    path: variantPath,
                    size: input.buffer.length,
                    hash: this.generateHash(input.buffer),
                    url: '',
                },
                metadata: this.extractMetadata(input.buffer, formatLower),
            };
        } catch (error) {
            return {
                success: false,
                skipped: false,
                error: error instanceof Error ? error.message : '音频压缩失败',
            };
        }
    }

    /** 提取音频元数据 */
    private extractMetadata(_buffer: Buffer, _format: string): AudioMetadata {
        // 简单的元数据提取（生产环境应使用专业库）
        return {
            duration: 0,
            sampleRate: 44100,
            channels: 2,
        };
    }

    /** 生成内容哈希 */
    private generateHash(buffer: Buffer): string {
        let hash = 0;
        for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
            hash = ((hash << 5) - hash + buffer[i]) | 0;
        }
        return Math.abs(hash).toString(36);
    }

    /** 解析 ffmpeg 路径（优先使用项目内相对路径） */
    private resolveFfmpegPath(): string {
        const executable = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const bundledPath = path.resolve(
            process.cwd(),
            'BordGameAsset',
            '工具',
            'ffmpeg-7.1.1-essentials_build',
            'bin',
            executable
        );
        if (fs.existsSync(bundledPath)) {
            return bundledPath;
        }
        return executable;
    }

    /** 检查 ffmpeg 是否可用 */
    private async checkFfmpeg(ffmpegPath: string): Promise<boolean> {
        try {
            const { execFileSync } = await import('child_process');
            execFileSync(ffmpegPath, ['-version'], { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }
}

// ============================================================================
// 工厂函数
// ============================================================================

/** 创建音频压缩器 */
export function createAudioCompressor(config?: Partial<AudioCompressionConfig>): AudioCompressor {
    return new AudioCompressor(config);
}
