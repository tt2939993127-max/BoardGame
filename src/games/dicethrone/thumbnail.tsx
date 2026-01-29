import { OptimizedImage } from '../../components/common/media/OptimizedImage';

// 指向 public/assets/dicethrone/thumbnails/compressed 下的资源
// 这里传入相对路径 "dicethrone/thumbnails/compressed/fengm"
// AssetLoader 会自动拼接为 /assets/dicethrone/thumbnails/compressed/fengm.avif
const COVER_PATH = 'dicethrone/thumbnails/compressed/fengm';

export default function Thumbnail() {
    return (
        <OptimizedImage
            src={COVER_PATH}
            alt="Dice Throne"
            className="w-full h-full object-cover"
        />
    );
}
