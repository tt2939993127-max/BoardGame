import { IsIn, IsString } from 'class-validator';

export class SubmitRuleSourceDecisionDto {
    @IsString()
    decisionId!: string;

    @IsString()
    @IsIn(['wiki', 'pdf', 'document', 'other-url'])
    optionId!: 'wiki' | 'pdf' | 'document' | 'other-url';
}
