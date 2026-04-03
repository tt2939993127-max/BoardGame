import { IsOptional, IsString } from 'class-validator';

export class RegisterWorkbenchWorktreeDto {
    @IsString()
    branchName!: string;

    @IsString()
    worktreePath!: string;

    @IsOptional()
    @IsString()
    label?: string;
}
