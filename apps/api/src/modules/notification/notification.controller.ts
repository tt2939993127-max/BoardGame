import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { Roles } from '../admin/guards/roles.decorator';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto';

/** 管理端：通知 CRUD */
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('admin')
@Controller('admin/notifications')
export class NotificationAdminController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async findAll() {
        const list = await this.notificationService.findAll();
        return { notifications: list };
    }

    @Post()
    @HttpCode(201)
    async create(@Body() dto: CreateNotificationDto) {
        const notification = await this.notificationService.create(dto);
        return { notification };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
        const notification = await this.notificationService.update(id, dto);
        if (!notification) throw new NotFoundException('通知不存在');
        return { notification };
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        const ok = await this.notificationService.delete(id);
        if (!ok) throw new NotFoundException('通知不存在');
        return { deleted: true };
    }
}

/** 用户端：获取当前有效通知（无需登录） */
@Controller('notifications')
export class NotificationPublicController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async findActive() {
        const list = await this.notificationService.findActive();
        return { notifications: list };
    }
}
