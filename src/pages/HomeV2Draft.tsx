import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrls } from '../core/AssetLoader';
import { HomeSceneRenderer, type HomeV2IntroStage } from '../ugc/runtime';
import clsx from 'clsx';
import { LobbyDirectory } from '../components/home-v2/LobbyDirectory';
import { GameDetails } from '../components/home-v2/GameDetails';
import { type Category } from '../components/layout/CategoryPills';
import { getGameById } from '../config/games.config';
import { getHomeV2TabStyle, HOME_V2_TAB_ORDER, type HomeV2TabId } from '../components/home-v2/sceneLayout';

const HOME_V2_BOOK_DESK = getOptimizedImageUrls('common/images/home-v2/book-desk/1.png').webp;

const HomeV2Tabs = ({
    activeTab,
    onTabSelect,
    visible,
}: {
    activeTab: HomeV2TabId;
    onTabSelect: (tabId: HomeV2TabId) => void;
    visible: boolean;
}) => {
    const { t } = useTranslation(['lobby', 'common']);

    if (!visible) return null;

    return (
        <>
            {HOME_V2_TAB_ORDER.map((tabId) => {
                const tab = { id: tabId };
                const isActive = activeTab === tab.id;
                
                // Get the translation key for the tab
                let label = '';
                switch (tab.id) {
                    case 'lobby': label = t('lobby:tabs.lobby'); break;
                    case 'rooms': label = t('lobby:rooms.title'); break;
                    case 'leaderboard': label = t('lobby:tabs.leaderboard'); break;
                    case 'changelog': label = t('lobby:tabs.changelog'); break;
                    case 'about': label = t('lobby:about.title', '关于'); break;
                }

                return (
                    <button
                        key={tab.id}
                        className={clsx(
                            "absolute group flex items-center justify-center pointer-events-auto cursor-pointer transition-all duration-200",
                            isActive ? "opacity-100 translate-x-[-2px]" : "opacity-80 hover:opacity-100 hover:translate-x-[-1px]"
                        )}
                        style={getHomeV2TabStyle(tab.id)}
                        onClick={() => onTabSelect(tab.id)}
                        aria-label={label}
                        data-testid={`home-v2-tab-${tab.id}`}
                    >
                        {/* 竖排文字 (书签上的文字) */}
                        <div 
                            className={clsx(
                                "writing-vertical-rl text-[10px] md:text-xs font-bold tracking-widest",
                                isActive ? "text-[#4a3525]" : "text-[#7a6555] group-hover:text-[#5a4535]"
                            )}
                            style={{ 
                                textShadow: isActive ? '0 1px 2px rgba(255,255,255,0.8)' : 'none',
                                transform: 'rotate(180deg)' // 使文字方向符合右侧书签的阅读习惯
                            }}
                        >
                            {label}
                        </div>
                    </button>
                );
            })}
        </>
    );
};

export const HomeV2Draft = () => {
    const [searchParams] = useSearchParams();
    const [introStage, setIntroStage] = React.useState<HomeV2IntroStage>('open');
    const [activeTab, setActiveTab] = React.useState<HomeV2TabId>('lobby');
    const [activeCategory, setActiveCategory] = React.useState<Category>('All');
    const debugRegions = searchParams.get('homeV2Debug') === '1';
    
    // 用于处理游戏详情页面状态
    const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
    const selectedGame = selectedGameId ? getGameById(selectedGameId) : null;
    // 切换 Tab 时重置选中的游戏
    const handleTabSelect = (tabId: HomeV2TabId) => {
        setActiveTab(tabId);
        if (tabId !== 'lobby') {
            setSelectedGameId(null);
        }
    };

    return (
        <main
            data-testid="home-v2-draft-root"
            data-bg-friendly-screen="true"
            className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#1f130d_0%,_#120b07_100%)]"
        >
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
                <img
                    src={HOME_V2_BOOK_DESK}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,216,160,0.16)_0%,_rgba(0,0,0,0)_40%),linear-gradient(180deg,_rgba(20,11,7,0.2)_0%,_rgba(9,5,4,0.46)_100%)]" />
                <div
                    className="relative w-full"
                    style={{ height: 'min(calc(100vh - 0.25rem), 430px)' }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            data-testid="home-v2-shell-ready"
                            className="relative h-full aspect-[896/720] overflow-visible"
                        >
                            <HomeSceneRenderer
                                testId="home-v2-book-stage"
                                debugRegions={debugRegions}
                                introStage={introStage}
                                onIntroOpenComplete={() => setIntroStage('tabs')}
                                onIntroTabsComplete={() => setIntroStage('ready')}
                            >
                                <HomeV2Tabs 
                                    activeTab={activeTab} 
                                    onTabSelect={handleTabSelect}
                                    visible={introStage === 'ready'} 
                                />
                                {introStage === 'ready' && activeTab === 'lobby' && (
                                    selectedGameId ? (
                                        <GameDetails
                                            game={selectedGame}
                                            onBack={() => setSelectedGameId(null)}
                                        />
                                    ) : (
                                        <LobbyDirectory 
                                            activeCategory={activeCategory} 
                                            setActiveCategory={setActiveCategory} 
                                            onGameClick={setSelectedGameId}
                                        />
                                    )
                                )}
                            </HomeSceneRenderer>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};
