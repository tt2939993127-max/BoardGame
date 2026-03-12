import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { normalizeGameChangelogGameId } from './game-changelog-game-id';

const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeGameId = ({ value }: { value: unknown }) => (
    typeof value === 'string' ? normalizeGameChangelogGameId(value) : value
);

export class CreateGameChangelogDto {
    @Transform(normalizeGameId)
    @IsString()
    gameId!: string;

    @Transform(trimString)
    @IsString()
    title!: string;

    @IsOptional()
    @Transform(trimString)
    @IsString()
    versionLabel?: string;

    @Transform(trimString)
    @IsString()
    content!: string;

    @IsOptional()
    @IsBoolean()
    published?: boolean;

    @IsOptional()
    @IsBoolean()
    pinned?: boolean;
}

export class UpdateGameChangelogDto {
    @IsOptional()
    @Transform(normalizeGameId)
    @IsString()
    gameId?: string;

    @IsOptional()
    @Transform(trimString)
    @IsString()
    title?: string;

    @IsOptional()
    @Transform(trimString)
    @IsString()
    versionLabel?: string;

    @IsOptional()
    @Transform(trimString)
    @IsString()
    content?: string;

    @IsOptional()
    @IsBoolean()
    published?: boolean;

    @IsOptional()
    @IsBoolean()
    pinned?: boolean;
}
