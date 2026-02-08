import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { BulkFeedbackIdsDto, CreateFeedbackDto, FeedbackFilterDto, UpdateFeedbackStatusDto, QueryFeedbackDto } from './dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Roles } from '../admin/guards/roles.decorator';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('feedback')
export class FeedbackController {
    constructor(@Inject(FeedbackService) private readonly feedbackService: FeedbackService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Request() req: any, @Body() dto: CreateFeedbackDto) {
        return this.feedbackService.create(req.user.userId, dto);
    }
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('admin')
@Controller('admin/feedback')
export class FeedbackAdminController {
    constructor(@Inject(FeedbackService) private readonly feedbackService: FeedbackService) { }

    @Get()
    async findAll(@Query() query: QueryFeedbackDto) {
        return this.feedbackService.findAll(query);
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body() dto: UpdateFeedbackStatusDto) {
        const updated = await this.feedbackService.updateStatus(id, dto.status);
        if (!updated) {
            throw new NotFoundException('feedback not found');
        }
        return updated;
    }

    @Delete(':id')
    async deleteOne(@Param('id') id: string) {
        const ok = await this.feedbackService.deleteOne(id);
        return { ok };
    }

    @Post('bulk-delete')
    async bulkDelete(@Body() body: BulkFeedbackIdsDto) {
        return this.feedbackService.bulkDeleteByIds(body.ids || []);
    }

    @Post('bulk-delete-by-filter')
    async bulkDeleteByFilter(@Body() body: FeedbackFilterDto) {
        return this.feedbackService.bulkDeleteByFilter(body);
    }
}
