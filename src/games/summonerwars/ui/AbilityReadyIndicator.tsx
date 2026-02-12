/**
 * 技能准备就绪指示器
 * 在可以使用技能的单位卡牌顶部显示能量波纹特效
 */

import React from 'react';
import { motion } from 'framer-motion';

export const AbilityReadyIndicator: React.FC = () => {
  return (
    <div className="absolute -top-[8%] left-0 right-0 flex justify-center pointer-events-none z-10">
      {/* 三层波纹，依次延迟 */}
      {[0, 0.3, 0.6].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute w-[120%] h-[20%] rounded-full bg-gradient-to-t from-cyan-400/60 via-cyan-300/40 to-transparent"
          initial={{ opacity: 0, scale: 0.8, y: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.8, 1.4, 1.6],
            y: [0, -15, -25],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
        />
      ))}
      
      {/* 中心光点 */}
      <motion.div
        className="absolute w-[30%] h-[30%] rounded-full bg-cyan-300/80 blur-sm"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};
