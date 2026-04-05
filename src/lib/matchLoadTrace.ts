import { logMobileRuntimeCritical } from './mobile/mobileRuntimeDebug';

const MATCH_LOAD_TRACE_KEY = 'bg_match_load_trace';
const MATCH_LOAD_TRACE_TTL_MS = 10 * 60 * 1000;
const MATCH_LOAD_TRACE_MAX_EVENTS = 24;

type MatchLoadTracePayload = Record<string, unknown>;

type MatchLoadTraceResourceSample = {
    name: string;
    initiatorType: string;
    startTimeMs: number;
    responseEndMs: number;
    durationMs: number;
    transferSize: number;
    decodedBodySize: number;
    nextHopProtocol: string;
};

type MatchLoadTraceEvent = {
    stage: string;
    at: number;
    isoAt: string;
    sinceStartMs: number;
    sincePreviousMs: number;
    path: string | null;
    payload?: MatchLoadTracePayload;
};

type MatchLoadTraceRecord = {
    traceId: string;
    source: string;
    gameId?: string;
    matchId?: string;
    startedAt: number;
    lastUpdatedAt: number;
    events: MatchLoadTraceEvent[];
};

type StartMatchLoadTraceInput = {
    source: string;
    stage: string;
    gameId?: string;
    matchId?: string;
    payload?: MatchLoadTracePayload;
};

type AppendMatchLoadTraceInput = {
    stage: string;
    gameId?: string;
    matchId?: string;
    payload?: MatchLoadTracePayload;
};

const getTracePath = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const safeReadTrace = (): MatchLoadTraceRecord | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(MATCH_LOAD_TRACE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as MatchLoadTraceRecord;
        if (
            !parsed
            || typeof parsed.traceId !== 'string'
            || typeof parsed.source !== 'string'
            || typeof parsed.startedAt !== 'number'
            || !Array.isArray(parsed.events)
        ) {
            window.sessionStorage.removeItem(MATCH_LOAD_TRACE_KEY);
            return null;
        }

        if (Date.now() - parsed.startedAt > MATCH_LOAD_TRACE_TTL_MS) {
            window.sessionStorage.removeItem(MATCH_LOAD_TRACE_KEY);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

const safeWriteTrace = (trace: MatchLoadTraceRecord) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.setItem(MATCH_LOAD_TRACE_KEY, JSON.stringify(trace));
    } catch {
        // 忽略 sessionStorage 不可用
    }
};

const buildTraceEvent = (
    trace: Pick<MatchLoadTraceRecord, 'startedAt' | 'events'>,
    stage: string,
    payload?: MatchLoadTracePayload,
): MatchLoadTraceEvent => {
    const at = Date.now();
    const previousAt = trace.events.at(-1)?.at ?? trace.startedAt;

    return {
        stage,
        at,
        isoAt: new Date(at).toISOString(),
        sinceStartMs: at - trace.startedAt,
        sincePreviousMs: at - previousAt,
        path: getTracePath(),
        payload,
    };
};

const emitTraceLog = (trace: MatchLoadTraceRecord, event: MatchLoadTraceEvent) => {
    logMobileRuntimeCritical('MatchLoadTrace', event.stage, {
        traceId: trace.traceId,
        source: trace.source,
        gameId: trace.gameId ?? null,
        matchId: trace.matchId ?? null,
        sinceStartMs: event.sinceStartMs,
        sincePreviousMs: event.sincePreviousMs,
        path: event.path,
        ...event.payload,
    });
};

export const startMatchLoadTrace = ({
    source,
    stage,
    gameId,
    matchId,
    payload,
}: StartMatchLoadTraceInput) => {
    const startedAt = Date.now();
    const trace: MatchLoadTraceRecord = {
        traceId: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
        source,
        gameId,
        matchId,
        startedAt,
        lastUpdatedAt: startedAt,
        events: [],
    };

    const event = buildTraceEvent(trace, stage, payload);
    trace.events.push(event);
    trace.lastUpdatedAt = event.at;
    safeWriteTrace(trace);
    emitTraceLog(trace, event);
    return trace;
};

export const appendMatchLoadTrace = ({
    stage,
    gameId,
    matchId,
    payload,
}: AppendMatchLoadTraceInput) => {
    const trace = safeReadTrace();
    if (!trace) {
        return null;
    }

    if (gameId && trace.gameId && trace.gameId !== gameId) {
        return null;
    }

    if (matchId && trace.matchId && trace.matchId !== matchId) {
        return null;
    }

    if (gameId && !trace.gameId) {
        trace.gameId = gameId;
    }
    if (matchId && !trace.matchId) {
        trace.matchId = matchId;
    }

    const event = buildTraceEvent(trace, stage, payload);
    trace.events.push(event);
    if (trace.events.length > MATCH_LOAD_TRACE_MAX_EVENTS) {
        trace.events.splice(0, trace.events.length - MATCH_LOAD_TRACE_MAX_EVENTS);
    }
    trace.lastUpdatedAt = event.at;
    safeWriteTrace(trace);
    emitTraceLog(trace, event);
    return trace;
};

export const captureRecentMatchLoadResources = (limit = 6): MatchLoadTracePayload => {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
        return {};
    }

    try {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const relevantEntries = entries.filter((entry) => {
            const initiatorType = entry.initiatorType || '';
            const name = entry.name || '';

            if (initiatorType === 'script' || initiatorType === 'link') {
                return true;
            }

            if (initiatorType === 'fetch' || initiatorType === 'xmlhttprequest') {
                return name.includes('/play/')
                    || name.includes('/games/')
                    || name.includes('/match')
                    || name.includes('/assets/');
            }

            return /\.(?:js|mjs|css)(?:[?#]|$)/i.test(name) || name.includes('/assets/');
        });

        const recentResources: MatchLoadTraceResourceSample[] = relevantEntries
            .slice(-Math.max(1, limit))
            .map((entry) => ({
                name: entry.name,
                initiatorType: entry.initiatorType || 'unknown',
                startTimeMs: Math.round(entry.startTime),
                responseEndMs: Math.round(entry.responseEnd),
                durationMs: Math.round(entry.duration),
                transferSize: entry.transferSize ?? 0,
                decodedBodySize: entry.decodedBodySize ?? 0,
                nextHopProtocol: entry.nextHopProtocol || '',
            }));

        if (recentResources.length === 0) {
            return {
                recentResourceCount: 0,
            };
        }

        return {
            recentResourceCount: recentResources.length,
            recentResources,
        };
    } catch (error) {
        return {
            recentResourceCaptureError: error instanceof Error ? error.message : String(error),
        };
    }
};

export const clearMatchLoadTrace = () => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.removeItem(MATCH_LOAD_TRACE_KEY);
    } catch {
        // 忽略 sessionStorage 不可用
    }
};
