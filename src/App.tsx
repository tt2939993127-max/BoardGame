import { Client } from 'boardgame.io/react';
import { TicTacToe } from './games/default/game';
import { TicTacToeBoard } from './games/default/Board';
import { DebugProvider, useDebug } from './contexts/DebugContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';

const GameClient = Client({
  game: TicTacToe,
  board: TicTacToeBoard,
  debug: false, // 隐藏右侧原生调试面板，使用自定义面板
});

const GameRoot = () => {
  const { playerID } = useDebug();
  return (
    <>
      {/* Pass playerID to Client to control the view */}
      <GameClient playerID={playerID ?? undefined} />
    </>
  );
};

const App = () => {
  return (
    <DebugProvider>
      <TutorialProvider>
        <GameRoot />
        <TutorialOverlay />
      </TutorialProvider>
    </DebugProvider>
  );
};

export default App;
