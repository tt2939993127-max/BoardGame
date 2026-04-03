import { IsObject, IsOptional, IsString } from 'class-validator';

export class StartNewFactionRunDto {
    @IsString()
    factionName!: string;

    @IsOptional()
    @IsObject()
    nodeToggles?: Record<string, boolean>;
}
