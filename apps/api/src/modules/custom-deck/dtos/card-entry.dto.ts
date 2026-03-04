import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** 单张卡牌条目 DTO（嵌套校验用） */
export class CardEntryDto {
    /** 卡牌基础 ID（如 'necro-undead-warrior'） */
    @IsString()
    @IsNotEmpty()
    cardId!: string;

    /** 卡牌所属阵营 */
    @IsString()
    @IsNotEmpty()
    faction!: string;

    /** 数量（至少为 1） */
    @IsInt()
    @Min(1)
    count!: number;
}
