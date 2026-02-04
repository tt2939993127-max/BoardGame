import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadUgcAssetDto {
    @IsOptional()
    @IsString()
    assetId?: string;

    @IsOptional()
    @IsString()
    @IsIn(['image', 'audio'])
    type?: 'image' | 'audio';
}
