import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FeedbackSeverity, FeedbackStatus, FeedbackType } from './feedback.schema';

export class CreateFeedbackDto {
    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsEnum(FeedbackType)
    @IsOptional()
    type?: FeedbackType;

    @IsEnum(FeedbackSeverity)
    @IsOptional()
    severity?: FeedbackSeverity;

    @IsString()
    @IsOptional()
    gameName?: string;

    @IsString()
    @IsOptional()
    contactInfo?: string;
}

export class UpdateFeedbackStatusDto {
    @IsEnum(FeedbackStatus)
    status!: FeedbackStatus;
}

export class QueryFeedbackDto {
    @IsOptional()
    page?: number;

    @IsOptional()
    limit?: number;

    @IsOptional()
    @IsEnum(FeedbackStatus)
    status?: FeedbackStatus;
}
