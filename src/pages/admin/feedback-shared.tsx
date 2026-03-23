/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FeedbackClientContext {
    route?: string;
    mode?: string;
    matchId?: string;
    playerId?: string;
    gameId?: string;
    appVersion?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    language?: string;
    timezone?: string;
}

export interface FeedbackErrorContext {
    message?: string;
    name?: string;
    stack?: string;
    source?: string;
}

export interface FeedbackUser {
    _id: string;
    username: string;
    avatar?: string;
    email?: string;
}

export interface FeedbackItem {
    _id: string;
    userId?: FeedbackUser;
    content: string;
    type: 'bug' | 'suggestion' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    gameName?: string;
    contactInfo?: string;
    actionLog?: string;
    stateSnapshot?: string;
    clientContext?: FeedbackClientContext;
    errorContext?: FeedbackErrorContext;
    createdAt: string;
}

export interface FeedbackAiPayload {
    feedbackId: string;
    createdAt: string;
    type: FeedbackItem['type'];
    severity: FeedbackItem['severity'];
    status: FeedbackItem['status'];
    reporter: string;
    reporterEmail: string | null;
    contactInfo: string | null;
    content: string;
    gameId: string | null;
    screenshotCount: number;
    clientContext: FeedbackClientContext | null;
    errorContext: FeedbackErrorContext | null;
    operationLogs: unknown[];
    stateSnapshot: unknown | null;
    stateSnapshotJson: string | null;
}

const EMBEDDED_IMG_RE = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;

export function extractEmbeddedImages(content: string) {
    return Array.from(content.matchAll(EMBEDDED_IMG_RE), (match) => ({
        alt: match[1] || '',
        src: match[2],
    }));
}

export function hasEmbeddedImage(content: string): boolean {
    EMBEDDED_IMG_RE.lastIndex = 0;
    return EMBEDDED_IMG_RE.test(content);
}

export function extractText(content: string, t: TFunction<'admin'>): string {
    return content.replace(EMBEDDED_IMG_RE, '').trim() || t('feedback.content.onlyImage');
}

export function parseOperationLogs(actionLog?: string): unknown[] {
    if (!actionLog?.trim()) return [];
    try {
        const parsed = JSON.parse(actionLog);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
    } catch {
        return actionLog
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }
}

export function parseStateSnapshot(stateSnapshot?: string): unknown | null {
    if (!stateSnapshot?.trim()) return null;
    try {
        return JSON.parse(stateSnapshot);
    } catch {
        return { parseError: true, raw: stateSnapshot };
    }
}

function inferGameId(stateSnapshot: unknown, fallbackGameId?: string, fallbackGameName?: string): string | null {
    if (stateSnapshot && typeof stateSnapshot === 'object' && 'gameId' in stateSnapshot) {
        const gameId = (stateSnapshot as { gameId?: unknown }).gameId;
        if (typeof gameId === 'string' && gameId.trim()) {
            return gameId;
        }
    }
    if (fallbackGameId?.trim()) return fallbackGameId;
    if (fallbackGameName?.trim()) return fallbackGameName;
    return null;
}

export function buildFeedbackAiPayload(item: FeedbackItem, t: TFunction<'admin'>): FeedbackAiPayload {
    const parsedSnapshot = parseStateSnapshot(item.stateSnapshot);

    return {
        feedbackId: item._id,
        createdAt: item.createdAt,
        type: item.type,
        severity: item.severity,
        status: item.status,
        reporter: item.userId?.username || t('feedback.anonymous'),
        reporterEmail: item.userId?.email ?? null,
        contactInfo: item.contactInfo ?? null,
        content: extractText(item.content, t),
        gameId: inferGameId(parsedSnapshot, item.clientContext?.gameId, item.gameName),
        screenshotCount: extractEmbeddedImages(item.content).length,
        clientContext: item.clientContext ?? null,
        errorContext: item.errorContext ?? null,
        operationLogs: parseOperationLogs(item.actionLog),
        stateSnapshot: parsedSnapshot,
        stateSnapshotJson: item.stateSnapshot ?? null,
    };
}

export function CopyFeedbackButton({
    item,
    t,
    onAiPayloadCopy,
}: {
    item: FeedbackItem;
    t: TFunction<'admin'>;
    onAiPayloadCopy: (payloadText: string) => void;
}) {
    const [copied, setCopied] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);

    const handleCopy = (event: React.MouseEvent) => {
        event.stopPropagation();
        const payloadText = JSON.stringify(buildFeedbackAiPayload(item, t), null, 2);
        navigator.clipboard.writeText(payloadText).then(() => {
            onAiPayloadCopy(payloadText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => undefined);
    };

    const handleCopyJson = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!item.stateSnapshot) return;

        navigator.clipboard.writeText(item.stateSnapshot).then(() => {
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        }).catch(() => undefined);
    };

    return (
        <div className="inline-flex items-center gap-1" data-testid="feedback-copy-actions" data-feedback-id={item._id}>
            <button
                type="button"
                data-testid="feedback-copy-ai-payload"
                onClick={handleCopy}
                className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                    copied
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800'
                )}
                title={t('feedback.actions.copyAll')}
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t('feedback.actions.copied') : t('feedback.actions.copyAll')}
            </button>
            {item.stateSnapshot && (
                <button
                    type="button"
                    data-testid="feedback-copy-state-json"
                    onClick={handleCopyJson}
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                        copiedJson
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800'
                    )}
                    title={t('feedback.stateSnapshot.copy')}
                >
                    {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                    {copiedJson ? t('feedback.stateSnapshot.copied') : 'JSON'}
                </button>
            )}
        </div>
    );
}

export function FeedbackContent({
    content,
    onImageClick,
    t,
}: {
    content: string;
    onImageClick: (src: string) => void;
    t: TFunction<'admin'>;
}) {
    const images = extractEmbeddedImages(content);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    images.forEach((image) => {
        const token = `![${image.alt}](${image.src})`;
        const matchIndex = content.indexOf(token, lastIndex);

        if (matchIndex > lastIndex) {
            const text = content.slice(lastIndex, matchIndex).trim();
            if (text) {
                parts.push(
                    <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                        {text}
                    </p>
                );
            }
        }

        parts.push(
            <button
                key={key++}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onImageClick(image.src);
                }}
                className="block text-left"
            >
                <img
                    src={image.src}
                    alt={image.alt || t('feedback.content.screenshotAlt')}
                    className="max-h-72 max-w-full rounded-xl border border-zinc-200 bg-white object-contain transition-shadow hover:shadow-md"
                />
            </button>
        );

        lastIndex = matchIndex + token.length;
    });

    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
        parts.push(
            <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                {remaining}
            </p>
        );
    }

    if (parts.length === 0) {
        return <p className="text-sm italic text-zinc-400">{t('feedback.content.empty')}</p>;
    }

    return <div className="space-y-3">{parts}</div>;
}

export function formatTime(iso: string, t: TFunction<'admin'>): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return t('feedback.time.justNow');
    if (diffMin < 60) return t('feedback.time.minutesAgo', { count: diffMin });

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t('feedback.time.hoursAgo', { count: diffHour });

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return t('feedback.time.daysAgo', { count: diffDay });

    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatAbsoluteTime(iso: string): string {
    const date = new Date(iso);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
