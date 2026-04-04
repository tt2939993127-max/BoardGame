import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { DebugProvider } from './contexts/DebugContext';
import { TestHarness } from './engine/testing';
import { TutorialProvider } from './contexts/TutorialContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocialProvider } from './contexts/SocialContext';
import { CursorPreferenceProvider } from './core/cursor/CursorPreferenceContext';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { ModalStackProvider } from './contexts/ModalStackContext';
import { ToastProvider } from './contexts/ToastContext';
import { EngineNotificationListener } from './components/system/EngineNotificationListener';
import { SocketCompatibilityToastListener } from './components/system/SocketCompatibilityToastListener';
import { ViewportDebugProbe } from './components/system/ViewportDebugProbe';
import { Toaster } from 'react-hot-toast';
import { GlobalErrorBoundary } from './components/system/GlobalErrorBoundary';
import { BrowserCompatibilityGate } from './components/system/BrowserCompatibilityGate';
import { AndroidLiveUpdateManager } from './components/system/AndroidLiveUpdateManager';
import { GamePageRescueGate } from './components/system/GamePageRescueGate';
import { InteractionGuardProvider } from './components/game/framework/InteractionGuard';
import AdminGuard from './components/auth/AdminGuard';
import { MobileOrientationGuard } from './components/common/MobileOrientationGuard';
import { installGlobalErrorContextCapture } from './lib/feedback/errorContext';
import {
  PLAY_ROUTE_LOADING_TIMEOUT_MS,
  resolvePlayRouteFallbackLobbyPath,
  shouldShowPlayRouteLoadingPrompt,
} from './lib/gameRouteFallback';

import { NotFound } from './pages/NotFound';
import { MaintenancePage } from './pages/Maintenance';

const isAndroidShellBuild = import.meta.env.MODE === 'android';

// 页面级懒加载：首页不需要加载 MatchRoom 的引擎/传输层/教程系统代码
const Home = React.lazy(() => import('./pages/HomeEntry').then(m => ({ default: m.HomeEntry })));
const MatchRoom = React.lazy(() => import('./pages/MatchRoomWithAudio'));
const LocalMatchRoom = React.lazy(() => import('./pages/LocalMatchRoomWithAudio'));
const TestMatchRoom = React.lazy(() => import('./pages/TestMatchRoomWithAudio'));
// 旧的测试路由已废弃，使用新的 TestHarness 框架
const LazyGlobalHUD = React.lazy(() => import('./components/system/GlobalHUD').then(m => ({ default: m.GlobalHUD })));
const LazyModalStackRoot = React.lazy(() => import('./components/system/ModalStackRoot').then(m => ({ default: m.ModalStackRoot })));
const LazyToastViewport = React.lazy(() => import('./components/system/ToastViewport').then(m => ({ default: m.ToastViewport })));

const queryClient = new QueryClient();

// 初始化测试工具（仅在测试环境生效）
TestHarness.init();

/**
 * 教程路由专用包装组件。
 * 与在线对局使用不同的组件类型，强制 React 在路由切换时完全卸载/重建 MatchRoom，
 * 防止从在线对局导航到教程时组件实例复用导致 state/ref 泄漏（教程卡在"初始化中"）。
 */
const TutorialMatchRoom = React.lazy(() => import('./pages/TutorialMatchRoomWithAudio'));

const DevToolsSlicer = !isAndroidShellBuild ? React.lazy(() => import('./pages/devtools/AssetSlicer')) : null;
const DevToolsFxPreview = !isAndroidShellBuild ? React.lazy(() => import('./pages/devtools/EffectPreview')) : null;
const DevToolsAudioBrowser = !isAndroidShellBuild ? React.lazy(() => import('./pages/devtools/AudioBrowser')) : null;
const DevToolsArchView = !isAndroidShellBuild ? React.lazy(() => import('./pages/devtools/ArchitectureView')) : null;
const UnifiedBuilder = !isAndroidShellBuild ? React.lazy(() => import('./ugc/builder/pages/UnifiedBuilderWithAudio')) : null;
const UGCRuntimeViewPage = !isAndroidShellBuild ? React.lazy(() => import('./ugc/runtime/RuntimeViewPage')) : null;
const UGCSandbox = !isAndroidShellBuild ? React.lazy(() => import('./ugc/builder/pages/UGCSandbox').then(m => ({ default: m.UGCSandbox }))) : null;
const AdminLayout = React.lazy(() => import('./pages/admin/components/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/index'));
const UsersPage = React.lazy(() => import('./pages/admin/Users'));
const UserDetailPage = React.lazy(() => import('./pages/admin/UserDetail'));
const GameChangelogsPage = React.lazy(() => import('./pages/admin/GameChangelogs'));
const MatchesPage = React.lazy(() => import('./pages/admin/Matches'));
const RoomsPage = React.lazy(() => import('./pages/admin/Rooms'));
const UgcPackagesPage = React.lazy(() => import('./pages/admin/UgcPackages'));
const FeedbackPage = React.lazy(() => import('./pages/admin/Feedback'));
const SystemHealthPage = React.lazy(() => import('./pages/admin/SystemHealth'));
const SponsorsPage = React.lazy(() => import('./pages/admin/Sponsors'));
const NotificationsPage = React.lazy(() => import('./pages/admin/Notifications'));
const SmashUp4PLayoutTest = !isAndroidShellBuild ? React.lazy(() => import('./pages/SmashUp4PLayoutTest')) : null;
const DevMobileEvidenceCaptureAgent = import.meta.env.DEV
  ? React.lazy(() =>
      import('./components/system/MobileEvidenceCaptureAgent').then(m => ({ default: m.MobileEvidenceCaptureAgent })),
    )
  : null;

const RouteLoadingFallback = ({ title }: { title?: string }) => {
  const { t } = useTranslation('lobby');
  const location = useLocation();
  const navigate = useNavigate();
  const [routeLoadingState, setRouteLoadingState] = useState(() => ({
    pathname: location.pathname,
    elapsedMs: 0,
  }));

  useEffect(() => {
    const pathname = location.pathname;
    const enteredAt = Date.now();
    const intervalId = window.setInterval(() => {
      setRouteLoadingState({
        pathname,
        elapsedMs: Date.now() - enteredAt,
      });
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

  const elapsedMs = routeLoadingState.pathname === location.pathname
    ? routeLoadingState.elapsedMs
    : 0;
  const isTimedOut = shouldShowPlayRouteLoadingPrompt(location.pathname, elapsedMs, PLAY_ROUTE_LOADING_TIMEOUT_MS);

  return (
    <div
      data-bg-friendly-screen="true"
      className="fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(214,173,96,0.16),_transparent_36%),linear-gradient(180deg,_#22160d_0%,_#161008_52%,_#0b0806_100%)]"
    >
      <div className="absolute inset-0 opacity-45" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,_rgba(255,214,130,0.12),_transparent)]" />
        <div className={`absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl ${isTimedOut ? 'bg-red-500/10' : 'bg-amber-400/10'}`} />
      </div>
      <div className="relative flex h-full min-h-0 items-center justify-center px-5 py-[max(1.5rem,env(safe-area-inset-top))]">
        <section className="w-full max-w-[25rem] rounded-[20px] border border-amber-200/15 bg-[#161008]/94 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
            {isTimedOut ? t('matchRoom.routeLoadingTimeout.eyebrow') : t('matchRoom.title.connecting')}
          </p>
          <div className="mt-5 flex justify-center" aria-hidden="true">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border border-amber-200/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-300 border-r-amber-500 animate-spin" />
              <div className="absolute inset-[10px] rounded-full bg-amber-100/8 shadow-[0_0_20px_rgba(251,191,36,0.18)]" />
            </div>
          </div>
          <h2 className="mt-5 text-[1.45rem] font-bold leading-tight text-amber-50">
            {isTimedOut
              ? t('matchRoom.routeLoadingTimeout.title')
              : (title ?? t('matchRoom.loadingResources'))}
          </h2>
          <p className="mt-3 text-sm leading-6 text-amber-100/75">
            {isTimedOut
              ? t('matchRoom.routeLoadingTimeout.description')
              : t('matchRoom.loadingResources')}
          </p>
          <div className="mt-5 rounded-2xl border border-amber-200/12 bg-black/20 px-4 py-3 text-left text-xs leading-6 text-amber-100/80">
            {isTimedOut
              ? t('matchRoom.routeLoadingTimeout.reason')
              : t('matchRoom.loadingProgress.loadingGameModule')}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(resolvePlayRouteFallbackLobbyPath(location.pathname), { replace: true })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm font-semibold text-white/82 transition-colors hover:bg-white/10"
            >
              {t('matchRoom.rescue.backToLobby')}
            </button>
            {isTimedOut ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/20 bg-amber-50/10 px-5 py-2.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-50/16"
              >
                {t('matchRoom.rescue.reload')}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { t } = useTranslation('lobby');
  const { user } = useAuth();
  
  // Token 自动刷新
  useTokenRefresh();

  // 兜底：App 挂载时移除 index.html 的静态占位（LoadingScreen 不出现时的情况）
  useEffect(() => {
    installGlobalErrorContextCapture();
    const initialLoader = document.getElementById('initial-loader');
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const shouldKeepBootstrapLoader = pathname.startsWith('/play/') || pathname.startsWith('/dev/');
    if (initialLoader && !shouldKeepBootstrapLoader) {
      initialLoader.remove();
    }
  }, []);

  const renderAdminOnly = (element: React.ReactNode) => (
    <AdminGuard allowedRoles={['admin']} fallbackPath="/admin/changelogs">
      {element}
    </AdminGuard>
  );

  return (
    <CursorPreferenceProvider>
      <SocialProvider>
        <InteractionGuardProvider>
          <DebugProvider>
            <TutorialProvider>
              <BrowserRouter>
                <BrowserCompatibilityGate>
                <MobileOrientationGuard>
                  <Routes>
                    <Route path="/" element={<React.Suspense fallback={<RouteLoadingFallback />}><Home /></React.Suspense>} />
                    <Route
                      path="/play/:gameId/match/:matchId"
                      element={(
                        <React.Suspense fallback={<RouteLoadingFallback />}>
                          <MatchRoom />
                        </React.Suspense>
                      )}
                    />
                    <Route
                      path="/play/:gameId/local"
                      element={(
                        <React.Suspense fallback={<RouteLoadingFallback />}>
                          <LocalMatchRoom />
                        </React.Suspense>
                      )}
                    />
                    {/* E2E 测试路由：使用 TestMatchRoom + TestHarness 框架进行状态注入测试 */}
                    <Route
                      path="/play/:gameId"
                      element={(
                        <React.Suspense fallback={<RouteLoadingFallback />}>
                          <TestMatchRoom />
                        </React.Suspense>
                      )}
                    />
                    {/* /test 路由已废弃，使用新的 TestHarness 框架（/play/:gameId + setupScene） */}
                    {!isAndroidShellBuild && DevToolsSlicer && (
                      <Route path="/dev/slicer" element={<React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.assetSlicer')} />}><DevToolsSlicer /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && DevToolsFxPreview && (
                      <Route path="/dev/fx" element={<React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.effectPreview')} />}><DevToolsFxPreview /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && DevToolsAudioBrowser && (
                      <Route path="/dev/audio" element={<React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.audioBrowser')} />}><DevToolsAudioBrowser /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && DevToolsArchView && (
                      <Route path="/dev/arch" element={<React.Suspense fallback={<RouteLoadingFallback title="架构可视化" />}><DevToolsArchView /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && UnifiedBuilder && (
                      <Route
                        path="/dev/ugc"
                        element={(
                          <React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.ugcBuilder')} />}>
                            <UnifiedBuilder />
                          </React.Suspense>
                        )}
                      />
                    )}
                    {!isAndroidShellBuild && UGCRuntimeViewPage && (
                      <Route path="/dev/ugc/runtime-view" element={<React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.runtimeView')} />}><UGCRuntimeViewPage /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && UGCSandbox && (
                      <Route path="/dev/ugc/sandbox" element={<React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.devTools.ugcSandbox')} />}><UGCSandbox /></React.Suspense>} />
                    )}
                    {!isAndroidShellBuild && SmashUp4PLayoutTest && (
                      <Route path="/dev/smashup-4p-layout" element={<React.Suspense fallback={<RouteLoadingFallback title="四人局布局测试" />}><SmashUp4PLayoutTest /></React.Suspense>} />
                    )}
                    {/* 教程路由：使用 TutorialMatchRoom 包装组件（不同组件类型），
                        强制 React 在在线↔教程路由切换时完全卸载/重建，防止状态泄漏 */}
                    <Route
                      path="/play/:gameId/tutorial"
                      element={(
                        <React.Suspense fallback={<RouteLoadingFallback />}>
                          <TutorialMatchRoom />
                        </React.Suspense>
                      )}
                    />
                    <Route path="/maintenance" element={<MaintenancePage />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                      <AdminGuard allowedRoles={['admin', 'developer']}>
                        <React.Suspense fallback={<RouteLoadingFallback title={t('matchRoom.admin.dashboard')} />}>
                          <AdminLayout />
                        </React.Suspense>
                      </AdminGuard>
                    }>
                      <Route path="changelogs" element={<GameChangelogsPage />} />
                      <Route
                        index
                        element={
                          user?.role === 'developer'
                            ? <Navigate to="changelogs" replace />
                            : renderAdminOnly(<AdminDashboard />)
                        }
                      />
                      <Route path="users" element={renderAdminOnly(<UsersPage />)} />
                      <Route path="users/:id" element={renderAdminOnly(<UserDetailPage />)} />
                      <Route path="matches" element={renderAdminOnly(<MatchesPage />)} />
                      <Route path="rooms" element={renderAdminOnly(<RoomsPage />)} />
                      <Route path="ugc" element={renderAdminOnly(<UgcPackagesPage />)} />
                      <Route path="sponsors" element={renderAdminOnly(<SponsorsPage />)} />
                      <Route
                        path="feedback"
                        element={(
                          <AdminGuard allowedRoles={['admin', 'developer']} fallbackPath="/admin/changelogs">
                            <FeedbackPage />
                          </AdminGuard>
                        )}
                      />
                      <Route path="health" element={renderAdminOnly(<SystemHealthPage />)} />
                      <Route path="notifications" element={renderAdminOnly(<NotificationsPage />)} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                    </Routes>
                    {DevMobileEvidenceCaptureAgent ? (
                      <React.Suspense fallback={null}>
                        <DevMobileEvidenceCaptureAgent />
                      </React.Suspense>
                    ) : null}
                    <ViewportDebugProbe />
                    <React.Suspense fallback={null}>
                      <LazyGlobalHUD />
                    </React.Suspense>
                    <React.Suspense fallback={null}>
                      <LazyModalStackRoot />
                    </React.Suspense>
                    <React.Suspense fallback={null}>
                      <LazyToastViewport />
                    </React.Suspense>
                    <Toaster />
                    <AndroidLiveUpdateManager />
                    <EngineNotificationListener />
                    <SocketCompatibilityToastListener />
                    <GamePageRescueGate />
                </MobileOrientationGuard>
                </BrowserCompatibilityGate>
              </BrowserRouter>
            </TutorialProvider>
          </DebugProvider>
        </InteractionGuardProvider>
      </SocialProvider>
    </CursorPreferenceProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <ToastProvider>
          <ModalStackProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ModalStackProvider>
        </ToastProvider>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
