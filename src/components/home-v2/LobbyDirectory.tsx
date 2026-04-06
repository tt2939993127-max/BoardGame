import type { GameConfig } from '../../config/games.config';
import { GameListCard } from '../lobby/GameList';

function BookGamePage({
    games,
    onSelect,
}: {
    games: GameConfig[];
    onSelect: (id: string) => void;
}) {
    return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[4.5%] px-[2.8%] py-[2.8%] pointer-events-auto">
            {games.map((game, index) => (
                <GameListCard
                    key={game.id}
                    game={game}
                    index={index}
                    onGameClick={onSelect}
                    className="h-full"
                />
            ))}
        </div>
    );
}

export interface OverviewProps {
    games: GameConfig[];
    onGameClick: (id: string) => void;
}

export const Overview = ({ games, onGameClick }: OverviewProps) => {
    return (
        <div className="h-full w-full pointer-events-auto">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 place-items-center gap-x-[2%] gap-y-[2.4%] px-[1.4%] py-[1.8%]">
                {games.map((game, index) => (
                    <GameListCard
                        key={game.id}
                        game={game}
                        index={index}
                        onGameClick={onGameClick}
                        variant="homeV2Compact"
                        className="max-w-none sm:max-w-none"
                    />
                ))}
            </div>
        </div>
    );
};

export interface LeftProps {
    games: GameConfig[];
    onGameClick: (id: string) => void;
}

export const Left = ({ games, onGameClick }: LeftProps) => {
    return <BookGamePage games={games} onSelect={onGameClick} />;
};

export interface RightProps {
    games: GameConfig[];
    onGameClick: (id: string) => void;
}

export const Right = ({ games, onGameClick }: RightProps) => {
    return <BookGamePage games={games} onSelect={onGameClick} />;
};

export const LobbyDirectory = {
    Overview,
    Left,
    Right,
};
