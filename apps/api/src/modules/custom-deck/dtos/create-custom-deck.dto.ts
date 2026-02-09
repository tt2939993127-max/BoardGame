import { Type } from 'class-transformer';
import {
    IsArray,
    IsNotEmpty,
    IsString,
    ValidateNested,
} from 'class-validator';

import { CardEntryDto } from './card-entry.dto';

/** 创建自定义牌组请求 DTO */
export class CreateCustomDeckDto {
    /** 牌组名称 */
    @IsString()
    @IsNotEmpty()
    name!: string;

    /** 召唤师卡牌 ID */
    @IsString()
    @IsNotEmpty()
    summonerId!: string;

    /** 召唤师所属阵营 */
    @IsString()
    @IsNotEmpty()
    summonerFaction!: string;

    /** 手动选择的卡牌列表 */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CardEntryDto)
    cards!: CardEntryDto[];
}
