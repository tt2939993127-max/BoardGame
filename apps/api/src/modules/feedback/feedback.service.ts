import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument, FeedbackStatus } from './feedback.schema';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    ) { }

    async create(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
        return this.feedbackModel.create({
            ...dto,
            userId,
        });
    }

    async findAll(query: QueryFeedbackDto) {
        const { page = 1, limit = 20, status } = query;
        const filter: any = {};
        if (status) filter.status = status;

        const total = await this.feedbackModel.countDocuments(filter);
        const items = await this.feedbackModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('userId', 'username avatar email')
            .exec();

        return { items, total, page, limit };
    }

    async updateStatus(id: string, status: FeedbackStatus): Promise<Feedback | null> {
        return this.feedbackModel.findByIdAndUpdate(id, { status }, { new: true });
    }
}
