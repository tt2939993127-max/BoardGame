import React from 'react';
import {
    DICE_ATLAS,
    getDiceSpritePosition,
    getDiceSpriteUrls,
} from './assets';

export interface Dice2DProps {
    value: number;
    isRolling: boolean;
    size?: string;
    locale?: string;
    characterId?: string;
    definitionId?: string;
}

/** 直接裁切英雄骰图，不创建 WebGL 或 Canvas 渲染器。 */
export const Dice2D: React.FC<Dice2DProps> = ({
    value,
    isRolling,
    size = '4vw',
    locale,
    characterId = 'monk',
    definitionId,
}) => {
    const spriteUrls = React.useMemo(
        () => getDiceSpriteUrls(definitionId, characterId, locale),
        [characterId, definitionId, locale],
    );
    const [spriteIndex, setSpriteIndex] = React.useState(0);
    const [isSpriteReady, setIsSpriteReady] = React.useState(false);

    React.useEffect(() => {
        setSpriteIndex(0);
        setIsSpriteReady(false);
    }, [spriteUrls]);

    const spriteUrl = spriteUrls[spriteIndex];
    const { xPos, yPos } = getDiceSpritePosition(value);
    const atlasX = (xPos / 100) * (DICE_ATLAS.cols - 1);
    const atlasY = (yPos / 100) * (DICE_ATLAS.rows - 1);
    const hasFallbackCandidate = spriteIndex < spriteUrls.length - 1;

    return (
        <div
            className={`relative overflow-hidden rounded-[0.45vw] bg-[#f1e7d6] shadow-[0_0.16vw_0_rgba(0,0,0,0.55)] ${isRolling ? 'animate-pulse' : ''}`}
            data-testid="dice-2d"
            data-face-value={value}
            data-sprite-ready={isSpriteReady ? 'true' : 'false'}
            data-sprite-url={spriteUrl ?? ''}
            style={{ width: size, height: size }}
        >
            {spriteUrl && (
                <img
                    key={spriteUrl}
                    src={spriteUrl}
                    alt=""
                    aria-hidden="true"
                    className={`absolute max-w-none transition-opacity duration-100 ${isSpriteReady ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        width: `${DICE_ATLAS.cols * 100}%`,
                        height: `${DICE_ATLAS.rows * 100}%`,
                        left: `-${atlasX * 100}%`,
                        top: `-${atlasY * 100}%`,
                    }}
                    onLoad={() => setIsSpriteReady(true)}
                    onError={() => {
                        if (hasFallbackCandidate) {
                            setSpriteIndex((index) => index + 1);
                            return;
                        }
                        setIsSpriteReady(false);
                    }}
                />
            )}
            {!isSpriteReady && (
                <span className="absolute inset-0 flex items-center justify-center text-[0.9em] font-black leading-none text-[#211911]">
                    {value}
                </span>
            )}
        </div>
    );
};

export default Dice2D;
