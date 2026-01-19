import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DebugProvider } from './contexts/DebugContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { Home } from './pages/Home';
import { MatchRoom } from './pages/MatchRoom';

const App = () => {
  return (
    <DebugProvider>
      <TutorialProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games/:gameId/match/:matchId" element={<MatchRoom />} />
            {/* Fallback tutorial route if needed, or mapped to match */}
            <Route path="/games/:gameId/tutorial" element={<MatchRoom />} />
          </Routes>
        </BrowserRouter>
      </TutorialProvider>
    </DebugProvider>
  );
};

export default App;
