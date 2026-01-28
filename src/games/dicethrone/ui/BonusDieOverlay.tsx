/**
 * 额外骰子特写组件
 *
 * 无遮罩、无虚化背景，用于显示额外投掷的骰子结果。
 */

import React from 'react';

import type { DieFace } from '../types';
import SpotlightContainer from './SpotlightContainer';
import BonusDieSpotlightContent from './BonusDieSpotlightContent';

interface BonusDieOverlayProps {
    /** 骰子值 (1-6) */
    value: number | undefined;
    /** 骰面符号 */
    face?: DieFace;
    /** 效果描述 key */
    effectKey?: string;
    /** 效果描述参数 */
    effectParams?: Record<string, string | number>;
    /** 是否显示 */
    isVisible: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 语言 */
    locale?: string;
    /** 自动关闭延迟（毫秒），默认 2500 */
    autoCloseDelay?: number;
}

export const BonusDieOverlay: React.FC<BonusDieOverlayProps> = ({
    value,
    face,
    effectKey,
    effectParams,
    isVisible,
    onClose,
    locale,
    autoCloseDelay = 2500,
}) => {

    if (!isVisible || value === undefined) return null;

    return (
        <SpotlightContainer
            id={`bonus-die-${value}`}
            isVisible={isVisible}
            onClose={onClose}
            autoCloseDelay={autoCloseDelay}
            zIndex={9999}
        >
            <BonusDieSpotlightContent
                value={value}
                face={face}
                effectKey={effectKey}
                effectParams={effectParams}
                locale={locale}
                size="8vw"
            />
        </SpotlightContainer>
    );
};


export default BonusDieOverlay;
