export const HomeHero = () => {
    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden mb-12 group">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-slate-900">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            {/* Pattern Overlay - Abstract Game Tokens */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="hexagons" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M25 0 L50 14.4 L50 43.3 L25 57.7 L0 43.3 L0 14.4 Z" fill="none" stroke="white" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexagons)" stroke="none" />
            </svg>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-12 z-10">
                <div className="max-w-2xl">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase mb-6 backdrop-blur-md">
                        平台测试版
                    </span>
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
                        体验 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            数字桌游
                        </span>
                    </h1>
                    <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                        以现代美学重新演绎经典桌游。挑战AI，邀请好友，精通策略。
                    </p>

                    <button className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg shadow-white/10 flex items-center gap-2 w-max group-hover:scale-105 active:scale-95 duration-200">
                        探索游戏
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>

            {/* Decorative Floating Elements (3D CSS) */}
            <div className="absolute right-20 top-1/2 -translate-y-1/2 w-64 h-64 hidden md:block perspective-1000">
                <div className="w-full h-full relative animate-float-slow transform-style-3d rotate-y-[-20deg] rotate-x-[10deg]">
                    {/* Abstract Card Stack or Dice representation */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-2xl opacity-80 backdrop-blur-sm border border-white/10 transform translate-z-10 rotate-[-6deg]" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 transform translate-z-20 rotate-[6deg] flex items-center justify-center">
                        <span className="text-6xl">🎲</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
