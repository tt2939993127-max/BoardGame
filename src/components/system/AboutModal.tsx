import { useRef } from 'react';
import { X, Github, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AboutModalProps {
    onClose: () => void;
}

export const AboutModal = ({ onClose }: AboutModalProps) => {
    const backdropRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (backdropRef.current === e.target) {
            onClose();
        }
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="relative h-32 bg-indigo-600 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

                    <div className="relative text-center text-white">
                        <h2 className="text-3xl font-bold tracking-tight">BoardGame</h2>
                        <p className="text-indigo-200 text-sm font-medium">平台</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        {/* 待办：请替换为实际仓库地址 */}
                        <a
                            href="https://github.com/your-repo/boardgame"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group"
                        >
                            <div className="p-3 bg-white rounded-lg shadow-sm text-zinc-800 group-hover:scale-110 transition-transform">
                                <Github size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">GitHub</h3>
                                <p className="text-xs text-zinc-500">查看源码并参与贡献</p>
                            </div>
                        </a>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                            <div className="p-3 bg-white rounded-lg shadow-sm text-[#0099FF] group-hover:scale-110 transition-transform">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">QQ群</h3>
                                <p className="text-xs text-zinc-500">加入社区：<span className="font-mono font-bold text-zinc-700">123456789</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-100">
                        <div className="text-center mb-4">
                            <h3 className="text-sm font-bold text-zinc-900 flex items-center justify-center gap-2">
                                <Heart size={16} className="text-rose-500 fill-rose-500" />
                                支持我们
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1">扫码赞助（微信 / 支付宝）</p>
                        </div>
                        <div className="flex justify-center gap-4">
                            {/* 二维码占位 */}
                            <div className="w-32 h-32 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400 border border-zinc-200">
                                微信
                            </div>
                            <div className="w-32 h-32 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400 border border-zinc-200">
                                支付宝
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-[10px] text-zinc-400">
                        版本 0.1.0-beta
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
