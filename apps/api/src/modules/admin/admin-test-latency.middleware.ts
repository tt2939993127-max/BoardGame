import type { RequestHandler } from 'express';
import { AdminTestLatencyService } from './admin-test-latency.service';

const delay = async (ms: number) => {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export const createAdminTestLatencyMiddleware = (
    latencyService: AdminTestLatencyService,
): RequestHandler => {
    return async (req, _res, next) => {
        if (!latencyService.shouldDelayRequest(req.path)) {
            next();
            return;
        }

        await delay(latencyService.getState().delayMs);
        next();
    };
};
