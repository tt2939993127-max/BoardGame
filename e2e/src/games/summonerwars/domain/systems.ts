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
import type { PromptOption } from '../../../engine/systems/InteractionSystem';
import type { SummonerWarsCore, CellCoord } from './types';
import { SW_COMMANDS, SW_EVENTS } from './types';
import { executeCommand } from './execute';
import { validateCommand } from './validate';
import { getAdjacentCells, getUnitAt, isCellEmpty } from './helpers';
import { isPlagueZombieCard } from './ids';

type SwInteractionMeta =
  | {
      type: 'infection';
      sourceUnitId: string;
      targetPosition: CellCoord;
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
      victimPosition: CellCoord;
    }
  | {
      type: 'mind_capture';
      sourceUnitId: string;
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

function buildPositionOptions<T extends { action: string; sourceUnitId: string }>(
  positions: CellCoord[],
  buildValue: (pos: CellCoord) => T,
): PromptOption<T>[] {
  return positions.map((pos) => ({
    id: `pos:${pos.row},${pos.col}`,
    label: `(${pos.row},${pos.col})`,
    value: buildValue(pos),
  }));
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

          const options: PromptOption<SwInteractionValue>[] = discardCards.map((card) => ({
            id: card.id,
            label: card.name,
            value: {
              action: 'infection',
              cardId: card.id,
              sourceUnitId: payload.sourceUnitId!,
              targetPosition: payload.position,
            },
            displayMode: 'card',
          }));

          const interaction = createSimpleChoice(
            `sw-infection-${event.timestamp ?? 0}-${payload.sourceUnitId}`,
            payload.playerId,
            'interaction.sw.infection',
            options,
            { sourceId: 'infection', autoResolveIfSingle: false },
          );
          (interaction.data as any).sw = {
            type: 'infection',
            sourceUnitId: payload.sourceUnitId,
            targetPosition: payload.position,
          } satisfies SwInteractionMeta;
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
          (interaction.data as any).sw = {
            type: 'grab_follow',
            grabberUnitId: payload.grabberUnitId,
            movedUnitId: payload.movedUnitId,
            movedTo: payload.movedTo,
          } satisfies SwInteractionMeta;
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
          (interaction.data as any).sw = {
            type: 'soul_transfer',
            sourceUnitId: payload.sourceUnitId,
            victimPosition: payload.victimPosition,
          } satisfies SwInteractionMeta;
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
          (interaction.data as any).sw = {
            type: 'mind_capture',
            sourceUnitId: payload.sourceUnitId,
            targetPosition: payload.targetPosition,
            targetUnitId: payload.targetUnitId,
            hits: payload.hits,
          } satisfies SwInteractionMeta;
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
            const options: PromptOption<SwInteractionValue>[] = [
              {
                id: 'confirm',
                label: '确认',
                labelKey: 'actions.confirm',
                value: { action: 'ice_shards', sourceUnitId },
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
            (interaction.data as any).sw = {
              type: 'ice_shards',
              sourceUnitId,
            } satisfies SwInteractionMeta;
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
            (interaction.data as any).sw = {
              type: 'feed_beast',
              sourceUnitId,
            } satisfies SwInteractionMeta;
            newState = queueInteraction(newState, interaction);
          }
        }

        if (event.type === INTERACTION_EVENTS.RESOLVED || event.type === INTERACTION_EVENTS.CANCELLED) {
          const payload = event.payload as InteractionResolutionPayload;
          const sw = resolveSwInteractionMeta(payload.interactionData);
          if (!sw) continue;
          const value = payload.value ?? null;

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
