import { useCallback, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '../../components/common/media/OptimizedImage';
import { CardPreview } from '../../components/common/media/CardPreview';
import { FxLayer, useFxBus } from '../../engine/fx';
import { FLOW_COMMANDS } from '../../engine/systems/FlowSystem';
import type { PlayerId } from '../../engine/types';
import type { GameBoardProps } from '../../engine/transport/protocol';
import { useRuntimeViewport } from '../../hooks/ui/useRuntimeViewport';
import type { ArenaZoneId } from './domain/ids';
import { MAGE_WARS_COMMANDS, type MageWarsCore, type MageWarsPlayerState } from './domain';
import { getApprenticeMageSetup, getApprenticeSpellbook } from './domain/data/apprenticeSpellbooks';
import { areAdjacentZones } from './domain/utils';
import {
    getMageWarsMagePreviewRef,
    getMageWarsSpellCardName,
    getMageWarsSpellCardPreviewRef,
} from './ui/cardAtlas';
import { mageWarsFxRegistry } from './ui/fxSetup';
import { useMageWarsGameEvents } from './ui/useGameEvents';

type Props = GameBoardProps<MageWarsCore>;

type ZoneRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

const TOKEN_IMAGES = {
    actionReady: 'mage-wars/tokens/action/ready-token-front',
    actionSpent: 'mage-wars/tokens/action/ready-token-back',
    quickcastReady: 'mage-wars/tokens/quickcast/quickcast-marker-front',
    quickcastSpent: 'mage-wars/tokens/quickcast/quickcast-marker-back',
    guard: 'mage-wars/tokens/status/guard-token',
    burn: 'mage-wars/tokens/status/burn-token',
    damage: 'mage-wars/tokens/damage/damage-token-front',
    channeling: 'mage-wars/tokens/channeling/channeling-token-front',
} as const;

const SPELL_CARD_BACK = 'mage-wars/cards/backs/spell-card-back';

const ZONE_RECTS: Record<ArenaZoneId, ZoneRect> = {
    a1: { left: 0, top: 0, width: 50, height: 27.5 },
    b1: { left: 50, top: 0, width: 50, height: 27.5 },
    a2: { left: 0, top: 27.5, width: 50, height: 27.5 },
    b2: { left: 50, top: 27.5, width: 50, height: 27.5 },
    a3: { left: 0, top: 55, width: 50, height: 27.5 },
    b3: { left: 50, top: 55, width: 50, height: 27.5 },
};

const ZONE_COORD_LABELS: Record<ArenaZoneId, string> = {
    a1: 'A1',
    b1: 'B1',
    a2: 'A2',
    b2: 'B2',
    a3: 'A3',
    b3: 'B3',
};

const SHORT_PHASES = new Set(['initiativeQuickcast', 'finalQuickcast']);

type FieldCardRole = 'target';
type AttackDieFaceId = 'burst' | 'hit2' | 'hit1' | 'blank';

const ATTACK_DIE_TEXTURE_SIZE = 1280;
const ATTACK_DIE_FACES: Record<AttackDieFaceId, { x: number; y: number; size: number; rotate: string }> = {
    burst: { x: 164, y: 318, size: 320, rotate: '-7deg' },
    hit2: { x: 480, y: 318, size: 320, rotate: '5deg' },
    hit1: { x: 480, y: 948, size: 320, rotate: '-4deg' },
    blank: { x: 794, y: 318, size: 320, rotate: '4deg' },
};

const SETTLEMENT_ATTACK_DICE: AttackDieFaceId[] = ['burst', 'hit2', 'hit1', 'blank'];

function cx(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}

function pct(value: number): string {
    return `${value}%`;
}

function isPlayerId(value: string | null | undefined): value is PlayerId {
    return value != null;
}

function resolveViewingPlayerId(core: MageWarsCore, playerID: string | null): PlayerId {
    if (isPlayerId(playerID) && core.players[playerID]) return playerID;
    return core.currentPlayerId;
}

function resolveOpponentId(core: MageWarsCore, playerId: PlayerId): PlayerId | null {
    return core.playerOrder.find((candidate) => candidate !== playerId) ?? null;
}

function getFirstAdjacentZone(core: MageWarsCore, player: MageWarsPlayerState): ArenaZoneId | null {
    const adjacent = core.arena.find((zone) => areAdjacentZones(core, player.mageZoneId, zone.id));
    return adjacent?.id ?? null;
}

function getSpellbookPreviewCardIds(player: MageWarsPlayerState, maxCount: number): number[] {
    const preparedIds = player.preparedSpellCardIds.filter((cardId) => getMageWarsSpellCardPreviewRef(cardId) != null);
    const spellbookIds = getApprenticeSpellbook(player.mageId)
        .flatMap((entry) => entry.workshopCardIds.slice(0, 1))
        .filter((cardId) => !preparedIds.includes(cardId));

    return [...preparedIds, ...spellbookIds]
        .slice(0, maxCount);
}

function getMageDisplayLabel(player: MageWarsPlayerState): string {
    return getApprenticeMageSetup(player.mageId).displayName;
}

function getZoneFieldCardOffsetStyle(zoneId: ArenaZoneId, hasFieldCards: boolean): CSSProperties | undefined {
    if (!hasFieldCards) return undefined;

    const offsets: Partial<Record<ArenaZoneId, { x: number; y: number }>> = {
        a2: { x: 5, y: -10 },
        b2: { x: 16, y: -14 },
        a3: { x: 8, y: -108 },
        b3: { x: 34, y: -107 },
    };
    const offset = offsets[zoneId];

    return offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined;
}

function getZoneOccupantOffsetStyle(zoneId: ArenaZoneId, hasFieldCards: boolean): CSSProperties | undefined {
    if (!hasFieldCards) return undefined;

    const offsets: Partial<Record<ArenaZoneId, { x: number; y: number }>> = {
        a1: { x: -165, y: 0 },
        a2: { x: -165, y: 0 },
        a3: { x: -165, y: -18 },
        b1: { x: 150, y: 0 },
        b2: { x: 150, y: -8 },
        b3: { x: 150, y: -18 },
    };
    const offset = offsets[zoneId];

    return offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined;
}

function TokenImage({
    src,
    alt,
    className,
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    return (
        <OptimizedImage
            src={src}
            alt={alt}
            className={cx('object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]', className)}
            placeholder={false}
        />
    );
}

function isCreatureActionPhase(phase: string): boolean {
    return phase === 'creatureAction';
}

function MageStatusBars({ player }: { player: MageWarsPlayerState }) {
    const lifeRemaining = Math.max(0, player.life - player.damage);
    const lifePercent = Math.max(0, Math.min(100, (lifeRemaining / player.life) * 100));
    const manaPercent = Math.max(0, Math.min(100, (player.mana / 20) * 100));

    return (
        <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-red-950/70">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-300"
                    style={{ width: `${lifePercent}%` }}
                />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sky-950/70">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-200"
                    style={{ width: `${manaPercent}%` }}
                />
            </div>
        </div>
    );
}

function MageHud({
    player,
    current,
    self,
    role,
    activeHint,
    compact = false,
}: {
    player: MageWarsPlayerState;
    current: boolean;
    self: boolean;
    role?: 'source' | 'target';
    activeHint?: string;
    compact?: boolean;
}) {
    const { t } = useTranslation('game-mage-wars');
    const lifeRemaining = Math.max(0, player.life - player.damage);
    const roleLabel = role ? t(role === 'source' ? 'arena.source' : 'arena.legalTarget') : null;
    const mageLabel = getMageDisplayLabel(player);

    if (!compact) {
        return (
            <section
                className="pointer-events-auto relative flex w-[15.5rem] flex-col items-start gap-2 text-stone-100"
                data-testid={self ? 'mage-wars-mage-hud-self' : 'mage-wars-mage-hud-opponent'}
            >
                <div
                    className="relative"
                    data-testid="mage-wars-mage-hud-hint-card"
                    data-mage-preview-kind="portrait"
                    data-mage-ui-role="player-hint-card"
                >
                    <CardPreview
                        previewRef={getMageWarsMagePreviewRef(player.mageId, 'portrait')}
                        className="h-[10.8rem] w-[7.65rem] rounded-[0.2rem] shadow-[0_12px_28px_rgba(0,0,0,0.52)]"
                        title={mageLabel}
                        alt={mageLabel}
                    />
                    {current ? (
                        <div
                            className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/72 px-2 py-1 text-[0.68rem] font-black leading-none text-amber-100 shadow-[0_6px_16px_rgba(0,0,0,0.46)]"
                            data-testid="mage-wars-mage-hud-current-badge"
                        >
                            <TokenImage
                                src={player.actionReady ? TOKEN_IMAGES.actionReady : TOKEN_IMAGES.actionSpent}
                                alt={t(player.actionReady ? 'tokens.actionReady' : 'tokens.actionSpent')}
                                className="h-5 w-5"
                            />
                            {t('player.active')}
                        </div>
                    ) : null}
                    {current && activeHint ? (
                        <div
                            className="absolute -right-4 bottom-11 z-10 rounded-full bg-amber-200 px-2 py-1 text-[0.6rem] font-black leading-none text-stone-950 shadow-[0_6px_16px_rgba(0,0,0,0.42)]"
                            data-testid="mage-wars-mage-hud-active-hint"
                        >
                            {activeHint}
                        </div>
                    ) : null}
                    {roleLabel ? (
                        <div
                            className={cx(
                                'absolute -right-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[0.56rem] font-semibold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.38)]',
                                role === 'source'
                                    ? 'bg-amber-200 text-stone-950'
                                    : 'bg-rose-300 text-rose-950',
                            )}
                            data-testid={`mage-wars-mage-hud-${role}-badge`}
                        >
                            {roleLabel}
                        </div>
                    ) : null}
                </div>
                <div className="w-full max-w-[14rem]">
                    <div className="flex items-end justify-between gap-2">
                        <div>
                            <div className="text-2xl font-black leading-none text-amber-100 drop-shadow-[0_3px_10px_rgba(0,0,0,0.68)]">
                                {mageLabel}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-stone-100">
                                {self ? t('player.you') : t('player.opponent')}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TokenImage
                                src={player.actionReady ? TOKEN_IMAGES.actionReady : TOKEN_IMAGES.actionSpent}
                                alt={t(player.actionReady ? 'tokens.actionReady' : 'tokens.actionSpent')}
                                className="h-7 w-7"
                            />
                            <TokenImage
                                src={player.quickcastReady ? TOKEN_IMAGES.quickcastReady : TOKEN_IMAGES.quickcastSpent}
                                alt={t(player.quickcastReady ? 'tokens.quickcastReady' : 'tokens.quickcastSpent')}
                                className="h-7 w-7"
                            />
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-[2.6rem_minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-2 text-xs font-semibold text-amber-50">
                        <span>{t('stats.life')}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-red-950/70">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-300"
                                style={{ width: `${Math.max(0, Math.min(100, (lifeRemaining / player.life) * 100))}%` }}
                            />
                        </div>
                        <span>{lifeRemaining}</span>
                        <span>{t('stats.mana')}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-sky-950/70">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-200"
                                style={{ width: `${Math.max(0, Math.min(100, (player.mana / 20) * 100))}%` }}
                            />
                        </div>
                        <span>{player.mana}</span>
                        <span>{t('stats.channeling')}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-amber-950/70">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-100"
                                style={{ width: `${Math.max(0, Math.min(100, (player.channeling / 12) * 100))}%` }}
                            />
                        </div>
                        <span>{player.channeling}</span>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className={cx(
                'relative grid rounded-[0.35rem] bg-gradient-to-r from-black/70 via-black/38 to-transparent',
                compact
                    ? 'grid-cols-[3.1rem_minmax(0,1fr)] gap-2 p-1.5'
                    : 'grid-cols-[4.6rem_minmax(0,1fr)] gap-3 p-2',
                current && 'before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-amber-300/80',
            )}
            data-testid={self ? 'mage-wars-mage-hud-self' : 'mage-wars-mage-hud-opponent'}
        >
            <div
                className="relative"
                data-testid="mage-wars-mage-hud-hint-card"
                data-mage-preview-kind="portrait"
                data-mage-ui-role="player-hint-card"
            >
                <CardPreview
                    previewRef={getMageWarsMagePreviewRef(player.mageId, 'portrait')}
                    className={cx(
                        'rounded-[0.2rem] shadow-[0_8px_22px_rgba(0,0,0,0.48)]',
                        compact ? 'h-16 w-[2.85rem]' : 'h-24 w-[4.25rem]',
                    )}
                    title={mageLabel}
                    alt={mageLabel}
                />
                {current ? (
                    <div
                        className="absolute bottom-1 left-1 z-10 inline-flex items-center gap-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.54rem] font-black leading-none text-amber-100 shadow-[0_4px_12px_rgba(0,0,0,0.42)]"
                        data-testid="mage-wars-mage-hud-current-badge"
                    >
                        <TokenImage
                            src={player.actionReady ? TOKEN_IMAGES.actionReady : TOKEN_IMAGES.actionSpent}
                            alt={t(player.actionReady ? 'tokens.actionReady' : 'tokens.actionSpent')}
                            className="h-4 w-4"
                        />
                        {t('player.active')}
                    </div>
                ) : null}
                {current && activeHint ? (
                    <div
                        className="absolute -right-3 bottom-8 z-10 rounded-full bg-amber-200 px-1.5 py-0.5 text-[0.52rem] font-black leading-none text-stone-950 shadow-[0_4px_12px_rgba(0,0,0,0.38)]"
                        data-testid="mage-wars-mage-hud-active-hint"
                    >
                        {activeHint}
                    </div>
                ) : null}
                {roleLabel ? (
                    <div
                        className={cx(
                            'absolute -right-2 top-1 z-10 rounded-full px-1.5 py-0.5 text-[0.56rem] font-semibold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.38)]',
                            role === 'source'
                                ? 'bg-amber-200 text-stone-950'
                                : 'bg-rose-300 text-rose-950',
                        )}
                        data-testid={`mage-wars-mage-hud-${role}-badge`}
                    >
                        {roleLabel}
                    </div>
                ) : null}
            </div>
            <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-amber-50">
                            {mageLabel}
                        </div>
                        <div className="text-[0.7rem] text-stone-300">
                            {self ? t('player.you') : t('player.opponent')}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <TokenImage
                            src={player.actionReady ? TOKEN_IMAGES.actionReady : TOKEN_IMAGES.actionSpent}
                            alt={t(player.actionReady ? 'tokens.actionReady' : 'tokens.actionSpent')}
                            className={compact ? 'h-5 w-5' : 'h-7 w-7'}
                        />
                        <TokenImage
                            src={player.quickcastReady ? TOKEN_IMAGES.quickcastReady : TOKEN_IMAGES.quickcastSpent}
                            alt={t(player.quickcastReady ? 'tokens.quickcastReady' : 'tokens.quickcastSpent')}
                            className={compact ? 'h-5 w-5' : 'h-7 w-7'}
                        />
                    </div>
                </div>
                <div className="mt-2">
                    <MageStatusBars player={player} />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[0.68rem] text-stone-200">
                    <span>{t('stats.lifeShort', { value: lifeRemaining })}</span>
                    <span>{t('stats.manaShort', { value: player.mana })}</span>
                    <span>{t('stats.channelingShort', { value: player.channeling })}</span>
                    <span>{t('stats.damageShort', { value: player.damage })}</span>
                </div>
            </div>
        </section>
    );
}

function PreparedSpellCard({
    cardId,
    hidden,
    label,
    role,
    compact = false,
    testId,
}: {
    cardId?: number;
    hidden?: boolean;
    label: string;
    role?: 'source';
    compact?: boolean;
    testId?: string;
}) {
    const previewRef = cardId == null || hidden ? null : getMageWarsSpellCardPreviewRef(cardId);
    const title = cardId == null ? label : getMageWarsSpellCardName(cardId) ?? label;
    const showLabel = hidden || cardId == null;
    const { t } = useTranslation('game-mage-wars');

    return (
        <div
            className={cx('relative shrink-0', compact ? 'h-[5.05rem] w-[3.55rem]' : 'h-[14rem] w-[9.875rem]')}
            data-testid={testId}
        >
            {previewRef ? (
                <CardPreview
                    previewRef={previewRef}
                    className="h-full w-full rounded-[0.18rem] shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                    title={title}
                />
            ) : hidden ? (
                <OptimizedImage
                    src={SPELL_CARD_BACK}
                    alt={title}
                    className="h-full w-full rounded-[0.18rem] object-cover shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                    placeholder={false}
                />
            ) : (
                <div className="h-full w-full rounded-[0.18rem] border border-dashed border-amber-100/22 bg-stone-950/28 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)]" />
            )}
            {showLabel ? (
                <div
                    className={cx(
                        'absolute inset-x-1 bottom-1 rounded-sm bg-black/65 px-1 py-0.5 text-center text-amber-50',
                        compact ? 'text-[0.48rem] leading-none' : 'text-[0.62rem]',
                    )}
                >
                    {hidden ? label : title}
                </div>
            ) : null}
            {role === 'source' ? (
                <div
                    className="absolute right-1.5 top-1.5 z-10 rounded-full bg-amber-200 px-1.5 py-0.5 text-[0.56rem] font-semibold leading-none text-stone-950 shadow-[0_4px_12px_rgba(0,0,0,0.38)]"
                    data-testid="mage-wars-prepared-source-badge"
                >
                    {t('arena.source')}
                </div>
            ) : null}
        </div>
    );
}

function ZoneFieldCard({
    cardId,
    role,
}: {
    cardId: number;
    role?: FieldCardRole;
}) {
    const { t } = useTranslation('game-mage-wars');
    const previewRef = getMageWarsSpellCardPreviewRef(cardId);
    const title = getMageWarsSpellCardName(cardId) ?? t('privateZones.spell');

    if (!previewRef) return null;

    return (
        <div
            className={cx(
                'relative shrink-0 rounded-[0.18rem] shadow-[0_14px_30px_rgba(0,0,0,0.48)]',
                role === 'target' && 'shadow-[0_0_30px_rgba(251,191,36,0.38)]',
            )}
            data-testid="mage-wars-zone-field-card"
        >
            <CardPreview
                previewRef={previewRef}
                className="h-[11.95rem] w-[8.7rem] rounded-[0.18rem]"
                title={title}
            />
            {role === 'target' ? (
                <>
                    <span
                        className="pointer-events-none absolute -left-3 -right-3 -top-3 -bottom-3 rounded-[0.22rem] border border-amber-200/78"
                        data-testid="mage-wars-field-card-target-frame"
                    />
                    <span
                        className="absolute left-1/2 top-[-2.05rem] z-10 -translate-x-1/2 rounded-full bg-amber-200 px-2.5 py-1 text-[0.62rem] font-black leading-none text-stone-950 shadow-[0_4px_12px_rgba(0,0,0,0.42)]"
                        data-testid="mage-wars-field-card-target-badge"
                    >
                        {t('arena.legalTargetShort')}
                    </span>
                </>
            ) : null}
        </div>
    );
}

function SpellRail({
    player,
    self,
    compact = false,
}: {
    player: MageWarsPlayerState;
    self: boolean;
    compact?: boolean;
}) {
    const { t } = useTranslation('game-mage-wars');
    const previewIds = useMemo(() => getSpellbookPreviewCardIds(player, 4), [player]);
    const preparedIds = player.preparedSpellCardIds.slice(0, 2);

    return (
        <section
            className={cx(
                'pointer-events-auto flex min-h-0 rounded-[0.35rem] bg-black/28',
                compact ? 'flex-row items-end gap-2 p-1.5' : 'flex-col gap-2 p-2',
            )}
        >
            <div
                className={cx(
                    'flex text-stone-200',
                    compact
                        ? 'w-[5.9rem] shrink-0 flex-col justify-end gap-0.5 pb-0.5 text-[0.6rem] leading-tight'
                        : 'items-center justify-between gap-3 text-xs',
                )}
            >
                <span className="font-semibold text-amber-100">
                    {self ? t('privateZones.selfPlans') : t('privateZones.opponentPlans')}
                </span>
                <span>{t('privateZones.spellbookCount', { count: player.spellbookCount })}</span>
            </div>
            <div className={cx('flex items-end overflow-hidden', compact ? 'gap-1.5' : 'gap-2')}>
                {[0, 1].map((slot) => (
                    <PreparedSpellCard
                        key={`${player.id}-prepared-${slot}`}
                        cardId={preparedIds[slot]}
                        hidden={!self}
                        label={slot < player.preparedSpellSlots || !self
                            ? t('privateZones.hiddenPrepared')
                            : t('privateZones.emptySlot')}
                        compact={compact}
                    />
                ))}
                {self ? previewIds.map((cardId) => (
                    <PreparedSpellCard
                        key={`${player.id}-spellbook-${cardId}`}
                        cardId={cardId}
                        label={getMageWarsSpellCardName(cardId) ?? t('privateZones.spell')}
                        compact={compact}
                    />
                )) : null}
            </div>
        </section>
    );
}

function OpponentPlanMirror({ player }: { player: MageWarsPlayerState }) {
    const { t } = useTranslation('game-mage-wars');

    return (
        <section className="pointer-events-auto flex flex-col items-start gap-3" data-testid="mage-wars-opponent-prepared-mirror">
            <div className="flex items-end gap-1.5">
                {[0, 1].map((slot) => (
                    <OptimizedImage
                        key={`${player.id}-opponent-plan-${slot}`}
                        src={SPELL_CARD_BACK}
                        alt={t('privateZones.hiddenPrepared')}
                        className="h-28 w-[4.95rem] rounded-[0.16rem] object-cover shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                        placeholder={false}
                    />
                ))}
            </div>
            <div className="pl-0.5 text-[0.68rem] font-semibold leading-tight text-amber-100">
                {t('privateZones.opponentPlansWithCount', { count: player.preparedSpellSlots })}
            </div>
        </section>
    );
}

function DiscardPile({ player }: { player: MageWarsPlayerState }) {
    const { t } = useTranslation('game-mage-wars');
    const discardSpellCardIds = player.discardSpellCardIds ?? [];
    const topCardId = discardSpellCardIds[0];
    const topCardPreviewRef = topCardId == null ? null : getMageWarsSpellCardPreviewRef(topCardId);
    const count = discardSpellCardIds.length;

    return (
        <section className="pointer-events-auto flex h-[6.25rem] w-[8.65rem] shrink-0 items-center gap-2" data-testid="mage-wars-discard-pile">
            <button
                type="button"
                className="relative h-[6.25rem] w-[5.15rem] overflow-visible rounded-[0.12rem] text-left"
                aria-label={t('privateZones.discardPileAria', { count })}
            >
                {topCardPreviewRef ? (
                    <>
                        <div className="absolute left-2 top-2 h-[5.85rem] w-[4.25rem] rotate-[-7deg] rounded-[0.16rem] bg-amber-100/18 shadow-[0_10px_18px_rgba(0,0,0,0.28)]" />
                        <CardPreview
                            previewRef={topCardPreviewRef}
                            className="absolute left-1 top-0.5 h-[6.1rem] w-[4.45rem] rotate-[2deg] rounded-[0.14rem] shadow-[0_10px_20px_rgba(0,0,0,0.48)]"
                            title={getMageWarsSpellCardName(topCardId) ?? t('privateZones.discardPile')}
                        />
                    </>
                ) : (
                    <div className="absolute inset-1 rounded-[0.2rem] border border-dashed border-amber-100/18 bg-stone-950/12" />
                )}
            </button>
            <div className="text-center text-[0.66rem] font-semibold text-amber-100">
                {t('privateZones.discardPileWithCount', { count })}
            </div>
        </section>
    );
}

function SpellbookShelf({ player }: { player: MageWarsPlayerState }) {
    const { t } = useTranslation('game-mage-wars');
    const previewIds = useMemo(() => getSpellbookPreviewCardIds(player, 6), [player]);
    const pageCount = Math.max(1, Math.ceil(player.spellbookCount / 6));
    const categories = [
        t('spellbook.categories.all'),
        t('spellbook.categories.attack'),
        t('spellbook.categories.enchantment'),
        t('spellbook.categories.creature'),
        t('spellbook.categories.equipment'),
    ];

    return (
        <section
            className="pointer-events-auto flex items-end gap-[1.125rem] px-1.5 pb-2 pt-3"
            data-testid="mage-wars-desktop-spellbook-shelf"
            aria-label={t('privateZones.spellbook')}
        >
            <span className="sr-only">{t('privateZones.spellbook')}</span>
            <div className="flex h-[9.875rem] w-[3.625rem] shrink-0 flex-col justify-end gap-1.5">
                {categories.map((category, index) => (
                    <button
                        key={category}
                        type="button"
                        className={cx(
                            'min-h-[1.55rem] rounded-[0.22rem] px-1.5 text-[0.66rem] font-semibold transition',
                            index === 0
                                ? 'bg-amber-200/85 text-stone-950 shadow-[0_6px_14px_rgba(0,0,0,0.25)]'
                                : 'bg-black/26 text-stone-200 hover:bg-black/38',
                        )}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className="flex min-w-0 flex-1 items-end gap-[0.875rem]">
                {previewIds.map((cardId) => (
                    <PreparedSpellCard
                        key={`${player.id}-spellbook-desktop-${cardId}`}
                        cardId={cardId}
                        label={getMageWarsSpellCardName(cardId) ?? t('privateZones.spell')}
                        testId="mage-wars-desktop-spellbook-card"
                    />
                ))}
            </div>
            <div className="flex h-[14.25rem] w-12 shrink-0 flex-col items-center justify-center gap-2 text-stone-100">
                <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-[0.3rem] bg-black/32 text-lg font-bold text-amber-100"
                    aria-label={t('spellbook.previousPage')}
                >
                    ‹
                </button>
                <div className="rounded-[0.2rem] bg-black/18 px-1.5 py-1 text-center text-[0.62rem] leading-tight text-stone-200">
                    {t('spellbook.pageSummary', { page: 1, total: pageCount })}
                </div>
                <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-[0.3rem] bg-black/32 text-lg font-bold text-amber-100"
                    aria-label={t('spellbook.nextPage')}
                >
                    ›
                </button>
            </div>
        </section>
    );
}

function PreparedSpellsDock({ player }: { player: MageWarsPlayerState }) {
    const { t } = useTranslation('game-mage-wars');
    const preparedIds = player.preparedSpellCardIds.slice(0, 2);

    return (
        <section
            className="pointer-events-auto flex h-[17.75rem] w-[22.5rem] flex-col justify-start gap-[0.875rem]"
            data-testid="mage-wars-desktop-prepared-spells"
        >
            <div className="text-center text-[0.66rem] font-semibold text-amber-100">
                {t('privateZones.preparedSpellsWithCount', {
                    count: preparedIds.length,
                    total: player.preparedSpellSlots,
                })}
            </div>
            <div className="flex flex-row-reverse justify-end gap-[0.875rem] pl-6 pr-1.5">
                {[0, 1].map((slot) => (
                    <PreparedSpellCard
                        key={`${player.id}-prepared-desktop-${slot}`}
                        cardId={preparedIds[slot]}
                        label={slot < player.preparedSpellSlots
                            ? t('privateZones.preparedSpell')
                            : t('privateZones.emptySlot')}
                        role={slot === 0 && preparedIds[slot] != null ? 'source' : undefined}
                        testId="mage-wars-desktop-prepared-card"
                    />
                ))}
            </div>
        </section>
    );
}

function TurnStatusDock({ dispatch }: { dispatch: Props['dispatch'] }) {
    const { t } = useTranslation('game-mage-wars');

    return (
        <section className="pointer-events-auto" data-testid="mage-wars-turn-end-dock">
            <button
                type="button"
                className="grid h-[3.25rem] w-[10.5rem] place-items-center rounded-[0.32rem] border border-amber-200/24 bg-amber-950/36 px-5 text-xl font-black text-amber-50 shadow-[0_8px_18px_rgba(0,0,0,0.32)] transition hover:bg-amber-900/42"
                onClick={() => dispatch(FLOW_COMMANDS.ADVANCE_PHASE, {})}
                data-testid="mage-wars-turn-end"
            >
                {t('actions.endTurn')}
            </button>
        </section>
    );
}

function AttackDieFace({
    face = 'hit2',
    compact = false,
    className,
}: {
    face?: AttackDieFaceId;
    compact?: boolean;
    className?: string;
}) {
    const { t } = useTranslation('game-mage-wars');
    const crop = ATTACK_DIE_FACES[face];
    const scale = ATTACK_DIE_TEXTURE_SIZE / crop.size;

    return (
        <span
            className={cx(
                'relative block shrink-0 overflow-hidden rounded-[0.18rem] bg-black/35 shadow-[0_8px_16px_rgba(0,0,0,0.5)]',
                compact ? 'h-10 w-10' : 'h-12 w-12',
                className,
            )}
            style={{ transform: `rotate(${crop.rotate})` }}
            data-testid="mage-wars-attack-die-face"
            aria-label={t('dice.attack')}
            title={t('dice.attack')}
        >
            <OptimizedImage
                src="mage-wars/dice/attack-die-texture"
                alt={t('dice.attack')}
                className="absolute max-w-none select-none"
                style={{
                    width: `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    left: `${-(crop.x / crop.size) * 100}%`,
                    top: `${-(crop.y / crop.size) * 100}%`,
                }}
                placeholder={false}
            />
        </span>
    );
}

function EffectDie({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation('game-mage-wars');

    return (
        <div
            className={cx(
                'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-black/20 shadow-[0_10px_24px_rgba(0,0,0,0.48)]',
                compact ? 'h-10 w-10' : 'h-14 w-14',
            )}
            data-testid="mage-wars-effect-die-face"
            aria-label={t('dice.effect')}
            title={t('dice.effect')}
        >
            <OptimizedImage
                src="mage-wars/dice/effect-die-d12-face"
                alt={t('dice.effect')}
                className="h-full w-full object-contain"
                placeholder={false}
            />
        </div>
    );
}

function DesktopSettlementOverlay() {
    const { t } = useTranslation('game-mage-wars');

    return (
        <>
            <section
                className="pointer-events-none absolute left-[65.8%] top-[35%] z-30 flex items-center gap-1.5"
                data-testid="mage-wars-desktop-settlement-overlay"
            >
                {SETTLEMENT_ATTACK_DICE.map((face) => (
                    <AttackDieFace key={face} face={face} />
                ))}
                <EffectDie />
                <div className="max-w-[5.6rem] rounded-full bg-black/34 px-2 py-1 text-[0.62rem] font-semibold leading-tight text-amber-50">
                    {t('dice.settlement')}
                </div>
            </section>
            <div
                className="pointer-events-none absolute left-[63.85%] top-[42.85%] z-40"
                data-testid="mage-wars-damage-token-overlay"
            >
                <TokenImage src={TOKEN_IMAGES.damage} alt={t('tokens.damage')} className="h-[2.375rem] w-[2.375rem]" />
            </div>
            <div
                className="pointer-events-none absolute left-[65.78%] top-[41.57%] z-40"
                data-testid="mage-wars-burn-token-overlay"
            >
                <TokenImage src={TOKEN_IMAGES.burn} alt={t('tokens.burn')} className="h-[2.45rem] w-[2.45rem]" />
            </div>
        </>
    );
}

function ZoneOccupant({
    player,
    role,
    crowded,
}: {
    player: MageWarsPlayerState;
    role?: 'source' | 'target';
    crowded?: boolean;
}) {
    const { t } = useTranslation('game-mage-wars');
    const mageLabel = getMageDisplayLabel(player);

    return (
        <div
            className={cx(
                'relative shrink-0 rounded-[0.18rem] shadow-[0_14px_30px_rgba(0,0,0,0.48)]',
                role === 'source' && 'shadow-[0_0_24px_rgba(251,191,36,0.28)]',
                role === 'target' && 'shadow-[0_0_28px_rgba(251,113,133,0.32)]',
            )}
            aria-label={t(`mages.${player.mageId}`)}
            data-testid="mage-wars-zone-mage-entity"
            data-player-id={player.id}
            data-mage-id={player.mageId}
            data-mage-preview-kind="card"
            data-mage-ui-role="mage-battle-entity"
        >
            <CardPreview
                previewRef={getMageWarsMagePreviewRef(player.mageId, 'card')}
                className={cx(
                    'rounded-[0.18rem]',
                    crowded ? 'h-[10.35rem] w-[7.35rem]' : 'h-[11.5rem] w-[8.15rem]',
                )}
                title={mageLabel}
                alt={mageLabel}
            />
            <div className="pointer-events-none absolute -bottom-2 left-2 flex items-center gap-1">
                {player.guarding ? (
                    <TokenImage src={TOKEN_IMAGES.guard} alt={t('tokens.guard')} className="h-7 w-7" />
                ) : null}
                {player.damage > 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-black/62 px-1 py-0.5 text-[0.62rem] font-bold text-rose-50 shadow-[0_4px_12px_rgba(0,0,0,0.38)]">
                        <TokenImage src={TOKEN_IMAGES.damage} alt={t('tokens.damage')} className="h-5 w-5" />
                        {player.damage}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function ArenaStage({
    core,
    phase,
    activePlayer,
    activeOpponent,
}: {
    core: MageWarsCore;
    phase: string;
    activePlayer?: MageWarsPlayerState;
    activeOpponent?: MageWarsPlayerState | null;
}) {
    const { t } = useTranslation('game-mage-wars');
    const sourceZoneId = activePlayer?.mageZoneId;
    const showActionHighlights = isCreatureActionPhase(phase) && activePlayer?.actionReady === true;
    const legalMoveZoneIds = new Set(
        showActionHighlights && sourceZoneId
            ? core.arena
                .filter((zone) => areAdjacentZones(core, sourceZoneId, zone.id))
                .map((zone) => zone.id)
            : [],
    );
    const targetZoneId = showActionHighlights && activeOpponent ? activeOpponent.mageZoneId : null;
    const legalAttackTargetId = showActionHighlights
        && activeOpponent
        && activeOpponent.mageZoneId === sourceZoneId
        ? activeOpponent.id
        : null;

    return (
        <section
            className="absolute inset-0 overflow-hidden rounded-[0.5rem] shadow-[0_34px_58px_rgba(0,0,0,0.55)] lg:inset-auto lg:left-[12.5%] lg:top-[2.75%] lg:h-[95.4%] lg:w-[75%]"
            data-testid="mage-wars-arena-stage"
        >
            <OptimizedImage
                src="mage-wars/board/standard-arena"
                alt={t('arena.standardArenaAlt')}
                className="absolute max-w-none object-fill"
                style={{
                    left: '-100%',
                    top: 0,
                    width: '200%',
                    height: '209.7%',
                }}
                placeholder={false}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,231,166,0.06),rgba(6,5,4,0.1)_56%,rgba(3,2,1,0.44))]" />
            {core.arena.map((zone) => {
                const rect = ZONE_RECTS[zone.id];
                const fieldCardIds = zone.fieldCardIds ?? [];
                const hasFieldCards = fieldCardIds.length > 0;
                const isSourceZone = showActionHighlights && zone.id === sourceZoneId;
                const isLegalMoveZone = legalMoveZoneIds.has(zone.id);
                const isLegalAttackZone = targetZoneId != null && zone.id === targetZoneId;
                const zoneAriaLabel = [
                    t('arena.zoneAria', { zone: t(`zones.${zone.id}`) }),
                    isSourceZone ? t('arena.source') : null,
                    isLegalMoveZone && !isLegalAttackZone ? t('arena.legalMove') : null,
                    isLegalAttackZone ? t('arena.legalTarget') : null,
                ].filter(Boolean).join('，');
                return (
                    <button
                        key={zone.id}
                        type="button"
                        data-testid={`mage-wars-arena-zone-${zone.id}`}
                        data-source-zone={isSourceZone ? 'true' : undefined}
                        data-legal-move-zone={isLegalMoveZone ? 'true' : undefined}
                        data-legal-target-zone={isLegalAttackZone ? 'true' : undefined}
                        className={cx(
                            'absolute rounded-[0.25rem] text-left transition',
                            'outline outline-1 outline-transparent hover:bg-amber-200/8 hover:outline-amber-100/45',
                            zone.occupantIds.length > 0 && 'bg-black/5',
                            isSourceZone && 'bg-amber-200/8 outline-amber-200/55',
                            isLegalMoveZone && 'bg-emerald-200/7 outline-emerald-200/40',
                            isLegalAttackZone && 'bg-amber-200/6 outline-amber-200/55',
                        )}
                        style={{
                            left: pct(rect.left),
                            top: pct(rect.top),
                            width: pct(rect.width),
                            height: pct(rect.height),
                        }}
                        aria-label={zoneAriaLabel}
                    >
                        <span className="absolute right-4 top-3 text-lg font-black tracking-wide text-amber-50/86 drop-shadow-[0_2px_6px_rgba(0,0,0,0.88)]">
                            {ZONE_COORD_LABELS[zone.id]}
                        </span>
                        <div
                            className={cx(
                                'absolute inset-0 flex flex-wrap items-center gap-3 py-5',
                                zone.id.startsWith('b') ? 'justify-start pl-[21%] pr-4' : 'justify-center px-4',
                            )}
                            style={getZoneFieldCardOffsetStyle(zone.id, hasFieldCards)}
                        >
                            {fieldCardIds.map((cardId, index) => (
                                <ZoneFieldCard
                                    key={`${zone.id}-field-card-${cardId}-${index}`}
                                    cardId={cardId}
                                    role={isLegalAttackZone && index === 0 ? 'target' : undefined}
                                />
                            ))}
                        </div>
                        <div
                            className={cx(
                                'pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-3 py-5',
                                zone.id.startsWith('b') ? 'pl-[21%] pr-4' : 'px-4',
                            )}
                            style={getZoneOccupantOffsetStyle(zone.id, hasFieldCards)}
                        >
                            {zone.occupantIds.map((occupantId) => {
                                const occupant = core.players[occupantId];
                                if (!occupant) return null;
                                const role = occupant.id === activePlayer?.id
                                    ? 'source'
                                    : occupant.id === legalAttackTargetId
                                        ? 'target'
                                        : undefined;
                                return (
                                    <ZoneOccupant
                                        key={occupantId}
                                        player={occupant}
                                        role={role}
                                        crowded={hasFieldCards}
                                    />
                                );
                            })}
                        </div>
                    </button>
                );
            })}
        </section>
    );
}

function DiceTray({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation('game-mage-wars');
    return (
        <section className={compact ? 'rounded-[0.35rem] bg-black/24 p-1.5' : 'p-2'}>
            <div className={cx('font-semibold text-amber-100', compact ? 'mb-1 text-[0.65rem]' : 'mb-2 text-xs')}>
                {t('dice.title')}
            </div>
            <div className={cx('flex items-center', compact ? 'gap-2' : 'gap-3')}>
                <div className="flex items-center -space-x-2" aria-label={t('dice.attack')}>
                    <AttackDieFace face="burst" compact={compact} />
                    <AttackDieFace face="hit2" compact={compact} />
                    <AttackDieFace face="hit1" compact={compact} />
                </div>
                <EffectDie compact={compact} />
                <div className={cx('min-w-0 text-stone-200', compact ? 'text-[0.62rem] leading-tight' : 'text-xs')}>
                    <div>{t('dice.attack')}</div>
                    <div className="text-sky-100">{t('dice.effect')}</div>
                </div>
            </div>
        </section>
    );
}

function ActionDock({
    core,
    phase,
    activePlayer,
    activeOpponent,
    canAct,
    dispatch,
    compact = false,
}: {
    core: MageWarsCore;
    phase: string;
    activePlayer: MageWarsPlayerState;
    activeOpponent: MageWarsPlayerState | null;
    canAct: boolean;
    dispatch: Props['dispatch'];
    compact?: boolean;
}) {
    const { t } = useTranslation('game-mage-wars');
    const adjacentZoneId = getFirstAdjacentZone(core, activePlayer);
    const canMove = canAct && phase === 'creatureAction' && activePlayer.actionReady && adjacentZoneId != null;
    const canGuard = canAct && phase === 'creatureAction' && activePlayer.actionReady;
    const canAttack = canAct
        && phase === 'creatureAction'
        && activePlayer.actionReady
        && activeOpponent != null
        && activeOpponent.mageZoneId === activePlayer.mageZoneId;
    const quickcastWindow = SHORT_PHASES.has(phase);
    const hasPrimaryAction = canMove || canGuard || canAttack;
    const buttonBase = cx(
        'rounded-[0.25rem] font-semibold transition',
        compact ? 'min-h-10 px-2 py-1.5 text-[0.68rem]' : 'px-3 py-2 text-sm',
    );

    return (
        <section className={compact ? 'rounded-[0.35rem] bg-black/24 p-1.5' : 'p-2'}>
            <div className={compact ? 'mb-1.5' : 'mb-3'}>
                <div className="text-xs font-semibold text-amber-100">{t('actionDock.title')}</div>
                <div className={cx('mt-1 text-stone-300', compact ? 'text-[0.6rem] leading-tight' : 'text-[0.72rem]')}>
                    {hasPrimaryAction
                        ? t('actionDock.yourWindow')
                        : t(canAct ? 'actionDock.noManualAction' : 'actionDock.waiting')}
                </div>
            </div>
            <div className={compact ? 'grid grid-cols-3 gap-1' : 'grid gap-2'}>
                <button
                    type="button"
                    className={cx(buttonBase, canMove
                        ? 'bg-amber-200 text-stone-950 hover:bg-amber-100'
                        : 'bg-black/14 text-stone-500')}
                    disabled={!canMove}
                    onClick={() => {
                        if (!adjacentZoneId) return;
                        dispatch(MAGE_WARS_COMMANDS.MOVE_MAGE, { toZoneId: adjacentZoneId });
                    }}
                >
                    {t('actions.move')}
                </button>
                <button
                    type="button"
                    className={cx(buttonBase, canGuard
                        ? 'bg-emerald-300 text-emerald-950 hover:bg-emerald-200'
                        : 'bg-black/14 text-stone-500')}
                    disabled={!canGuard}
                    onClick={() => dispatch(MAGE_WARS_COMMANDS.GUARD, {})}
                >
                    {t('actions.guard')}
                </button>
                <button
                    type="button"
                    className={cx(buttonBase, canAttack
                        ? 'bg-red-300 text-red-950 hover:bg-red-200'
                        : 'bg-black/14 text-stone-500')}
                    disabled={!canAttack || !activeOpponent}
                    onClick={() => {
                        if (!activeOpponent) return;
                        dispatch(MAGE_WARS_COMMANDS.DECLARE_ATTACK, { targetPlayerId: activeOpponent.id });
                    }}
                >
                    {t('actions.attack')}
                </button>
            </div>
            <div className={cx('flex items-center gap-2 text-stone-300', compact ? 'mt-1.5 text-[0.6rem] leading-tight' : 'mt-3 text-[0.72rem]')}>
                <TokenImage
                    src={activePlayer.quickcastReady ? TOKEN_IMAGES.quickcastReady : TOKEN_IMAGES.quickcastSpent}
                    alt={t(activePlayer.quickcastReady ? 'tokens.quickcastReady' : 'tokens.quickcastSpent')}
                    className={compact ? 'h-6 w-6' : 'h-8 w-8'}
                />
                <span>{quickcastWindow ? t('actionDock.quickcastOpen') : t('actionDock.quickcastTiming')}</span>
            </div>
        </section>
    );
}

export default function MageWarsBoard({ G, playerID, dispatch }: Props) {
    const { t } = useTranslation('game-mage-wars');
    const viewport = useRuntimeViewport();
    const phase = G.sys.phase ?? 'reset';
    const core = G.core;
    const players = core.playerOrder.map((id) => core.players[id]).filter(Boolean);
    const viewingPlayerId = resolveViewingPlayerId(core, playerID);
    const activePlayer = core.players[core.currentPlayerId] ?? players[0];
    const activeOpponentId = resolveOpponentId(core, activePlayer?.id ?? viewingPlayerId);
    const activeOpponent = activeOpponentId ? core.players[activeOpponentId] ?? null : null;
    const viewingPlayer = core.players[viewingPlayerId] ?? activePlayer;
    const opponentId = resolveOpponentId(core, viewingPlayerId);
    const opponent = opponentId ? core.players[opponentId] ?? null : null;
    const canAct = playerID === core.currentPlayerId;
    const isLandscapeMobileViewport = viewport.width <= 1023 && viewport.width > viewport.height;
    const showActionHighlights = isCreatureActionPhase(phase) && activePlayer?.actionReady === true;
    const legalAttackTargetId = showActionHighlights
        && activePlayer
        && activeOpponent
        && activeOpponent.mageZoneId === activePlayer.mageZoneId
        ? activeOpponent.id
        : null;
    const getHudRole = (player?: MageWarsPlayerState | null): 'source' | 'target' | undefined => {
        if (!showActionHighlights || !player) return undefined;
        if (player.id === legalAttackTargetId) return 'target';
        return undefined;
    };
    const currentMageHint = showActionHighlights ? t('arena.selectTarget') : undefined;
    const getActiveHint = (player?: MageWarsPlayerState | null) => (
        player?.id === core.currentPlayerId ? currentMageHint : undefined
    );
    const fxBus = useFxBus(mageWarsFxRegistry);
    useMageWarsGameEvents({ G, fxBus });
    const getArenaCellPosition = useCallback((row: number, col: number) => ({
        left: (col / 2) * 100,
        top: (row / 3) * 100,
        width: 100 / 2,
        height: 100 / 3,
    }), []);

    return (
        <div
            className="relative h-full min-h-0 w-full overflow-hidden text-stone-100"
            data-testid="mage-wars-board"
            style={{
                background: 'radial-gradient(circle at 50% 40%, rgba(185,79,28,0.28), transparent 50%), radial-gradient(circle at 12% 92%, rgba(201,92,31,0.22), transparent 28%), linear-gradient(135deg, #170503 0%, #371207 56%, #120302 100%)',
            }}
        >
            <ArenaStage
                core={core}
                phase={phase}
                activePlayer={activePlayer}
                activeOpponent={activeOpponent}
            />
            <div className={cx(
                'absolute inset-y-0 left-0 bg-gradient-to-r from-black/24 via-black/7 to-transparent',
                isLandscapeMobileViewport ? 'w-[13rem]' : 'w-[16rem]',
            )} />
            <div className={cx(
                'absolute inset-y-0 right-0 bg-gradient-to-l from-black/24 via-black/8 to-transparent',
                isLandscapeMobileViewport ? 'w-[19rem]' : 'w-[17rem]',
            )} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/16 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/12 to-transparent" />

            <div
                className="pointer-events-none absolute left-1/2 top-4 z-30 flex h-[2.125rem] w-[17.5rem] -translate-x-1/2 items-center justify-center rounded-full border border-amber-100/16 bg-black/40 px-8 text-sm shadow-[0_10px_28px_rgba(0,0,0,0.36)] lg:left-[820px] lg:translate-x-0"
                data-testid="mage-wars-stage-chip"
            >
                <span className="font-semibold text-amber-100">
                    {isCreatureActionPhase(phase) ? t('arena.actionStage') : t('arena.mode')}
                </span>
            </div>

            {isLandscapeMobileViewport ? (
                <aside className="pointer-events-none absolute bottom-2 left-2 top-2 z-20 flex w-[12.2rem] min-h-0 flex-col justify-between gap-2">
                    <div className="pointer-events-auto">
                        {opponent ? (
                            <MageHud
                                player={opponent}
                                current={opponent.id === core.currentPlayerId}
                                self={false}
                                role={getHudRole(opponent)}
                                activeHint={getActiveHint(opponent)}
                                compact
                            />
                        ) : null}
                    </div>
                    <div className="pointer-events-auto">
                        {viewingPlayer ? (
                            <MageHud
                                player={viewingPlayer}
                                current={viewingPlayer.id === core.currentPlayerId}
                                self
                                role={getHudRole(viewingPlayer)}
                                activeHint={getActiveHint(viewingPlayer)}
                                compact
                            />
                        ) : null}
                    </div>
                </aside>
            ) : (
                <>
                    <aside className="pointer-events-none absolute bottom-[5.125rem] left-11 z-20 w-[17rem]">
                        <div className="pointer-events-auto">
                            {viewingPlayer ? (
                                <MageHud
                                    player={viewingPlayer}
                                    current={viewingPlayer.id === core.currentPlayerId}
                                    self
                                    role={getHudRole(viewingPlayer)}
                                    activeHint={getActiveHint(viewingPlayer)}
                                />
                            ) : null}
                        </div>
                    </aside>
                    <aside className="pointer-events-none absolute right-11 top-[4.375rem] z-20 w-[15.5rem]">
                        <div className="pointer-events-auto">
                            {opponent ? (
                                <MageHud
                                    player={opponent}
                                    current={opponent.id === core.currentPlayerId}
                                    self={false}
                                    role={getHudRole(opponent)}
                                    activeHint={getActiveHint(opponent)}
                                />
                            ) : null}
                        </div>
                    </aside>
                </>
            )}

            <div className="pointer-events-none absolute inset-0 z-10">
                <FxLayer
                    bus={fxBus}
                    getCellPosition={getArenaCellPosition}
                    className="z-40"
                />
            </div>
            {!isLandscapeMobileViewport ? <DesktopSettlementOverlay /> : null}

            {isLandscapeMobileViewport ? (
                <>
                    <aside className="pointer-events-none absolute right-[4.8rem] top-2 z-20 flex w-[15.6rem] min-h-0 flex-col gap-1.5">
                        <div className="pointer-events-auto">
                            {activePlayer ? (
                                <ActionDock
                                    core={core}
                                    phase={phase}
                                    activePlayer={activePlayer}
                                    activeOpponent={activeOpponent}
                                    canAct={canAct}
                                    dispatch={dispatch}
                                    compact
                                />
                            ) : null}
                        </div>
                        <div className="pointer-events-auto">
                            <DiceTray compact />
                        </div>
                    </aside>
                    <aside className="pointer-events-none absolute bottom-2 left-[13rem] right-[4.8rem] z-20 flex min-h-0 items-end gap-2">
                        <div className="pointer-events-auto min-w-0 flex-1">
                            {viewingPlayer ? <SpellRail player={viewingPlayer} self compact /> : null}
                        </div>
                        <div className="pointer-events-auto min-w-0">
                            {opponent ? <SpellRail player={opponent} self={false} compact /> : null}
                        </div>
                    </aside>
                </>
            ) : (
                <>
                    {opponent ? (
                        <aside className="pointer-events-none absolute left-14 top-12 z-20">
                            <OpponentPlanMirror player={opponent} />
                        </aside>
                    ) : null}
                    <aside className="pointer-events-none absolute bottom-4 right-12 z-30">
                        <div className="pointer-events-auto">
                            <TurnStatusDock dispatch={dispatch} />
                        </div>
                    </aside>
                    {viewingPlayer ? (
                        <aside className="pointer-events-none absolute right-14 top-[50.5%] z-20">
                            <DiscardPile player={viewingPlayer} />
                        </aside>
                    ) : null}
                    {viewingPlayer ? (
                        <aside className="pointer-events-none absolute bottom-[3.2rem] left-[18.25rem] right-[25.5rem] z-20">
                            <SpellbookShelf player={viewingPlayer} />
                        </aside>
                    ) : null}
                    {viewingPlayer ? (
                        <aside className="pointer-events-none absolute bottom-[4.875rem] right-[2.625rem] z-20">
                            <PreparedSpellsDock player={viewingPlayer} />
                        </aside>
                    ) : null}
                </>
            )}
        </div>
    );
}
