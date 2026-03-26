import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTrainingDecisionSample } from '../trainingData';
import {
    JsonlTrainingDataRecorder,
    createTrainingDataRecorderFromEnv,
} from '../../../../server/trainingDataRecorder';

const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('trainingData', () => {
    it('应从前后状态中提取交互与响应窗口快照', () => {
        const sample = buildTrainingDecisionSample({
            rulesVersion: 'test-rules-v1',
            gameId: 'smashup',
            matchId: 'match-1',
            playerId: '0',
            stateIdBefore: 12,
            stateIdAfter: 13,
            commandType: 'SYS_INTERACTION_RESPOND',
            payload: { optionId: 'yes' },
            preState: {
                core: { currentPlayer: '0' },
                sys: {
                    interaction: {
                        current: {
                            id: 'i-1',
                            kind: 'simple-choice',
                            sourceId: 'robot_hoverbot',
                            playerId: '0',
                            data: {
                                options: [
                                    { id: 'yes', label: '是', value: { play: true }, displayMode: 'button' },
                                    { id: 'no', label: '否', value: { play: false }, disabled: true },
                                ],
                            },
                        },
                    },
                    responseWindow: {
                        current: {
                            windowType: 'meFirst',
                            currentResponderIndex: 1,
                            responderQueue: ['0', '1'],
                            allowedCommands: ['su:play_action'],
                        },
                    },
                },
            },
            postState: {
                core: { currentPlayer: '0' },
                sys: {
                    interaction: { current: null },
                    responseWindow: { current: null },
                },
            },
            legalActions: [
                {
                    actionId: 'respond:yes',
                    kind: 'interaction',
                    label: '响应 yes',
                    commands: [{ type: 'SYS_INTERACTION_RESPOND', payload: { optionId: 'yes' } }],
                },
            ],
            capturedAt: 123456789,
        });

        expect(sample).toMatchObject({
            schemaVersion: 1,
            source: 'online',
            capturedAt: 123456789,
            rulesVersion: 'test-rules-v1',
            gameId: 'smashup',
            matchId: 'match-1',
            playerId: '0',
            stateIdBefore: 12,
            stateIdAfter: 13,
            command: {
                type: 'SYS_INTERACTION_RESPOND',
                payload: { optionId: 'yes' },
            },
            interactionBefore: {
                id: 'i-1',
                kind: 'simple-choice',
                sourceId: 'robot_hoverbot',
                playerId: '0',
                options: [
                    { id: 'yes', label: '是', value: { play: true }, displayMode: 'button' },
                    { id: 'no', label: '否', value: { play: false }, disabled: true },
                ],
            },
            interactionAfter: null,
            responseWindowBefore: {
                windowType: 'meFirst',
                currentResponderIndex: 1,
                responderQueue: ['0', '1'],
                allowedCommands: ['su:play_action'],
            },
            responseWindowAfter: null,
            legalActions: [
                {
                    actionId: 'respond:yes',
                    kind: 'interaction',
                    label: '响应 yes',
                    commands: [{ type: 'SYS_INTERACTION_RESPOND', payload: { optionId: 'yes' } }],
                },
            ],
        });
    });

    it('JSONL recorder 应将样本按游戏和日期落盘', async () => {
        const baseDir = await mkdtemp(path.join(os.tmpdir(), 'bg-training-data-'));
        tempDirs.push(baseDir);

        const recorder = new JsonlTrainingDataRecorder({ baseDir });
        const sample = buildTrainingDecisionSample({
            rulesVersion: 'test-rules-v1',
            gameId: 'tictactoe',
            matchId: 'match-jsonl-1',
            playerId: '0',
            stateIdBefore: 1,
            stateIdAfter: 2,
            commandType: 'CLICK_CELL',
            payload: { cellId: 4 },
            preState: { core: { cells: Array(9).fill(null) }, sys: {} },
            postState: { core: { cells: [null, null, null, null, '0', null, null, null, null] }, sys: {} },
            capturedAt: Date.UTC(2026, 2, 25, 12, 0, 0),
        });

        await recorder.recordDecisionSample(sample);

        const filePath = path.join(baseDir, 'tictactoe', '2026-03-25.jsonl');
        const content = await readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');

        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0])).toMatchObject({
            gameId: 'tictactoe',
            matchId: 'match-jsonl-1',
            command: {
                type: 'CLICK_CELL',
                payload: { cellId: 4 },
            },
        });
    });

    it('env helper 默认仅 production 开启，显式开关可覆盖', () => {
        expect(createTrainingDataRecorderFromEnv({})).toBeUndefined();
        expect(createTrainingDataRecorderFromEnv({
            NODE_ENV: 'development',
        })).toBeUndefined();
        expect(createTrainingDataRecorderFromEnv({
            NODE_ENV: 'production',
        })).toBeInstanceOf(JsonlTrainingDataRecorder);
        expect(createTrainingDataRecorderFromEnv({
            NODE_ENV: 'development',
            ENABLE_TRAINING_DATA_CAPTURE: 'true',
        })).toBeInstanceOf(JsonlTrainingDataRecorder);
        expect(createTrainingDataRecorderFromEnv({
            NODE_ENV: 'production',
            ENABLE_TRAINING_DATA_CAPTURE: 'false',
        })).toBeUndefined();
    });
});
