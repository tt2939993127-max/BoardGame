import React from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  CONFIG_REVIEW_GAME_IDS,
  getGameConfigReviewPath,
} from '../config/gameConfigReviewRoutes';

const CONFIG_REVIEW_PAGE_BY_GAME_ID = {
  summonerwars: React.lazy(() => import('./SummonerWarsConfigReview')),
  dicethrone: React.lazy(() => import('./DiceThroneConfigReview')),
  betrayal: React.lazy(() => import('./BetrayalConfigReview')),
} as const;

type ConfigReviewPageComponent = React.ComponentType;

export const CONFIG_REVIEW_PAGE_ROUTES = CONFIG_REVIEW_GAME_IDS.map((gameId) => ({
  gameId,
  path: getGameConfigReviewPath(gameId),
  Component: CONFIG_REVIEW_PAGE_BY_GAME_ID[gameId],
}));

const ConfigReviewRouteLoading = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#1d130c] font-serif text-[#f3e3c3]">
    加载配置表…
  </main>
);

export function ConfigReviewRoutePage({ Component }: { Component: ConfigReviewPageComponent }) {
  return (
    <React.Suspense fallback={<ConfigReviewRouteLoading />}>
      <Component />
    </React.Suspense>
  );
}

export function ConfigReviewRoutes() {
  return (
    <Routes>
      {CONFIG_REVIEW_PAGE_ROUTES.map(({ gameId, path, Component }) => (
        <Route
          key={gameId}
          path={`${path}/*`}
          element={<ConfigReviewRoutePage Component={Component} />}
        />
      ))}
    </Routes>
  );
}
