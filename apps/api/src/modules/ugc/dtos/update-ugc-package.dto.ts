import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUgcPackageDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    version?: string;

    @IsOptional()
    @IsString()
    gameId?: string;

    @IsOptional()
    @IsString()
    coverAssetId?: string;

    @IsOptional()
    @IsObject()
    manifest?: Record<string, unknown>;
}
