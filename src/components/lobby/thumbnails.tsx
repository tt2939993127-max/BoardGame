// 响应式缩略图组件：自适应父容器大小
export const NeonTicTacToeThumbnail = () => (
    <div className="w-full h-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(#00F3FF 1px, transparent 1px), linear-gradient(90deg, #00F3FF 1px, transparent 1px)', backgroundSize: '20%' }}
        ></div>

        {/* Glowing Center */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

        {/* Game Elements - Scaled to fit container */}
        <div className="w-[80%] h-[80%] grid grid-cols-3 gap-1 opacity-90 transform rotate-6">
            <div className="border-r border-b border-cyan-500/50 flex items-center justify-center">
                <span className="text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(0,243,255,0.8)] text-[1.5rem] leading-none">X</span>
            </div>
            <div className="border-b border-cyan-500/50"></div>
            <div className="border-l border-b border-cyan-500/50 flex items-center justify-center">
                <span className="text-fuchsia-500 font-bold drop-shadow-[0_0_5px_rgba(188,19,254,0.8)] text-[1.5rem] leading-none">O</span>
            </div>

            <div className="border-r border-cyan-500/50"></div>
            <div className="flex items-center justify-center">
                <span className="text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(0,243,255,0.8)] text-[1.5rem] leading-none">X</span>
            </div>
            <div className="border-l border-cyan-500/50"></div>

            <div className="border-t border-r border-cyan-500/50"></div>
            <div className="border-t border-cyan-500/50 flex items-center justify-center">
                <span className="text-fuchsia-500 font-bold drop-shadow-[0_0_5px_rgba(188,19,254,0.8)] text-[1.5rem] leading-none">O</span>
            </div>
            <div className="border-t border-l border-cyan-500/50"></div>
        </div>

        {/* Overlay Badge - Smaller */}
        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur border border-white/10 px-1 py-0.5 rounded text-[8px] font-mono text-cyan-300">
            PRO
        </div>
    </div>
);

export const GameThumbnail = ({ gameId }: { gameId: string }) => {
    switch (gameId) {
        case 'tictactoe':
            return <NeonTicTacToeThumbnail />;
        default:
            return (
                <div className="w-full h-full bg-[#fcfbf9] flex items-center justify-center text-[#433422] font-bold text-4xl">
                    ?
                </div>
            );
    }
};
