import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { TrainingDataRecorder, TrainingDecisionSample } from '../src/engine/transport/trainingData.js';

export interface JsonlTrainingDataRecorderOptions {
    baseDir?: string;
}

export interface TrainingDataCaptureEnv {
    ENABLE_TRAINING_DATA_CAPTURE?: string;
    TRAINING_DATA_DIR?: string;
    NODE_ENV?: string;
}

export class JsonlTrainingDataRecorder implements TrainingDataRecorder {
    private readonly baseDir: string;
    private dirReady: Promise<void> | null = null;

    constructor(options?: JsonlTrainingDataRecorderOptions) {
        this.baseDir = options?.baseDir ?? path.join(process.cwd(), 'memory', 'training-data');
    }

    async recordDecisionSample(sample: TrainingDecisionSample): Promise<void> {
        await this.ensureDir();
        const day = new Date(sample.capturedAt).toISOString().slice(0, 10);
        const gameDir = path.join(this.baseDir, sample.gameId);
        await mkdir(gameDir, { recursive: true });
        const filePath = path.join(gameDir, `${day}.jsonl`);
        await appendFile(filePath, `${JSON.stringify(sample)}\n`, 'utf8');
    }

    private ensureDir(): Promise<void> {
        if (!this.dirReady) {
            this.dirReady = mkdir(this.baseDir, { recursive: true }).then(() => undefined);
        }
        return this.dirReady;
    }
}

export function createTrainingDataRecorderFromEnv(
    env: TrainingDataCaptureEnv = process.env,
): TrainingDataRecorder | undefined {
    const explicitToggle = env.ENABLE_TRAINING_DATA_CAPTURE?.trim().toLowerCase();
    if (explicitToggle === 'false') {
        return undefined;
    }
    if (explicitToggle !== 'true' && env.NODE_ENV !== 'production') {
        return undefined;
    }
    return new JsonlTrainingDataRecorder({
        baseDir: env.TRAINING_DATA_DIR,
    });
}
