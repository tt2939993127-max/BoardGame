import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from 'boardgame.io/react';
import { TicTacToe } from '../games/default/game';
import { TicTacToeBoard } from '../games/default/Board';
import { TicTacToeTutorial } from '../games/default/tutorial';
import { useDebug } from '../contexts/DebugContext';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import { useTutorial } from '../contexts/TutorialContext';

const GameClient = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
    debug: false,
});

export const MatchRoom = () => {
    const { playerID } = useDebug();
    const { matchId } = useParams();
    const navigate = useNavigate();
    const { startTutorial, isActive } = useTutorial();

    useEffect(() => {
        // If we are in the tutorial route, ensure tutorial is active
        if (window.location.pathname.endsWith('/tutorial')) {
            // Small delay to ensure GameClient is mounted/ready if needed, or just set context
            startTutorial(TicTacToeTutorial);
        }
    }, [startTutorial]);

    const isTutorialRoute = window.location.pathname.endsWith('/tutorial');
    const effectivePlayerID = (isActive || isTutorialRoute) ? undefined : (playerID ?? undefined);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Simple Back Button for temporary navigation */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="bg-black/20 backdrop-blur-md text-white/80 px-4 py-2 rounded-full text-sm font-medium border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2 group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> 返回
                </button>
            </div>

            <div className="w-full h-full">
                {/* Pass playerID to Client to control the view */}
                <GameClient playerID={effectivePlayerID} matchID={matchId} />
            </div>

            <TutorialOverlay />
        </div>
    );
};
