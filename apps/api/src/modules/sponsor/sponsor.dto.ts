import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSponsorDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount!: number;

    @Type(() => Boolean)
    @IsBoolean()
    @IsOptional()
    isPinned?: boolean;
}

export class UpdateSponsorDto {
    @IsString()
    @IsOptional()
    name?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    amount?: number;

    @Type(() => Boolean)
    @IsBoolean()
    @IsOptional()
    isPinned?: boolean;
}

export class QuerySponsorDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number;

    @IsString()
    @IsOptional()
    search?: string;
}

export class QueryPublicSponsorDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number;
}
