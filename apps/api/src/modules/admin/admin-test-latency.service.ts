import { ForbiddenException, Injectable } from '@nestjs/common';

export type AdminTestLatencyState = {
    available: boolean;
    enabled: boolean;
    delayMs: number;
    maxDelayMs: number;
    scope: 'admin-api';
};

export type UpdateAdminTestLatencyInput = {
    enabled?: boolean;
    delayMs?: number;
};

const ALLOWED_ENVS = new Set(['development', 'test']);
const MAX_DELAY_MS = 5000;

@Injectable()
export class AdminTestLatencyService {
    private enabled = false;
    private delayMs = 0;

    getState(): AdminTestLatencyState {
        return {
            available: this.isAvailable(),
            enabled: this.enabled && this.delayMs > 0,
            delayMs: this.enabled ? this.delayMs : 0,
            maxDelayMs: MAX_DELAY_MS,
            scope: 'admin-api',
        };
    }

    update(input: UpdateAdminTestLatencyInput): AdminTestLatencyState {
        this.assertAvailable();

        if (typeof input.delayMs === 'number') {
            this.delayMs = this.normalizeDelayMs(input.delayMs);
        }

        if (typeof input.enabled === 'boolean') {
            this.enabled = input.enabled;
        }

        if (this.delayMs <= 0) {
            this.enabled = false;
        }

        return this.getState();
    }

    reset(): AdminTestLatencyState {
        this.enabled = false;
        this.delayMs = 0;
        return this.getState();
    }

    shouldDelayRequest(path: string): boolean {
        if (!this.isAvailable() || !this.enabled || this.delayMs <= 0) {
            return false;
        }

        return !path.startsWith('/test-latency');
    }

    getDelayMs(): number {
        return this.shouldDelayRequest('/') ? this.delayMs : 0;
    }

    isAvailable(): boolean {
        return ALLOWED_ENVS.has(process.env.NODE_ENV ?? '');
    }

    assertAvailable() {
        if (!this.isAvailable()) {
            throw new ForbiddenException('测试延迟能力仅在 development/test 环境开放');
        }
    }

    private normalizeDelayMs(value: number) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(MAX_DELAY_MS, Math.round(value)));
    }
}
