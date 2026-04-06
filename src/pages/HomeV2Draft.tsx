import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrls } from '../core/AssetLoader';
import { HomeSceneRenderer, type HomeV2SceneState } from '../ugc/runtime';
import { getAllGames, getGameById } from '../config/games.config';
import { LobbyDirectory } from '../components/home-v2/LobbyDirectory';
import { GameDetails } from '../components/home-v2/GameDetails';
import { useAuth } from '../contexts/AuthContext';
import compiledHomeV2Scene from '../ui-scenes/home-v2/home-v2.compiled.json';
import assetRegistryYamlRaw from '../ui-scenes/home-v2/asset-registry.yaml?raw';
import homeV2SceneYamlRaw from '../ui-scenes/home-v2/home-v2.ui.yaml?raw';
import homeV2SkinYamlRaw from '../ui-scenes/home-v2/home-v2.skin.yaml?raw';
import {
    CompiledSceneRenderer,
    InspectorPanel,
    InPageAuthoringOverlay,
    UISceneCompileError,
    createAuthoringDocument,
    saveUiSceneAuthoring,
    serializeSceneYaml,
    updateSceneZoneRect,
    YamlSyncPanel,
    type UISceneAuthoringDocument,
    type UISceneCompiledArtifact,
    type UISceneRect,
} from '../ui-scene';

const HOME_V2_BOOK_DESK = getOptimizedImageUrls('/assets/common/images/home-v2/book-desk/1.png').webp;
const HOME_V2_COMPILED_SCENE = compiledHomeV2Scene as UISceneCompiledArtifact;
const HOME_V2_SCENE_ID = 'home-v2';
type HomeV2TabId = 'lobby' | 'rooms' | 'leaderboard' | 'changelog' | 'about';

function HomeV2TabPlaceholder({ title, description }: { title: string; description: string }) {
    return (
        <div className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-[12%] text-center text-[#6a4a33]">
            <div className="mb-[4%] text-[clamp(18px,1.8vw,24px)] font-bold tracking-[0.08em] text-[#5b3822]">
                {title}
            </div>
            <div className="max-w-[82%] text-[clamp(11px,0.95vw,14px)] leading-[1.7] text-[#7a5d46]">
                {description}
            </div>
        </div>
    );
}

function formatAuthoringError(error: unknown): string {
    if (error instanceof UISceneCompileError) {
        const [firstIssue] = error.issues;
        if (!firstIssue) {
            return error.message;
        }

        return `${firstIssue.file} · ${firstIssue.path} · ${firstIssue.message}`;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'YAML 编译失败';
}

function clampZoneRect(scene: UISceneCompiledArtifact, rect: UISceneRect): UISceneRect {
    const width = Math.max(24, rect.width);
    const height = Math.max(24, rect.height);
    const x = Math.min(Math.max(0, rect.x), scene.artboard.width - width);
    const y = Math.min(Math.max(0, rect.y), scene.artboard.height - height);

    return {
        x,
        y,
        width: Math.min(width, scene.artboard.width - x),
        height: Math.min(height, scene.artboard.height - y),
    };
}

export const HomeV2Draft = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [sceneState, setSceneState] = React.useState<HomeV2SceneState>('open');
    const [activeTab, setActiveTab] = React.useState<HomeV2TabId>('lobby');
    const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
    const pendingGameIdRef = React.useRef<string | null>(null);
    const debugRegions = searchParams.get('homeV2Debug') === '1';
    const wantsAuthorMode = searchParams.get('author') === '1';
    const isAuthorAllowed = import.meta.env.DEV || user?.role === 'admin' || user?.role === 'developer';
    const isAuthorMode = wantsAuthorMode && isAuthorAllowed;
    const [compiledContentScene, setCompiledContentScene] = React.useState<UISceneCompiledArtifact>(HOME_V2_COMPILED_SCENE);
    const [authoringDocument, setAuthoringDocument] = React.useState<UISceneAuthoringDocument | null>(null);
    const [sceneYamlDraft, setSceneYamlDraft] = React.useState(homeV2SceneYamlRaw);
    const [authoringError, setAuthoringError] = React.useState<string | null>(null);
    const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>('left_page_overview');
    const [overlayVisible, setOverlayVisible] = React.useState(true);
    const [yamlPanelOpen, setYamlPanelOpen] = React.useState(wantsAuthorMode);
    const [inspectorOpen, setInspectorOpen] = React.useState(wantsAuthorMode);
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

    const featuredGames = React.useMemo(
        () => getAllGames().filter((game) => game.enabled && game.type === 'game').slice(0, 4),
        [],
    );
    const selectedGame = selectedGameId ? getGameById(selectedGameId) ?? null : null;
    const isPageFlipping = sceneState === 'flippingToDetail' || sceneState === 'flippingToOverview';

    const handleGameOpen = React.useCallback((gameId: string) => {
        if (sceneState !== 'overview' || isPageFlipping) {
            return;
        }

        pendingGameIdRef.current = gameId;
        setSceneState('flippingToDetail');
    }, [isPageFlipping, sceneState]);

    const handleBackToOverview = React.useCallback(() => {
        if (sceneState !== 'detail' || isPageFlipping || !selectedGameId) {
            return;
        }

        pendingGameIdRef.current = null;
        setSceneState('flippingToOverview');
    }, [isPageFlipping, sceneState, selectedGameId]);

    const handleSceneEvent = React.useCallback((event: { eventId: string }) => {
        if (event.eventId === 'page.flip.to-detail.complete') {
            setSelectedGameId(pendingGameIdRef.current);
            setSceneState('detail');
            return;
        }

        if (event.eventId === 'page.flip.to-overview.complete') {
            setSelectedGameId(null);
            setSceneState('overview');
        }
    }, []);

    const handleTabChange = React.useCallback((tabId: HomeV2TabId) => {
        setActiveTab(tabId);
        if (sceneState === 'detail') {
            setSelectedGameId(null);
            setSceneState('overview');
        }
    }, [sceneState]);

    const buildAuthoringDocument = React.useCallback((sceneYaml: string) => createAuthoringDocument({
        sceneId: HOME_V2_SCENE_ID,
        assetRegistryFile: 'src/ui-scenes/home-v2/asset-registry.yaml',
        assetRegistryYaml: assetRegistryYamlRaw,
        skinFile: 'src/ui-scenes/home-v2/home-v2.skin.yaml',
        skinYaml: homeV2SkinYamlRaw,
        sceneFile: 'src/ui-scenes/home-v2/home-v2.ui.yaml',
        sceneYaml,
    }), []);

    const applySceneYamlDraft = React.useCallback((nextSceneYaml: string) => {
        setSceneYamlDraft(nextSceneYaml);
        setSaveMessage(null);
        try {
            const nextDocument = buildAuthoringDocument(nextSceneYaml);
            setAuthoringDocument(nextDocument);
            setCompiledContentScene(nextDocument.compiled);
            setAuthoringError(null);
        } catch (error) {
            setAuthoringError(formatAuthoringError(error));
        }
    }, [buildAuthoringDocument]);

    React.useEffect(() => {
        if (!isAuthorMode) {
            setCompiledContentScene(HOME_V2_COMPILED_SCENE);
            setAuthoringDocument(null);
            setAuthoringError(null);
            return;
        }

        applySceneYamlDraft(homeV2SceneYamlRaw);
    }, [applySceneYamlDraft, isAuthorMode]);

    const handleZoneChange = React.useCallback((zoneId: string, rect: UISceneRect) => {
        if (!authoringDocument) {
            return;
        }

        const nextSceneDocument = updateSceneZoneRect(authoringDocument.sceneDocument, zoneId, () => clampZoneRect(compiledContentScene, rect));
        applySceneYamlDraft(serializeSceneYaml(nextSceneDocument));
    }, [applySceneYamlDraft, authoringDocument, compiledContentScene]);

    const handleSave = React.useCallback(async () => {
        if (!isAuthorMode || authoringError) {
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);
        try {
            await saveUiSceneAuthoring(HOME_V2_SCENE_ID, {
                sceneId: HOME_V2_SCENE_ID,
                assetRegistryYaml: assetRegistryYamlRaw,
                skinYaml: homeV2SkinYamlRaw,
                sceneYaml: sceneYamlDraft,
            });
            setSaveMessage('已写回 src/ui-scenes/home-v2/home-v2.ui.yaml');
        } catch (error) {
            setAuthoringError(formatAuthoringError(error));
        } finally {
            setIsSaving(false);
        }
    }, [authoringError, isAuthorMode, sceneYamlDraft]);

    const sceneContext = React.useMemo(() => ({
        activeTab,
        tabLabels: {
            lobby: '大厅',
            rooms: '房间',
            leaderboard: '榜单',
            changelog: '更新',
            about: '关于',
        },
    }), [activeTab]);

    const actionHandlers = React.useMemo<Record<string, () => void>>(() => ({
        openLobbyTab: () => handleTabChange('lobby'),
        openRoomsTab: () => handleTabChange('rooms'),
        openLeaderboardTab: () => handleTabChange('leaderboard'),
        openChangelogTab: () => handleTabChange('changelog'),
        openAboutTab: () => handleTabChange('about'),
    }), [handleTabChange]);

    const sceneSlots = React.useMemo(() => {
        const slots: Record<string, React.ReactNode> = {
            overview_left_page: activeTab === 'lobby'
                ? (
                    <LobbyDirectory.Overview
                        games={featuredGames}
                        onGameClick={handleGameOpen}
                    />
                )
                : activeTab === 'rooms'
                    ? (
                        <HomeV2TabPlaceholder
                            title="房间目录"
                            description="这里会接入按页签组织的房间列表和房间筛选。当前先保留书页容器与 authoring 对位能力。"
                        />
                    )
                    : activeTab === 'leaderboard'
                        ? (
                            <HomeV2TabPlaceholder
                                title="排行榜"
                                description="这里会接入胜场排行、近期战绩和玩家概览。当前先打通真实页面上的 scene authoring 链路。"
                            />
                        )
                        : activeTab === 'changelog'
                            ? (
                                <HomeV2TabPlaceholder
                                    title="更新日志"
                                    description="这里会接入按日期编排的版本日志与置顶公告。当前先保留书页真实版式和 YAML 真源。"
                                />
                            )
                            : (
                                <HomeV2TabPlaceholder
                                    title="关于"
                                    description="这里会接入首页 V2 的项目说明、作者信息和入口说明。当前占位用于验证 tab actionId 宿主映射。"
                                />
                            ),
        };

        if (sceneState === 'detail') {
            slots.detail_left_page = (
                <GameDetails.Left
                    game={selectedGame}
                    onBack={handleBackToOverview}
                />
            );
            slots.detail_right_page = <GameDetails.Right game={selectedGame} />;
        }

        return slots;
    }, [activeTab, featuredGames, handleBackToOverview, handleGameOpen, sceneState, selectedGame]);

    return (
        <main
            data-testid="home-v2-draft-root"
            data-bg-friendly-screen="true"
            className="h-screen overflow-hidden bg-[linear-gradient(180deg,_#1f130d_0%,_#120b07_100%)]"
        >
            <div className="relative flex h-full items-center justify-center overflow-hidden">
                <img
                    src={HOME_V2_BOOK_DESK}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,216,160,0.16)_0%,_rgba(0,0,0,0)_40%),linear-gradient(180deg,_rgba(20,11,7,0.2)_0%,_rgba(9,5,4,0.46)_100%)]" />
                <div className="relative flex h-full w-full items-center justify-center">
                    <div
                        data-testid="home-v2-shell-ready"
                        className="relative h-[100%] max-w-full aspect-[896/720] overflow-visible"
                    >
                        <HomeSceneRenderer
                            testId="home-v2-book-stage"
                            debugRegions={debugRegions}
                            sceneState={sceneState}
                            sceneContext={sceneContext}
                            onIntroOpenComplete={() => setSceneState('tabs')}
                            onIntroTabsComplete={() => setSceneState('overview')}
                            onSceneEvent={handleSceneEvent}
                        >
                            <CompiledSceneRenderer
                                scene={compiledContentScene}
                                activeState={sceneState}
                                slots={sceneSlots}
                                actionHandlers={actionHandlers}
                            >
                                {isAuthorMode && authoringDocument && overlayVisible ? (
                                    <InPageAuthoringOverlay
                                        scene={compiledContentScene}
                                        visible={sceneState === 'overview' || sceneState === 'detail'}
                                        selectedZoneId={selectedZoneId}
                                        onSelectZone={setSelectedZoneId}
                                        onChangeZone={handleZoneChange}
                                    />
                                ) : null}
                            </CompiledSceneRenderer>
                        </HomeSceneRenderer>
                    </div>
                </div>
            </div>
            {isAuthorMode ? (
                <>
                    <InspectorPanel
                        open={inspectorOpen}
                        scene={compiledContentScene}
                        selectedZoneId={selectedZoneId}
                        onSelectZone={setSelectedZoneId}
                        onChangeZone={handleZoneChange}
                        onToggle={() => setInspectorOpen(false)}
                    />
                    <YamlSyncPanel
                        open={yamlPanelOpen}
                        yaml={sceneYamlDraft}
                        error={authoringError}
                        isSaving={isSaving}
                        saveMessage={saveMessage}
                        onChange={applySceneYamlDraft}
                        onSave={handleSave}
                        onToggle={() => setYamlPanelOpen(false)}
                    />
                    <div className="pointer-events-auto fixed bottom-5 right-5 z-[2200] flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setOverlayVisible((current) => !current)}
                            className="rounded-full bg-[#17100b]/92 px-4 py-2 text-[12px] font-semibold text-amber-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                        >
                            {overlayVisible ? '隐藏选区' : '显示选区'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setInspectorOpen((current) => !current)}
                            className="rounded-full bg-[#17100b]/92 px-4 py-2 text-[12px] font-semibold text-amber-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                        >
                            {inspectorOpen ? '收起 Inspector' : '打开 Inspector'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setYamlPanelOpen((current) => !current)}
                            className="rounded-full bg-amber-200 px-4 py-2 text-[12px] font-semibold text-[#3f2a17] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                        >
                            {yamlPanelOpen ? '收起 YAML' : '打开 YAML'}
                        </button>
                    </div>
                </>
            ) : null}
        </main>
    );
};
