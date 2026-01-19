import { motion } from 'framer-motion';

interface GameCardProps {
    title: string;
    description: string;
    category: string;
    players: string;
    onClick: () => void;
    icon?: React.ReactNode;
    thumbnail?: React.ReactNode;
}

export const GameCard = ({ title, description, category, players, onClick, icon, thumbnail }: GameCardProps) => {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            {/* Thumbnail Header */}
            {thumbnail ? (
                <div className="w-full relative">
                    {thumbnail}
                </div>
            ) : (
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className={`relative z-10 flex flex-col flex-1 ${thumbnail ? 'p-5' : 'p-6'}`}>
                <div className="flex justify-between items-start mb-4">
                    {!thumbnail && (
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform duration-300">
                            {icon || title[0]}
                        </div>
                    )}
                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-wide ml-auto">
                        {category}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {description}
                </p>

                <div className="flex items-center text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {players}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
