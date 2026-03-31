import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
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
import { InteractionGuardProvider } from './components/game/framework/InteractionGuard';
import AdminGuard from './components/auth/AdminGuard';
import { MobileOrientationGuard } from './components/common/MobileOrientationGuard';
import { installGlobalErrorContextCapture } from './lib/feedback/errorContext';

import { NotFound } from './pages/NotFound';
import { MaintenancePage } from './pages/Maintenance';

const isAndroidShellBuild = import.meta.env.MODE === 'android';

// 页面级懒加载：首页不需要加载 MatchRoom 的引擎/传输层/教程系统代码
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const MatchRoom = React.lazy(() => import('./pages/MatchRoomWithAudio'));
const LocalMatchRoom = React.lazy(() => import('./pages/LocalMatchRoomWithAudio'));
const TestMatchRoom = React.lazy(() => import('./pages/TestMatchRoomWithAudio'));
// 旧的测试路由已废弃，使用新的 TestHarness 框架
const LazyLoadingScreen = React.lazy(() => import('./components/system/LoadingScreen').then(m => ({ default: m.LoadingScreen })));
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

const RouteLoadingFallback = ({ title }: { title?: string }) => (
  <React.Suspense fallback={null}>
    <LazyLoadingScreen title={title} />
  </React.Suspense>
);

const AppContent = () => {
  const { t } = useTranslation('lobby');
  const { user } = useAuth();
  
  // Token 自动刷新
  useTokenRefresh();

  // 兜底：App 挂载时移除 index.html 的静态占位（LoadingScreen 不出现时的情况）
  useEffect(() => {
    installGlobalErrorContextCapture();
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
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
                    <Route path="/" element={<React.Suspense fallback={null}><Home /></React.Suspense>} />
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
