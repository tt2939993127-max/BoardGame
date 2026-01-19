export const NeonTicTacToeThumbnail = () => (
    <div className="w-full h-48 bg-slate-900 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(#00F3FF 1px, transparent 1px), linear-gradient(90deg, #00F3FF 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>

        {/* Glowing Center */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

        {/* Game Elements */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-2 opacity-80 transform rotate-12 scale-110">
                <div className="w-12 h-12 border-r-2 border-b-2 border-cyan-500/50 flex items-center justify-center text-4xl text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">X</div>
                <div className="w-12 h-12 border-b-2 border-cyan-500/50"></div>
                <div className="w-12 h-12 border-l-2 border-b-2 border-cyan-500/50 flex items-center justify-center text-4xl text-fuchsia-500 font-bold drop-shadow-[0_0_10px_rgba(188,19,254,0.8)]">O</div>

                <div className="w-12 h-12 border-r-2 border-cyan-500/50"></div>
                <div className="w-12 h-12 flex items-center justify-center text-4xl text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">X</div>
                <div className="w-12 h-12 border-l-2 border-cyan-500/50"></div>

                <div className="w-12 h-12 border-t-2 border-r-2 border-cyan-500/50"></div>
                <div className="w-12 h-12 border-t-2 border-cyan-500/50 flex items-center justify-center text-4xl text-fuchsia-500 font-bold drop-shadow-[0_0_10px_rgba(188,19,254,0.8)]">O</div>
                <div className="w-12 h-12 border-t-2 border-l-2 border-cyan-500/50"></div>
            </div>
        </div>

        {/* Overlay Badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
            协议_4.0
        </div>
    </div>
);
