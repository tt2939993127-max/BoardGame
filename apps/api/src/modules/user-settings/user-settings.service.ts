import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { AudioSettingsPayload } from './dtos/audio-settings.dto';
import { UserAudioSettings, type UserAudioSettingsDocument } from './schemas/user-audio-settings.schema';

@Injectable()
export class UserSettingsService {
    constructor(
        @InjectModel(UserAudioSettings.name)
        private readonly audioSettingsModel: Model<UserAudioSettingsDocument>,
    ) {}

    async getAudioSettings(userId: string): Promise<UserAudioSettingsDocument | null> {
        return this.audioSettingsModel.findOne({ userId });
    }

    async upsertAudioSettings(
        userId: string,
        settings: AudioSettingsPayload
    ): Promise<UserAudioSettingsDocument> {
        const normalizedSelections = normalizeBgmSelections(settings.bgmSelections);
        return this.audioSettingsModel.findOneAndUpdate(
            { userId },
            {
                $set: {
                    muted: settings.muted,
                    masterVolume: settings.masterVolume,
                    sfxVolume: settings.sfxVolume,
                    bgmVolume: settings.bgmVolume,
                    bgmSelections: normalizedSelections,
                },
                $setOnInsert: { userId },
            },
            { new: true, upsert: true }
        );
    }
}

function normalizeBgmSelections(
    input?: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
    if (!input || typeof input !== 'object') return {};
    const result: Record<string, Record<string, string>> = {};
    for (const [gameId, groups] of Object.entries(input)) {
        if (!groups || typeof groups !== 'object') continue;
        const normalizedGroups: Record<string, string> = {};
        for (const [groupId, key] of Object.entries(groups)) {
            if (typeof key === 'string') {
                normalizedGroups[groupId] = key;
            }
        }
        if (Object.keys(normalizedGroups).length > 0) {
            result[gameId] = normalizedGroups;
        }
    }
    return result;
}
