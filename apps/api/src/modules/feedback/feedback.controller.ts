import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UpdateFeedbackStatusDto, QueryFeedbackDto } from './dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Roles } from '../admin/guards/roles.decorator';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('feedback')
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Request() req: any, @Body() dto: CreateFeedbackDto) {
        return this.feedbackService.create(req.user.userId, dto);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Roles('admin')
    @Get('admin')
    async findAll(@Query() query: QueryFeedbackDto) {
        return this.feedbackService.findAll(query);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Roles('admin')
    @Patch('admin/:id/status')
    async updateStatus(@Param('id') id: string, @Body() dto: UpdateFeedbackStatusDto) {
        return this.feedbackService.updateStatus(id, dto.status);
    }
}
