import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Sponsor, type SponsorDocument } from './sponsor.schema';

export type SponsorResponse = {
    id: string;
    name: string;
    amount: number;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
};

type SponsorLean = Sponsor & { _id: { toString: () => string }; createdAt: Date; updatedAt: Date };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class SponsorService {
    constructor(
        @InjectModel(Sponsor.name) private sponsorModel: Model<SponsorDocument>
    ) {}

    async create(payload: {
        name: string;
        amount: number;
        isPinned?: boolean;
    }): Promise<SponsorResponse> {
        const sponsor = await this.sponsorModel.create({
            name: payload.name,
            amount: payload.amount,
            isPinned: payload.isPinned ?? false,
        });
        return this.toResponse(sponsor);
    }

    async update(id: string, payload: Partial<{ name: string; amount: number; isPinned: boolean; }>) {
        const sponsor = await this.sponsorModel.findByIdAndUpdate(id, payload, { new: true });
        return sponsor ? this.toResponse(sponsor) : null;
    }

    async remove(id: string) {
        const result = await this.sponsorModel.deleteOne({ _id: id });
        return (result.deletedCount ?? 0) > 0;
    }

    async listAdmin(query: { page?: number; limit?: number; search?: string }) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
        const filter: Record<string, unknown> = {};
        if (query.search) {
            const safeSearch = escapeRegex(query.search.trim());
            if (safeSearch) {
                const regex = new RegExp(safeSearch, 'i');
                filter.name = regex;
            }
        }

        const [items, total] = await Promise.all([
            this.sponsorModel
                .find(filter)
                .sort({ isPinned: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean<SponsorLean[]>(),
            this.sponsorModel.countDocuments(filter),
        ]);

        return {
            items: items.map(item => this.toResponse(item)),
            total,
            page,
            limit,
        };
    }

    async listPublic(page?: number, limit?: number) {
        const resolvedPage = Math.max(1, page ?? 1);
        const resolvedLimit = Math.min(Math.max(1, limit ?? 50), 200);
        const skip = (resolvedPage - 1) * resolvedLimit;
        const items = await this.sponsorModel
            .find({})
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(resolvedLimit + 1)
            .lean<SponsorLean[]>();
        const hasMore = items.length > resolvedLimit;
        const slice = hasMore ? items.slice(0, resolvedLimit) : items;
        return {
            items: slice.map(item => this.toResponse(item)),
            page: resolvedPage,
            limit: resolvedLimit,
            hasMore,
        };
    }

    private toResponse(doc: SponsorDocument | SponsorLean): SponsorResponse {
        const data = 'toObject' in doc ? doc.toObject() : doc;
        return {
            id: data._id.toString(),
            name: data.name,
            amount: data.amount,
            isPinned: data.isPinned,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }
}
