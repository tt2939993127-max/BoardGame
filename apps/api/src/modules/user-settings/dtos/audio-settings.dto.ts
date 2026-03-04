import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';

export type AudioSettingsPayload = {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
    bgmVolume: number;
    bgmSelections?: Record<string, Record<string, string>>;
};

export class UpdateAudioSettingsDto {
    @IsBoolean()
    muted!: boolean;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    masterVolume!: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    sfxVolume!: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    bgmVolume!: number;

    @IsOptional()
    @IsObject()
    bgmSelections?: Record<string, Record<string, string>>;
}
