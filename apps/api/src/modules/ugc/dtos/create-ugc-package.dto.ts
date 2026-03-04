import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateUgcPackageDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

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
    @IsString()
    packageId?: string;

    @IsOptional()
    @IsObject()
    manifest?: Record<string, unknown>;
}
