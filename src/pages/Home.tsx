import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoryPills, type Category } from '../components/layout/CategoryPills';
import { GameCard } from '../components/lobby/GameCard';
import { GameDetailsModal } from '../components/lobby/GameDetailsModal';
import { HomeHero } from '../components/layout/HomeHero';
import { getGamesByCategory, getGameById } from '../config/games.config';

export const Home = () => {
    const [activeCategory, setActiveCategory] = useState<Category>('All');
    const [searchParams, setSearchParams] = useSearchParams();

    // URL-driven modal state
    const selectedGameId = searchParams.get('game');
    const selectedGame = useMemo(() => selectedGameId ? getGameById(selectedGameId) : null, [selectedGameId]);

    // 根据分类筛选游戏
    const filteredGames = useMemo(() => getGamesByCategory(activeCategory), [activeCategory]);

    const handleGameClick = (id: string) => {
        setSearchParams({ game: id });
    };

    const handleCloseModal = () => {
        setSearchParams({});
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            B
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                            BoardGame
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Placeholder for sorting or user profile */}
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* Hero Section */}
                <HomeHero />

                {/* Category Filter */}
                <div className="mb-8">
                    <CategoryPills
                        activeCategory={activeCategory}
                        onSelect={setActiveCategory}
                    />
                </div>

                {/* Section Heading */}
                <div className="mb-6 flex items-baseline justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">精选游戏</h2>
                    <span className="text-sm text-slate-500 font-medium cursor-pointer hover:text-blue-600">查看全部</span>
                </div>

                {/* Game Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredGames.map((game) => (
                        <GameCard
                            key={game.id}
                            title={game.title}
                            description={game.description}
                            category={game.category}
                            players={game.players}
                            thumbnail={game.thumbnail}
                            icon={game.icon}
                            onClick={() => handleGameClick(game.id)}
                        />
                    ))}

                    {/* Placeholder for future games */}
                    <div className="group bg-slate-100 rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                        <span className="text-4xl mb-2 opacity-50">+</span>
                        <span className="text-sm font-medium">更多游戏即将推出</span>
                    </div>
                </div>
            </main>

            {/* Game Details Modal */}
            {selectedGame && (
                <GameDetailsModal
                    isOpen={!!selectedGameId}
                    onClose={handleCloseModal}
                    gameId={selectedGame.id}
                    title={selectedGame.title}
                />
            )}
        </div>
    );
};
