import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

import { CardEntryDto } from './card-entry.dto';

/** 更新自定义牌组请求 DTO（所有字段可选） */
export class UpdateCustomDeckDto {
    /** 牌组名称 */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    /** 召唤师卡牌 ID */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    summonerId?: string;

    /** 召唤师所属阵营 */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    summonerFaction?: string;

    /** 手动选择的卡牌列表 */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CardEntryDto)
    cards?: CardEntryDto[];

    /** 自由组卡模式 */
    @IsOptional()
    @IsBoolean()
    freeMode?: boolean;
}
