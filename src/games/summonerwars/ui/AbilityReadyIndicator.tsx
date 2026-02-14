/**
 * 技能准备就绪指示器
 * 在可以使用技能的单位卡牌边框产生青色波纹扩散效果。
 * 波纹从卡牌边框向外 scale 扩散，叠在绿色可操作边框之上。
 */

import React from 'react';
import { motion } from 'framer-motion';

export const AbilityReadyIndicator: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* 三层向外扩散的边框波纹（用 scale 保持形状一致） */}
      {[0, 0.7, 1.4].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-lg border-2 border-cyan-400"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [1, 1.08, 1.15],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
        />
      ))}
      {/* 静态内发光（始终可见，提供持续的青色氛围） */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: 'inset 0 0 6px 2px rgba(34,211,238,0.2), 0 0 4px 1px rgba(34,211,238,0.15)',
        }}
      />
    </div>
  );
};
