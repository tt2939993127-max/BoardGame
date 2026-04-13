/**
 * SummonerWars 交互系统扩展
 *
 * 将领域事件映射为 InteractionSystem 交互，
 * 并在交互完成后执行对应的领域命令。
 */

import type { GameEvent, MatchState, PlayerId, RandomFn } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import {
  INTERACTION_EVENTS,
  createSimpleChoice,
  queueInteraction,
} from '../../../engine/systems/InteractionSystem';
import { FLOW_EVENTS } from '../../../engine/systems/FlowSystem';
import type { PromptOption, PromptMultiConfig } from '../../../engine/systems/InteractionSystem';
import type { SummonerWarsCore, CellCoord, EventCard, UnitCard } from './types';
import { SW_COMMANDS, SW_EVENTS } from './types';
import { executeCommand } from './execute';
import { validateCommand } from './validate';
import {
  getAdjacentCells,
  getUnitAt,
  isCellEmpty,
  getPlayerUnits,
  getSummoner,
  manhattanDistance,
  isInStraightLine,
  getStructureAt,
  getUnitAbilities,
  getStunDestinations,
  isValidCoord,
  BOARD_ROWS,
  BOARD_COLS,
} from './helpers';
import { getBaseCardId, CARD_IDS, isPlagueZombieCard } from './ids';

const INTERACTIVE_EVENT_BASE_IDS = new Set<string>([
  CARD_IDS.NECRO_HELLFIRE_BLADE,
  CARD_IDS.NECRO_BLOOD_SUMMON,
  CARD_IDS.NECRO_ANNIHILATE,
  CARD_IDS.TRICKSTER_MIND_CONTROL,
  CARD_IDS.TRICKSTER_STUN,
  CARD_IDS.TRICKSTER_HYPNOTIC_LURE,
  CARD_IDS.BARBARIC_CHANT_OF_POWER,
  CARD_IDS.BARBARIC_CHANT_OF_GROWTH,
  CARD_IDS.BARBARIC_CHANT_OF_WEAVING,
  CARD_IDS.BARBARIC_CHANT_OF_ENTANGLEMENT,
  CARD_IDS.FROST_GLACIAL_SHIFT,
  CARD_IDS.GOBLIN_SNEAK,
]);

type SwInteractionMeta =
  | {
      type: 'infection';
      sourceUnitId: string;
      targetPosition: CellCoord;
    }
  | {
      type: 'event_target';
      cardId: string;
      baseId: string;
    }
  | {
      type: 'magic_event_choice';
      cardId: string;
      baseId: string;
      interaction: boolean;
    }
  | {
      type: 'funeral_pyre';
      cardId: string;
      charges: number;
    }
  | {
      type: 'blood_summon_select_target';
      cardId: string;
      completedCount: number;
    }
  | {
      type: 'blood_summon_select_card';
      cardId: string;
      targetPosition: CellCoord;
      completedCount: number;
    }
  | {
      type: 'blood_summon_select_position';
      cardId: string;
      targetPosition: CellCoord;
      summonCardId: string;
      completedCount: number;
    }
  | {
      type: 'blood_summon_confirm';
      cardId: string;
      completedCount: number;
    }
  | {
      type: 'annihilate_select_targets';
      cardId: string;
    }
  | {
      type: 'annihilate_select_damage';
      cardId: string;
      selectedTargets: CellCoord[];
      currentTargetIndex: number;
      damageTargets: (CellCoord | null)[];
    }
  | {
      type: 'mind_control_select_targets';
      cardId: string;
    }
  | {
      type: 'stun_select_target';
      cardId: string;
    }
  | {
      type: 'stun_select_destination';
      cardId: string;
      targetPosition: CellCoord;
    }
  | {
      type: 'hypnotic_lure_select_target';
      cardId: string;
    }
  | {
      type: 'chant_entanglement_select_targets';
      cardId: string;
    }
  | {
      type: 'sneak_select_unit';
      cardId: string;
      recorded: { position: CellCoord; newPosition: CellCoord }[];
    }
  | {
      type: 'sneak_select_direction';
      cardId: string;
      currentUnit: CellCoord;
      recorded: { position: CellCoord; newPosition: CellCoord }[];
    }
  | {
      type: 'glacial_shift_select_building';
      cardId: string;
      recorded: { position: CellCoord; newPosition: CellCoord }[];
    }
  | {
      type: 'glacial_shift_select_destination';
      cardId: string;
      currentBuilding: CellCoord;
      recorded: { position: CellCoord; newPosition: CellCoord }[];
    }
  | {
      type: 'grab_follow';
      grabberUnitId: string;
      movedUnitId: string;
      movedTo: CellCoord;
    }
  | {
      type: 'soul_transfer';
      sourceUnitId: string;
      sourcePosition?: CellCoord;
      victimPosition: CellCoord;
    }
  | {
      type: 'mind_capture';
      sourceUnitId: string;
      sourcePosition?: CellCoord;
      targetPosition: CellCoord;
      targetUnitId: string;
      hits: number;
    }
  | {
      type: 'ice_shards';
      sourceUnitId: string;
    }
  | {
      type: 'feed_beast';
      sourceUnitId: string;
    };

type SwInteractionValue =
  | { action: 'infection'; cardId: string; sourceUnitId: string; targetPosition: CellCoord }
  | { action: 'event_target'; targetPosition: CellCoord }
  | { action: 'magic_event_play' }
  | { action: 'magic_event_discard' }
  | { action: 'funeral_pyre_heal'; targetPosition: CellCoord }
  | { action: 'funeral_pyre_skip'; skip?: boolean }
  | { action: 'blood_summon_target'; targetPosition: CellCoord }
  | { action: 'blood_summon_card'; summonCardId: string }
  | { action: 'blood_summon_position'; summonPosition: CellCoord }
  | { action: 'blood_summon_continue' }
  | { action: 'blood_summon_finish'; skip?: boolean }
  | { action: 'annihilate_target'; targetPosition: CellCoord }
  | { action: 'annihilate_damage'; targetPosition: CellCoord }
  | { action: 'annihilate_damage_skip'; skip?: boolean }
  | { action: 'mind_control_target'; targetPosition: CellCoord }
  | { action: 'stun_target'; targetPosition: CellCoord }
  | { action: 'stun_destination'; targetPosition: CellCoord; moveRow: number; moveCol: number; distance: number }
  | { action: 'hypnotic_lure_target'; targetPosition: CellCoord }
  | { action: 'chant_entanglement_target'; targetPosition: CellCoord }
  | { action: 'sneak_unit'; position: CellCoord }
  | { action: 'sneak_destination'; newPosition: CellCoord; targetPosition: CellCoord }
  | { action: 'sneak_finish'; skip?: boolean }
  | { action: 'glacial_shift_building'; position: CellCoord }
  | { action: 'glacial_shift_destination'; newPosition: CellCoord; targetPosition: CellCoord }
  | { action: 'glacial_shift_finish'; skip?: boolean }
  | { action: 'grab_follow'; sourceUnitId: string; targetPosition: CellCoord }
  | { action: 'soul_transfer'; sourceUnitId: string; targetPosition: CellCoord }
  | { action: 'mind_capture'; sourceUnitId: string; targetPosition: CellCoord; hits: number; choice: 'control' | 'damage' }
  | { action: 'ice_shards'; sourceUnitId: string; skip?: boolean }
  | { action: 'feed_beast'; sourceUnitId: string; choice: 'destroy_adjacent' | 'self_destroy'; targetPosition?: CellCoord }
  | { skip: true };

type InteractionResolutionPayload = {
  interactionId: string;
  playerId: PlayerId;
  optionId?: string | null;
  value?: SwInteractionValue | null;
  interactionData?: unknown;
  reason?: string;
};

const buildPhaseEndResolutionKey = (
  core: SummonerWarsCore,
  abilityId: string,
  sourceUnitId: string,
): string => `${core.turnNumber}:${core.phase}:${abilityId}:${sourceUnitId}`;

function resolveSwInteractionMeta(data: unknown): SwInteractionMeta | null {
  if (!data || typeof data !== 'object') return null;
  const sw = (data as { sw?: unknown }).sw;
  if (!sw || typeof sw !== 'object') return null;
  return sw as SwInteractionMeta;
}

function isSkipValue(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { skip?: boolean; __cancel__?: boolean };
  return candidate.skip === true || candidate.__cancel__ === true;
}

function applyPhaseEndResolution(
  state: MatchState<SummonerWarsCore>,
  abilityId: string,
  sourceUnitId: string,
): MatchState<SummonerWarsCore> {
  const key = buildPhaseEndResolutionKey(state.core, abilityId, sourceUnitId);
  const resolved = state.sys?.summonerWars?.phaseEndAbilityResolved ?? {};
  if (resolved[key]) return state;
  return {
    ...state,
    sys: {
      ...state.sys,
      summonerWars: {
        ...(state.sys as { summonerWars?: Record<string, unknown> }).summonerWars,
        phaseEndAbilityResolved: {
          ...resolved,
          [key]: true,
        },
      },
    },
  };
}

function clearPhaseEndResolution(state: MatchState<SummonerWarsCore>): MatchState<SummonerWarsCore> {
  if (!state.sys?.summonerWars?.phaseEndAbilityResolved) return state;
  return {
    ...state,
    sys: {
      ...state.sys,
      summonerWars: {
        ...(state.sys as { summonerWars?: Record<string, unknown> }).summonerWars,
        phaseEndAbilityResolved: {},
      },
    },
  };
}

function executeSwCommand(
  state: MatchState<SummonerWarsCore>,
  random: RandomFn,
  command: { type: string; payload: Record<string, unknown>; playerId?: PlayerId },
): GameEvent[] {
  const validation = validateCommand(state, {
    type: command.type,
    payload: command.payload,
    playerId: command.playerId ?? state.core.currentPlayer,
    timestamp: 0,
  });
  if (!validation.valid) {
    console.warn('[SW-InteractionSystem] Command rejected:', validation.error, command);
    return [];
  }
  return executeCommand(state, {
    type: command.type,
    payload: command.payload,
    playerId: command.playerId ?? state.core.currentPlayer,
    timestamp: 0,
  }, random);
}

function buildPositionOptions<T extends { action: string }>(
  positions: CellCoord[],
  buildValue: (pos: CellCoord) => T,
): PromptOption<T>[] {
  return positions.map((pos) => ({
    id: `pos:${pos.row},${pos.col}`,
    label: `(${pos.row},${pos.col})`,
    value: buildValue(pos),
  }));
}

function normalizeInteractionValues(value: unknown): SwInteractionValue[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is SwInteractionValue => typeof item === 'object');
  }
  if (typeof value === 'object') {
    return [value as SwInteractionValue];
  }
  return [];
}

export function createSummonerWarsInteractionSystem(): EngineSystem<SummonerWarsCore> {
  return {
    id: 'summonerwars-interactions',
    name: 'SummonerWars 交互映射',
    priority: 22,

    afterEvents: ({ state, events, random }): HookResult<SummonerWarsCore> | void => {
      let newState = state;
      const nextEvents: GameEvent[] = [];

      for (const event of events) {
        // 阶段变化时清理 phaseEnd 解析缓存
        if (event.type === FLOW_EVENTS.PHASE_CHANGED) {
          newState = clearPhaseEndResolution(newState);
        }

        if (event.type === SW_EVENTS.EVENT_INTERACTION_REQUESTED) {
          const payload = event.payload as { playerId: PlayerId; cardId: string };
          const player = newState.core.players[payload.playerId];
          if (!player) continue;
          const card = player.hand.find((c) => c.id === payload.cardId);
          if (!card || card.cardType !== 'event') continue;
          const eventCard = card as EventCard;
          const baseId = getBaseCardId(eventCard.id);
          const interactionBaseId = event.timestamp ?? 0;
          const summoner = getSummoner(newState.core, payload.playerId);
          const friendlyUnits = getPlayerUnits(newState.core, payload.playerId);
          const opponentId = payload.playerId === '0' ? '1' : '0';

          const queueEventInteraction = (
            idSuffix: string,
            title: string,
            options: PromptOption<SwInteractionValue>[],
            swMeta: SwInteractionMeta,
            config?: { sourceId?: string; targetType?: 'minion' | 'hand' | 'generic' | 'button'; multi?: PromptMultiConfig; autoResolveIfSingle?: boolean },
          ) => {
            if (options.length === 0) return;
            const interaction = createSimpleChoice(
              `sw-event-${idSuffix}-${interactionBaseId}-${payload.cardId}`,
              payload.playerId,
              title,
              options,
              {
                sourceId: config?.sourceId ?? idSuffix,
                targetType: config?.targetType,
                multi: config?.multi,
                autoResolveIfSingle: config?.autoResolveIfSingle,
              },
            );
            const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
            interaction.data = {
              ...interactionData,
              sw: swMeta,
            };
            newState = queueInteraction(newState, interaction);
          };

          switch (baseId) {
            case CARD_IDS.NECRO_HELLFIRE_BLADE:
            case CARD_IDS.BARBARIC_CHANT_OF_POWER:
            case CARD_IDS.BARBARIC_CHANT_OF_GROWTH:
            case CARD_IDS.BARBARIC_CHANT_OF_WEAVING: {
              const targets = (() => {
                if (baseId === CARD_IDS.NECRO_HELLFIRE_BLADE) {
                  return friendlyUnits.filter((unit) => unit.card.unitClass === 'common').map((unit) => unit.position);
                }
                if (baseId === CARD_IDS.BARBARIC_CHANT_OF_POWER) {
                  if (!summoner) return [];
                  return friendlyUnits
                    .filter((unit) => unit.card.unitClass !== 'summoner'
                      && manhattanDistance(summoner.position, unit.position) <= 3)
                    .map((unit) => unit.position);
                }
                return friendlyUnits.map((unit) => unit.position);
              })();
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'event_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'event-target',
                'interaction.sw.eventTarget',
                options,
                { type: 'event_target', cardId: payload.cardId, baseId },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: true },
              );
              break;
            }
            case CARD_IDS.NECRO_BLOOD_SUMMON: {
              const targets = friendlyUnits
                .filter((unit) => {
                  const pos = unit.position;
                  const adj = getAdjacentCells(pos);
                  return adj.some((p) => isValidCoord(p) && isCellEmpty(newState.core, p));
                })
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'blood_summon_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'blood-summon-target',
                'interaction.sw.bloodSummonTarget',
                options,
                { type: 'blood_summon_select_target', cardId: payload.cardId, completedCount: 0 },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: false },
              );
              break;
            }
            case CARD_IDS.NECRO_ANNIHILATE: {
              const targets = friendlyUnits
                .filter((unit) => unit.card.unitClass !== 'summoner')
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'annihilate_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'annihilate-targets',
                'interaction.sw.annihilateTargets',
                options,
                { type: 'annihilate_select_targets', cardId: payload.cardId },
                { sourceId: baseId, targetType: 'minion', multi: { min: 1 } },
              );
              break;
            }
            case CARD_IDS.TRICKSTER_MIND_CONTROL: {
              if (!summoner) break;
              const targets = getPlayerUnits(newState.core, opponentId)
                .filter((unit) => unit.card.unitClass !== 'summoner'
                  && manhattanDistance(summoner.position, unit.position) <= 2)
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'mind_control_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'mind-control',
                'interaction.sw.mindControl',
                options,
                { type: 'mind_control_select_targets', cardId: payload.cardId },
                { sourceId: baseId, targetType: 'minion', multi: { min: 1 } },
              );
              break;
            }
            case CARD_IDS.TRICKSTER_STUN: {
              if (!summoner) break;
              const targets = getPlayerUnits(newState.core, opponentId)
                .filter((unit) => unit.card.unitClass !== 'summoner')
                .filter((unit) => {
                  const dist = manhattanDistance(summoner.position, unit.position);
                  return dist > 0 && dist <= 3 && isInStraightLine(summoner.position, unit.position);
                })
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'stun_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'stun-target',
                'interaction.sw.stunTarget',
                options,
                { type: 'stun_select_target', cardId: payload.cardId },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: false },
              );
              break;
            }
            case CARD_IDS.TRICKSTER_HYPNOTIC_LURE: {
              const targets = getPlayerUnits(newState.core, opponentId)
                .filter((unit) => unit.card.unitClass !== 'summoner')
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'hypnotic_lure_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'hypnotic-lure',
                'interaction.sw.hypnoticLure',
                options,
                { type: 'hypnotic_lure_select_target', cardId: payload.cardId },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: false },
              );
              break;
            }
            case CARD_IDS.BARBARIC_CHANT_OF_ENTANGLEMENT: {
              if (!summoner) break;
              const targets = friendlyUnits
                .filter((unit) => unit.card.unitClass === 'common'
                  && manhattanDistance(summoner.position, unit.position) <= 3)
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'chant_entanglement_target',
                targetPosition: pos,
              }));
              queueEventInteraction(
                'chant-entanglement',
                'interaction.sw.chantEntanglement',
                options,
                { type: 'chant_entanglement_select_targets', cardId: payload.cardId },
                { sourceId: baseId, targetType: 'minion', multi: { min: 2, max: 2 } },
              );
              break;
            }
            case CARD_IDS.GOBLIN_SNEAK: {
              const targets = friendlyUnits
                .filter((unit) => unit.card.unitClass !== 'summoner' && unit.card.cost === 0)
                .filter((unit) => {
                  const adj = getAdjacentCells(unit.position);
                  return adj.some((pos) => isValidCoord(pos) && isCellEmpty(newState.core, pos));
                })
                .map((unit) => unit.position);
              const options = buildPositionOptions(targets, (pos) => ({
                action: 'sneak_unit',
                position: pos,
              }));
              queueEventInteraction(
                'sneak-unit',
                'interaction.sw.sneakUnit',
                options,
                { type: 'sneak_select_unit', cardId: payload.cardId, recorded: [] },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: false },
              );
              break;
            }
            case CARD_IDS.FROST_GLACIAL_SHIFT: {
              if (!summoner) break;
              const validBuildings: CellCoord[] = [];
              for (let row = 0; row < BOARD_ROWS; row++) {
                for (let col = 0; col < BOARD_COLS; col++) {
                  const pos = { row, col };
                  const structure = getStructureAt(newState.core, pos);
                  const unit = getUnitAt(newState.core, pos);
                  const isAllyStructure = (structure && structure.owner === payload.playerId)
                    || (unit && unit.owner === payload.playerId && getUnitAbilities(unit, newState.core).includes('mobile_structure'));
                  if (isAllyStructure && manhattanDistance(summoner.position, pos) <= 3) {
                    const adj = getAdjacentCells(pos);
                    const hasDest = adj.some((p) => isValidCoord(p) && isCellEmpty(newState.core, p));
                    if (hasDest) {
                      validBuildings.push(pos);
                    }
                  }
                }
              }
              const options = buildPositionOptions(validBuildings, (pos) => ({
                action: 'glacial_shift_building',
                position: pos,
              }));
              queueEventInteraction(
                'glacial-shift-building',
                'interaction.sw.glacialShiftBuilding',
                options,
                { type: 'glacial_shift_select_building', cardId: payload.cardId, recorded: [] },
                { sourceId: baseId, targetType: 'minion', autoResolveIfSingle: false },
              );
              break;
            }
            default:
              break;
          }
        }

        if (event.type === SW_EVENTS.MAGIC_EVENT_CHOICE_REQUESTED) {
          const payload = event.payload as { playerId: PlayerId; cardId: string };
          const player = newState.core.players[payload.playerId];
          if (!player) continue;
          const card = player.hand.find((c) => c.id === payload.cardId);
          if (!card || card.cardType !== 'event') continue;
          const baseId = getBaseCardId(card.id);
          const interaction = INTERACTIVE_EVENT_BASE_IDS.has(baseId);
          const options: PromptOption<SwInteractionValue>[] = [
            {
              id: 'play',
              labelKey: 'actions.playEvent',
              value: { action: 'magic_event_play' },
            },
            {
              id: 'discard',
              labelKey: 'actions.discardForMagic',
              value: { action: 'magic_event_discard' },
            },
          ];
          const interaction = createSimpleChoice(
            `sw-magic-event-choice-${event.timestamp ?? 0}-${payload.cardId}`,
            payload.playerId,
            'interaction.sw.magicEventChoice',
            options,
            { sourceId: 'magic_event_choice', targetType: 'button', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'magic_event_choice',
              cardId: payload.cardId,
              baseId,
              interaction,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.FUNERAL_PYRE_PROMPTED) {
          const payload = event.payload as { playerId: PlayerId; cardId: string; charges: number };
          const targets = getPlayerUnits(newState.core, payload.playerId)
            .filter((unit) => unit.damage > 0)
            .map((unit) => unit.position);
          const options: PromptOption<SwInteractionValue>[] = [
            ...buildPositionOptions(targets, (pos) => ({
              action: 'funeral_pyre_heal',
              targetPosition: pos,
            })),
            {
              id: 'skip',
              labelKey: 'actions.skip',
              value: { action: 'funeral_pyre_skip', skip: true },
            },
          ];
          const interaction = createSimpleChoice(
            `sw-funeral-pyre-${event.timestamp ?? 0}-${payload.cardId}`,
            payload.playerId,
            'interaction.sw.funeralPyre',
            options,
            { sourceId: 'funeral_pyre', targetType: 'minion', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'funeral_pyre',
              cardId: payload.cardId,
              charges: payload.charges,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.SUMMON_FROM_DISCARD_REQUESTED) {
          const payload = event.payload as {
            playerId: PlayerId;
            cardType: string;
            position: CellCoord;
            sourceUnitId?: string;
          };
          const player = newState.core.players[payload.playerId];
          if (!player) continue;
          const discardCards = player.discard.filter((card) => {
            if (payload.cardType === 'plagueZombie') {
              return card.cardType === 'unit' && isPlagueZombieCard(card);
            }
            return false;
          });
          if (discardCards.length === 0 || !payload.sourceUnitId) continue;

          const options: PromptOption<SwInteractionValue>[] = [
            ...discardCards.map((card) => ({
              id: card.id,
              label: card.name,
              value: {
                action: 'infection',
                cardId: card.id,
                sourceUnitId: payload.sourceUnitId!,
                targetPosition: payload.position,
              },
              displayMode: 'card',
            })),
            {
              id: 'skip',
              label: '跳过',
              labelKey: 'actions.skip',
              value: { skip: true },
            },
          ];

          const interaction = createSimpleChoice(
            `sw-infection-${event.timestamp ?? 0}-${payload.sourceUnitId}`,
            payload.playerId,
            'interaction.sw.infection',
            options,
            { sourceId: 'infection', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'infection',
              sourceUnitId: payload.sourceUnitId,
              targetPosition: payload.position,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.GRAB_FOLLOW_REQUESTED) {
          const payload = event.payload as {
            grabberUnitId: string;
            grabberPosition: CellCoord;
            movedUnitId: string;
            movedTo: CellCoord;
          };
          const grabber = getUnitAt(newState.core, payload.grabberPosition);
          if (!grabber) continue;
          const playerId = grabber.owner;
          const adj = getAdjacentCells(payload.movedTo);
          const positions = adj.filter((pos) => isCellEmpty(newState.core, pos));
          if (positions.length === 0) continue;

          const options: PromptOption<SwInteractionValue>[] = [
            ...buildPositionOptions(positions, (pos) => ({
              action: 'grab_follow',
              sourceUnitId: payload.grabberUnitId,
              targetPosition: pos,
            })),
            {
              id: 'skip',
              label: '跳过',
              labelKey: 'actions.skip',
              value: { skip: true },
            },
          ];

          const interaction = createSimpleChoice(
            `sw-grab-follow-${event.timestamp ?? 0}-${payload.grabberUnitId}`,
            playerId,
            'interaction.sw.grabFollow',
            options,
            { sourceId: 'grab', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'grab_follow',
              grabberUnitId: payload.grabberUnitId,
              movedUnitId: payload.movedUnitId,
              movedTo: payload.movedTo,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.SOUL_TRANSFER_REQUESTED) {
          const payload = event.payload as {
            sourceUnitId: string;
            sourcePosition: CellCoord;
            victimPosition: CellCoord;
            ownerId: PlayerId;
          };
          const options: PromptOption<SwInteractionValue>[] = [
            {
              id: 'confirm',
              label: '确认移动',
              labelKey: 'actions.confirmMove',
              value: {
                action: 'soul_transfer',
                sourceUnitId: payload.sourceUnitId,
                targetPosition: payload.victimPosition,
              },
            },
            {
              id: 'skip',
              label: '跳过',
              labelKey: 'actions.skip',
              value: { skip: true },
            },
          ];
          const interaction = createSimpleChoice(
            `sw-soul-transfer-${event.timestamp ?? 0}-${payload.sourceUnitId}`,
            payload.ownerId,
            'interaction.sw.soulTransfer',
            options,
            { sourceId: 'soul_transfer', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'soul_transfer',
              sourceUnitId: payload.sourceUnitId,
              sourcePosition: payload.sourcePosition,
              victimPosition: payload.victimPosition,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.MIND_CAPTURE_REQUESTED) {
          const payload = event.payload as {
            sourceUnitId: string;
            targetPosition: CellCoord;
            targetUnitId: string;
            ownerId: PlayerId;
            hits: number;
          };
          const options: PromptOption<SwInteractionValue>[] = [
            {
              id: 'control',
              label: '控制',
              labelKey: 'actions.control',
              value: {
                action: 'mind_capture',
                sourceUnitId: payload.sourceUnitId,
                targetPosition: payload.targetPosition,
                hits: payload.hits,
                choice: 'control',
              },
            },
            {
              id: 'damage',
              label: '伤害',
              labelKey: 'actions.damage',
              value: {
                action: 'mind_capture',
                sourceUnitId: payload.sourceUnitId,
                targetPosition: payload.targetPosition,
                hits: payload.hits,
                choice: 'damage',
              },
            },
          ];
          const interaction = createSimpleChoice(
            `sw-mind-capture-${event.timestamp ?? 0}-${payload.sourceUnitId}`,
            payload.ownerId,
            'interaction.sw.mindCapture',
            options,
            { sourceId: 'mind_capture_resolve', autoResolveIfSingle: false },
          );
          const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
          interaction.data = {
            ...interactionData,
            sw: {
              type: 'mind_capture',
              sourceUnitId: payload.sourceUnitId,
              sourcePosition: payload.sourcePosition,
              targetPosition: payload.targetPosition,
              targetUnitId: payload.targetUnitId,
              hits: payload.hits,
            } satisfies SwInteractionMeta,
          };
          newState = queueInteraction(newState, interaction);
        }

        if (event.type === SW_EVENTS.ABILITY_TRIGGERED) {
          const payload = event.payload as { actionId?: string; abilityId?: string; sourceUnitId?: string; sourcePosition?: CellCoord };
          const actionId = payload.actionId ?? payload.abilityId;
          const sourceUnitId = payload.sourceUnitId;
          if (!actionId || !sourceUnitId || !payload.sourcePosition) continue;
          const sourceUnit = getUnitAt(newState.core, payload.sourcePosition);
          if (!sourceUnit) continue;

          if (actionId === 'ice_shards_damage') {
            const hasCharge = (sourceUnit.boosts ?? 0) >= 1;
            const options: PromptOption<SwInteractionValue>[] = [
              {
                id: 'confirm',
                label: '确认',
                labelKey: 'actions.confirm',
                value: { action: 'ice_shards', sourceUnitId },
                disabled: !hasCharge,
                disabledReasonKey: !hasCharge ? 'statusBanners.insufficientCharge' : undefined,
              },
              {
                id: 'skip',
                label: '跳过',
                labelKey: 'actions.skip',
                value: { action: 'ice_shards', sourceUnitId, skip: true },
              },
            ];
            const interaction = createSimpleChoice(
              `sw-ice-shards-${event.timestamp ?? 0}-${sourceUnitId}`,
              sourceUnit.owner,
              'interaction.sw.iceShards',
              options,
              { sourceId: 'ice_shards', autoResolveIfSingle: false },
            );
            const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
            interaction.data = {
              ...interactionData,
              sw: {
                type: 'ice_shards',
                sourceUnitId,
              } satisfies SwInteractionMeta,
            };
            newState = queueInteraction(newState, interaction);
          }

          if (actionId === 'feed_beast_check') {
            const adj = getAdjacentCells(payload.sourcePosition);
            const positions = adj.filter((pos) => {
              const unit = getUnitAt(newState.core, pos);
              return !!unit && unit.owner === sourceUnit.owner && unit.instanceId !== sourceUnitId;
            });
            const options: PromptOption<SwInteractionValue>[] = [
              ...buildPositionOptions(positions, (pos) => ({
                action: 'feed_beast',
                sourceUnitId,
                choice: 'destroy_adjacent',
                targetPosition: pos,
              })),
              {
                id: 'self_destroy',
                label: '自毁',
                labelKey: 'actions.feedBeastSelfDestroy',
                value: { action: 'feed_beast', sourceUnitId, choice: 'self_destroy' },
              },
            ];
            const interaction = createSimpleChoice(
              `sw-feed-beast-${event.timestamp ?? 0}-${sourceUnitId}`,
              sourceUnit.owner,
              'interaction.sw.feedBeast',
              options,
              { sourceId: 'feed_beast', autoResolveIfSingle: false },
            );
            const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
            interaction.data = {
              ...interactionData,
              sw: {
                type: 'feed_beast',
                sourceUnitId,
              } satisfies SwInteractionMeta,
            };
            newState = queueInteraction(newState, interaction);
          }
        }

        if (event.type === INTERACTION_EVENTS.RESOLVED || event.type === INTERACTION_EVENTS.CANCELLED) {
          const payload = event.payload as InteractionResolutionPayload;
          const sw = resolveSwInteractionMeta(payload.interactionData);
          if (!sw) continue;
          const value = payload.value ?? null;
          const values = normalizeInteractionValues(value);

          if (sw.type === 'event_target') {
            const target = values.find((item) => item.action === 'event_target') as { action: 'event_target'; targetPosition: CellCoord } | undefined;
            if (target?.targetPosition) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: [target.targetPosition],
                },
              }));
            }
          }

          if (sw.type === 'magic_event_choice') {
            const picked = values.find((item) => item.action === 'magic_event_play' || item.action === 'magic_event_discard');
            if (picked?.action === 'magic_event_play') {
              const playCommandType = sw.interaction ? SW_COMMANDS.REQUEST_EVENT_INTERACTION : SW_COMMANDS.PLAY_EVENT;
              nextEvents.push(...executeSwCommand(newState, random, {
                type: playCommandType,
                payload: {
                  cardId: sw.cardId,
                },
              }));
            }
            if (picked?.action === 'magic_event_discard') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.DISCARD_FOR_MAGIC,
                payload: {
                  cardIds: [sw.cardId],
                },
              }));
            }
          }

          if (sw.type === 'funeral_pyre') {
            const picked = values.find((item) => item.action === 'funeral_pyre_heal') as { action: 'funeral_pyre_heal'; targetPosition: CellCoord } | undefined;
            const hasSkip = isSkipValue(value) || values.some((item) => item.action === 'funeral_pyre_skip');
            if (picked?.targetPosition) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.FUNERAL_PYRE_HEAL,
                payload: {
                  cardId: sw.cardId,
                  targetPosition: picked.targetPosition,
                },
              }));
            } else if (hasSkip) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.FUNERAL_PYRE_HEAL,
                payload: {
                  cardId: sw.cardId,
                  skip: true,
                },
              }));
            }
          }

          if (sw.type === 'blood_summon_select_target') {
            const target = values.find((item) => item.action === 'blood_summon_target') as { action: 'blood_summon_target'; targetPosition: CellCoord } | undefined;
            if (target?.targetPosition) {
              const handCards = newState.core.players[payload.playerId].hand
                .filter((card) => card.cardType === 'unit' && (card as UnitCard).cost <= 2);
              const options: PromptOption<SwInteractionValue>[] = handCards.map((card) => ({
                id: card.id,
                label: card.name,
                value: { action: 'blood_summon_card', summonCardId: card.id },
                displayMode: 'card',
              }));
              if (options.length > 0) {
                const interaction = createSimpleChoice(
                  `sw-blood-summon-card-${event.timestamp ?? 0}-${sw.cardId}`,
                  payload.playerId,
                  'interaction.sw.bloodSummonCard',
                  options,
                  { sourceId: 'blood_summon', targetType: 'hand', autoResolveIfSingle: false },
                );
                const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                interaction.data = {
                  ...interactionData,
                  sw: {
                    type: 'blood_summon_select_card',
                    cardId: sw.cardId,
                    targetPosition: target.targetPosition,
                    completedCount: sw.completedCount ?? 0,
                  } satisfies SwInteractionMeta,
                };
                newState = queueInteraction(newState, interaction, { urgent: true });
              }
            }
          }

          if (sw.type === 'blood_summon_select_card') {
            const picked = values.find((item) => item.action === 'blood_summon_card') as { action: 'blood_summon_card'; summonCardId: string } | undefined;
            if (picked?.summonCardId && sw.targetPosition) {
              const adj = getAdjacentCells(sw.targetPosition);
              const positions = adj.filter((pos) => isValidCoord(pos) && isCellEmpty(newState.core, pos));
              const options = buildPositionOptions(positions, (pos) => ({
                action: 'blood_summon_position',
                summonPosition: pos,
              }));
              if (options.length > 0) {
                const interaction = createSimpleChoice(
                  `sw-blood-summon-pos-${event.timestamp ?? 0}-${sw.cardId}`,
                  payload.playerId,
                  'interaction.sw.bloodSummonPosition',
                  options,
                  { sourceId: 'blood_summon', targetType: 'minion', autoResolveIfSingle: false },
                );
                const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                interaction.data = {
                  ...interactionData,
                  sw: {
                    type: 'blood_summon_select_position',
                    cardId: sw.cardId,
                    targetPosition: sw.targetPosition,
                    summonCardId: picked.summonCardId,
                    completedCount: sw.completedCount ?? 0,
                  } satisfies SwInteractionMeta,
                };
                newState = queueInteraction(newState, interaction, { urgent: true });
              }
            }
          }

          if (sw.type === 'blood_summon_select_position') {
            const picked = values.find((item) => item.action === 'blood_summon_position') as { action: 'blood_summon_position'; summonPosition: CellCoord } | undefined;
            if (picked?.summonPosition && sw.targetPosition && sw.summonCardId) {
              if ((sw.completedCount ?? 0) === 0) {
                nextEvents.push(...executeSwCommand(newState, random, {
                  type: SW_COMMANDS.PLAY_EVENT,
                  payload: {
                    cardId: sw.cardId,
                  },
                }));
              }
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.BLOOD_SUMMON_STEP,
                payload: {
                  targetUnitPosition: sw.targetPosition,
                  summonCardId: sw.summonCardId,
                  summonPosition: picked.summonPosition,
                },
              }));

              const options: PromptOption<SwInteractionValue>[] = [
                {
                  id: 'continue',
                  label: '继续',
                  labelKey: 'actions.continue',
                  value: { action: 'blood_summon_continue' },
                },
                {
                  id: 'finish',
                  label: '完成',
                  labelKey: 'actions.finish',
                  value: { action: 'blood_summon_finish' },
                },
              ];
              const interaction = createSimpleChoice(
                `sw-blood-summon-confirm-${event.timestamp ?? 0}-${sw.cardId}`,
                payload.playerId,
                'interaction.sw.bloodSummonConfirm',
                options,
                { sourceId: 'blood_summon', targetType: 'button', autoResolveIfSingle: false },
              );
              const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
              interaction.data = {
                ...interactionData,
                sw: {
                  type: 'blood_summon_confirm',
                  cardId: sw.cardId,
                  completedCount: (sw.completedCount ?? 0) + 1,
                } satisfies SwInteractionMeta,
              };
              newState = queueInteraction(newState, interaction, { urgent: true });
            }
          }

          if (sw.type === 'blood_summon_confirm') {
            if (isSkipValue(value)) {
              // do nothing
            } else {
              const picked = values.find((item) => item.action === 'blood_summon_continue' || item.action === 'blood_summon_finish');
              if (picked?.action === 'blood_summon_continue') {
                const targets = getPlayerUnits(newState.core, payload.playerId)
                  .filter((unit) => {
                    const adj = getAdjacentCells(unit.position);
                    return adj.some((pos) => isValidCoord(pos) && isCellEmpty(newState.core, pos));
                  })
                  .map((unit) => unit.position);
                const options = buildPositionOptions(targets, (pos) => ({
                  action: 'blood_summon_target',
                  targetPosition: pos,
                }));
                if (options.length > 0) {
                  const interaction = createSimpleChoice(
                    `sw-blood-summon-target-${event.timestamp ?? 0}-${sw.cardId}`,
                    payload.playerId,
                    'interaction.sw.bloodSummonTarget',
                    options,
                    { sourceId: 'blood_summon', targetType: 'minion', autoResolveIfSingle: false },
                  );
                  const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                  interaction.data = {
                    ...interactionData,
                    sw: {
                      type: 'blood_summon_select_target',
                      cardId: sw.cardId,
                      completedCount: sw.completedCount ?? 0,
                    } satisfies SwInteractionMeta,
                  };
                  newState = queueInteraction(newState, interaction, { urgent: true });
                }
              }
            }
          }

          if (sw.type === 'annihilate_select_targets') {
            const selectedTargets = values
              .filter((item) => item.action === 'annihilate_target')
              .map((item) => item.targetPosition);
            if (selectedTargets.length > 0) {
              const damageTargets = selectedTargets.map(() => null as CellCoord | null);
              const currentTarget = selectedTargets[0];
              const adj = getAdjacentCells(currentTarget).filter((pos) => {
                return !!getUnitAt(newState.core, pos) || !!getStructureAt(newState.core, pos);
              });
              const options: PromptOption<SwInteractionValue>[] = [
                ...buildPositionOptions(adj, (pos) => ({
                  action: 'annihilate_damage',
                  targetPosition: pos,
                })),
                {
                  id: 'skip',
                  label: '跳过',
                  labelKey: 'actions.skip',
                  value: { action: 'annihilate_damage_skip', skip: true },
                },
              ];
              const interaction = createSimpleChoice(
                `sw-annihilate-damage-${event.timestamp ?? 0}-${sw.cardId}`,
                payload.playerId,
                'interaction.sw.annihilateDamage',
                options,
                { sourceId: 'annihilate', targetType: 'minion', autoResolveIfSingle: false },
              );
              const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
              interaction.data = {
                ...interactionData,
                sw: {
                  type: 'annihilate_select_damage',
                  cardId: sw.cardId,
                  selectedTargets,
                  currentTargetIndex: 0,
                  damageTargets,
                } satisfies SwInteractionMeta,
              };
              newState = queueInteraction(newState, interaction, { urgent: true });
            }
          }

          if (sw.type === 'annihilate_select_damage') {
            if (!sw.selectedTargets || sw.selectedTargets.length === 0) continue;
            const currentIndex = sw.currentTargetIndex ?? 0;
            const updatedDamageTargets = [...(sw.damageTargets ?? [])];
            const pickedDamage = values.find((item) => item.action === 'annihilate_damage') as { action: 'annihilate_damage'; targetPosition: CellCoord } | undefined;
            if (pickedDamage?.targetPosition) {
              updatedDamageTargets[currentIndex] = pickedDamage.targetPosition;
            } else {
              updatedDamageTargets[currentIndex] = null;
            }
            const nextIndex = currentIndex + 1;
            if (nextIndex < sw.selectedTargets.length) {
              const nextTarget = sw.selectedTargets[nextIndex];
              const adj = getAdjacentCells(nextTarget).filter((pos) => {
                return !!getUnitAt(newState.core, pos) || !!getStructureAt(newState.core, pos);
              });
              const options: PromptOption<SwInteractionValue>[] = [
                ...buildPositionOptions(adj, (pos) => ({
                  action: 'annihilate_damage',
                  targetPosition: pos,
                })),
                {
                  id: 'skip',
                  label: '跳过',
                  labelKey: 'actions.skip',
                  value: { action: 'annihilate_damage_skip', skip: true },
                },
              ];
              const interaction = createSimpleChoice(
                `sw-annihilate-damage-${event.timestamp ?? 0}-${sw.cardId}`,
                payload.playerId,
                'interaction.sw.annihilateDamage',
                options,
                { sourceId: 'annihilate', targetType: 'minion', autoResolveIfSingle: false },
              );
              const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
              interaction.data = {
                ...interactionData,
                sw: {
                  type: 'annihilate_select_damage',
                  cardId: sw.cardId,
                  selectedTargets: sw.selectedTargets,
                  currentTargetIndex: nextIndex,
                  damageTargets: updatedDamageTargets,
                } satisfies SwInteractionMeta,
              };
              newState = queueInteraction(newState, interaction, { urgent: true });
            } else {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: sw.selectedTargets,
                  damageTargets: updatedDamageTargets,
                },
              }));
            }
          }

          if (sw.type === 'mind_control_select_targets') {
            const selectedTargets = values
              .filter((item) => item.action === 'mind_control_target')
              .map((item) => item.targetPosition);
            if (selectedTargets.length > 0) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: selectedTargets,
                },
              }));
            }
          }

          if (sw.type === 'stun_select_target') {
            const target = values.find((item) => item.action === 'stun_target') as { action: 'stun_target'; targetPosition: CellCoord } | undefined;
            if (target?.targetPosition) {
              const dests = getStunDestinations(newState.core, target.targetPosition);
              if (dests.length === 0) {
                nextEvents.push(...executeSwCommand(newState, random, {
                  type: SW_COMMANDS.PLAY_EVENT,
                  payload: {
                    cardId: sw.cardId,
                    targets: [target.targetPosition],
                    direction: 'push',
                    distance: 1,
                  },
                }));
              } else {
                const options: PromptOption<SwInteractionValue>[] = dests.map((dest) => ({
                  id: `pos:${dest.position.row},${dest.position.col}`,
                  label: `(${dest.position.row},${dest.position.col})`,
                  value: {
                    action: 'stun_destination',
                    targetPosition: dest.position,
                    moveRow: dest.moveRow,
                    moveCol: dest.moveCol,
                    distance: dest.distance,
                  },
                }));
                const interaction = createSimpleChoice(
                  `sw-stun-destination-${event.timestamp ?? 0}-${sw.cardId}`,
                  payload.playerId,
                  'interaction.sw.stunDestination',
                  options,
                  { sourceId: 'stun', targetType: 'minion', autoResolveIfSingle: false },
                );
                const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                interaction.data = {
                  ...interactionData,
                  sw: {
                    type: 'stun_select_destination',
                    cardId: sw.cardId,
                    targetPosition: target.targetPosition,
                  } satisfies SwInteractionMeta,
                };
                newState = queueInteraction(newState, interaction, { urgent: true });
              }
            }
          }

          if (sw.type === 'stun_select_destination') {
            const picked = values.find((item) => item.action === 'stun_destination') as {
              action: 'stun_destination';
              targetPosition: CellCoord;
              moveRow: number;
              moveCol: number;
              distance: number;
            } | undefined;
            if (picked && sw.targetPosition) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: [sw.targetPosition],
                  moveRow: picked.moveRow,
                  moveCol: picked.moveCol,
                  distance: picked.distance,
                },
              }));
            }
          }

          if (sw.type === 'hypnotic_lure_select_target') {
            const target = values.find((item) => item.action === 'hypnotic_lure_target') as { action: 'hypnotic_lure_target'; targetPosition: CellCoord } | undefined;
            if (target?.targetPosition) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: [target.targetPosition],
                },
              }));
            }
          }

          if (sw.type === 'chant_entanglement_select_targets') {
            const selectedTargets = values
              .filter((item) => item.action === 'chant_entanglement_target')
              .map((item) => item.targetPosition);
            if (selectedTargets.length === 2) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.PLAY_EVENT,
                payload: {
                  cardId: sw.cardId,
                  targets: selectedTargets,
                },
              }));
            }
          }

          if (sw.type === 'sneak_select_unit') {
            const finish = values.find((item) => item.action === 'sneak_finish');
            if (finish) {
              if (sw.recorded && sw.recorded.length > 0) {
                nextEvents.push(...executeSwCommand(newState, random, {
                  type: SW_COMMANDS.PLAY_EVENT,
                  payload: {
                    cardId: sw.cardId,
                    sneakDirections: sw.recorded,
                  },
                }));
              }
            } else {
              const unitPick = values.find((item) => item.action === 'sneak_unit') as { action: 'sneak_unit'; position: CellCoord } | undefined;
              if (unitPick?.position) {
                const adj = getAdjacentCells(unitPick.position)
                  .filter((pos) => isValidCoord(pos) && isCellEmpty(newState.core, pos));
                if (adj.length > 0) {
                  const options = buildPositionOptions(adj, (pos) => ({
                    action: 'sneak_destination',
                    newPosition: pos,
                    targetPosition: pos,
                  }));
                  const interaction = createSimpleChoice(
                    `sw-sneak-direction-${event.timestamp ?? 0}-${sw.cardId}`,
                    payload.playerId,
                    'interaction.sw.sneakDirection',
                    options,
                    { sourceId: 'sneak', targetType: 'minion', autoResolveIfSingle: false },
                  );
                  const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                  interaction.data = {
                    ...interactionData,
                    sw: {
                      type: 'sneak_select_direction',
                      cardId: sw.cardId,
                      currentUnit: unitPick.position,
                      recorded: sw.recorded ?? [],
                    } satisfies SwInteractionMeta,
                  };
                  newState = queueInteraction(newState, interaction, { urgent: true });
                }
              }
            }
          }

          if (sw.type === 'sneak_select_direction') {
            const picked = values.find((item) => item.action === 'sneak_destination') as {
              action: 'sneak_destination';
              newPosition: CellCoord;
              targetPosition: CellCoord;
            } | undefined;
            if (picked?.newPosition && sw.currentUnit) {
              const recorded = [...(sw.recorded ?? []), { position: sw.currentUnit, newPosition: picked.newPosition }];
              const remainingUnits = getPlayerUnits(newState.core, payload.playerId)
                .filter((unit) => unit.card.unitClass !== 'summoner' && unit.card.cost === 0)
                .filter((unit) => {
                  const key = `${unit.position.row}-${unit.position.col}`;
                  return !recorded.some((entry) => `${entry.position.row}-${entry.position.col}` === key);
                })
                .filter((unit) => {
                  const adj = getAdjacentCells(unit.position);
                  return adj.some((pos) => isValidCoord(pos) && isCellEmpty(newState.core, pos));
                })
                .map((unit) => unit.position);
              const options: PromptOption<SwInteractionValue>[] = [
                ...buildPositionOptions(remainingUnits, (pos) => ({
                  action: 'sneak_unit',
                  position: pos,
                })),
                ...(recorded.length > 0 ? [{
                  id: 'finish',
                  label: '确认选择',
                  labelKey: 'actions.confirmSelection',
                  value: { action: 'sneak_finish' },
                }] : []),
              ];
              if (options.length > 0) {
                const interaction = createSimpleChoice(
                  `sw-sneak-unit-${event.timestamp ?? 0}-${sw.cardId}`,
                  payload.playerId,
                  'interaction.sw.sneakUnit',
                  options,
                  { sourceId: 'sneak', targetType: 'minion', autoResolveIfSingle: false },
                );
                const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                interaction.data = {
                  ...interactionData,
                  sw: {
                    type: 'sneak_select_unit',
                    cardId: sw.cardId,
                    recorded,
                  } satisfies SwInteractionMeta,
                };
                newState = queueInteraction(newState, interaction, { urgent: true });
              }
            }
          }

          if (sw.type === 'glacial_shift_select_building') {
            const finish = values.find((item) => item.action === 'glacial_shift_finish');
            if (finish) {
              if (sw.recorded && sw.recorded.length > 0) {
                nextEvents.push(...executeSwCommand(newState, random, {
                  type: SW_COMMANDS.PLAY_EVENT,
                  payload: {
                    cardId: sw.cardId,
                    shiftDirections: sw.recorded,
                  },
                }));
              }
            } else {
              const picked = values.find((item) => item.action === 'glacial_shift_building') as { action: 'glacial_shift_building'; position: CellCoord } | undefined;
              if (picked?.position) {
                const { row, col } = picked.position;
                const options: PromptOption<SwInteractionValue>[] = [];
                const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
                for (const { dr, dc } of dirs) {
                  for (let step = 1; step <= 2; step++) {
                    const pos = { row: row + dr * step, col: col + dc * step };
                    if (!isValidCoord(pos) || !isCellEmpty(newState.core, pos)) break;
                    options.push({
                      id: `pos:${pos.row},${pos.col}`,
                      label: `(${pos.row},${pos.col})`,
                      value: { action: 'glacial_shift_destination', newPosition: pos, targetPosition: pos },
                    });
                  }
                }
                if (options.length > 0) {
                  const interaction = createSimpleChoice(
                    `sw-glacial-shift-destination-${event.timestamp ?? 0}-${sw.cardId}`,
                    payload.playerId,
                    'interaction.sw.glacialShiftDestination',
                    options,
                    { sourceId: 'glacial_shift', targetType: 'minion', autoResolveIfSingle: false },
                  );
                  const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                  interaction.data = {
                    ...interactionData,
                    sw: {
                      type: 'glacial_shift_select_destination',
                      cardId: sw.cardId,
                      currentBuilding: picked.position,
                      recorded: sw.recorded ?? [],
                    } satisfies SwInteractionMeta,
                  };
                  newState = queueInteraction(newState, interaction, { urgent: true });
                }
              }
            }
          }

          if (sw.type === 'glacial_shift_select_destination') {
            const picked = values.find((item) => item.action === 'glacial_shift_destination') as {
              action: 'glacial_shift_destination';
              newPosition: CellCoord;
              targetPosition: CellCoord;
            } | undefined;
            if (picked?.newPosition && sw.currentBuilding) {
              const recorded = [...(sw.recorded ?? []), { position: sw.currentBuilding, newPosition: picked.newPosition }];
              if (recorded.length >= 3) {
                nextEvents.push(...executeSwCommand(newState, random, {
                  type: SW_COMMANDS.PLAY_EVENT,
                  payload: {
                    cardId: sw.cardId,
                    shiftDirections: recorded,
                  },
                }));
              } else {
                const summoner = getSummoner(newState.core, payload.playerId);
                const validBuildings: CellCoord[] = [];
                if (summoner) {
                  for (let row = 0; row < BOARD_ROWS; row++) {
                    for (let col = 0; col < BOARD_COLS; col++) {
                      const pos = { row, col };
                      const structure = getStructureAt(newState.core, pos);
                      const unit = getUnitAt(newState.core, pos);
                      const isAllyStructure = (structure && structure.owner === payload.playerId)
                        || (unit && unit.owner === payload.playerId && getUnitAbilities(unit, newState.core).includes('mobile_structure'));
                      if (!isAllyStructure) continue;
                      if (manhattanDistance(summoner.position, pos) > 3) continue;
                      const key = `${pos.row}-${pos.col}`;
                      if (recorded.some((entry) => `${entry.position.row}-${entry.position.col}` === key)) continue;
                      const adj = getAdjacentCells(pos);
                      const hasDest = adj.some((p) => isValidCoord(p) && isCellEmpty(newState.core, p));
                      if (hasDest) {
                        validBuildings.push(pos);
                      }
                    }
                  }
                }
                const options: PromptOption<SwInteractionValue>[] = [
                  ...buildPositionOptions(validBuildings, (pos) => ({
                    action: 'glacial_shift_building',
                    position: pos,
                  })),
                  ...(recorded.length > 0 ? [{
                    id: 'finish',
                    label: '确认选择',
                    labelKey: 'actions.confirmSelection',
                    value: { action: 'glacial_shift_finish' },
                  }] : []),
                ];
                if (options.length > 0) {
                  const interaction = createSimpleChoice(
                    `sw-glacial-shift-building-${event.timestamp ?? 0}-${sw.cardId}`,
                    payload.playerId,
                    'interaction.sw.glacialShiftBuilding',
                    options,
                    { sourceId: 'glacial_shift', targetType: 'minion', autoResolveIfSingle: false },
                  );
                  const interactionData = (interaction.data ?? {}) as Record<string, unknown>;
                  interaction.data = {
                    ...interactionData,
                    sw: {
                      type: 'glacial_shift_select_building',
                      cardId: sw.cardId,
                      recorded,
                    } satisfies SwInteractionMeta,
                  };
                  newState = queueInteraction(newState, interaction, { urgent: true });
                }
              }
            }
          }

          if (sw.type === 'infection') {
            if (value && value.action === 'infection') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'infection',
                  sourceUnitId: value.sourceUnitId,
                  targetCardId: value.cardId,
                  targetPosition: value.targetPosition,
                  _noSnapshot: true,
                },
              }));
            }
          }

          if (sw.type === 'grab_follow') {
            if (value && value.action === 'grab_follow') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'grab',
                  sourceUnitId: value.sourceUnitId,
                  targetPosition: value.targetPosition,
                  _noSnapshot: true,
                },
              }));
            }
          }

          if (sw.type === 'soul_transfer') {
            if (value && value.action === 'soul_transfer') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'soul_transfer',
                  sourceUnitId: value.sourceUnitId,
                  targetPosition: value.targetPosition,
                  _noSnapshot: true,
                },
              }));
            }
          }

          if (sw.type === 'mind_capture') {
            if (value && value.action === 'mind_capture') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'mind_capture_resolve',
                  sourceUnitId: value.sourceUnitId,
                  choice: value.choice,
                  targetPosition: value.targetPosition,
                  hits: value.hits,
                  _noSnapshot: true,
                },
              }));
            }
          }

          if (sw.type === 'ice_shards') {
            newState = applyPhaseEndResolution(newState, 'ice_shards', sw.sourceUnitId);
            if (!isSkipValue(value)) {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'ice_shards',
                  sourceUnitId: sw.sourceUnitId,
                  _noSnapshot: true,
                },
              }));
            }
          }

          if (sw.type === 'feed_beast') {
            newState = applyPhaseEndResolution(newState, 'feed_beast', sw.sourceUnitId);
            if (value && value.action === 'feed_beast') {
              nextEvents.push(...executeSwCommand(newState, random, {
                type: SW_COMMANDS.ACTIVATE_ABILITY,
                payload: {
                  abilityId: 'feed_beast',
                  sourceUnitId: value.sourceUnitId,
                  choice: value.choice,
                  targetPosition: value.targetPosition,
                  _noSnapshot: true,
                },
              }));
            }
          }
        }
      }

      if (newState !== state || nextEvents.length > 0) {
        return {
          state: newState,
          events: nextEvents.length > 0 ? nextEvents : undefined,
        };
      }
    },
  };
}
