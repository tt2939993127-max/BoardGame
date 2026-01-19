import type { TutorialManifest } from '../../contexts/TutorialContext';

export const TicTacToeTutorial: TutorialManifest = {
    id: 'tictactoe-basic',
    steps: [
        {
            id: 'intro',
            content: '欢迎来到井字棋！👋 这是一个经典的策略游戏。你的目标是率先将三个棋子连成一条直线（横、竖、斜）。',
            position: 'center',
            requireAction: false
        },
        {
            id: 'center-strategy',
            content: '💡 策略提示：占据中心是最好的开局！点击中间的格子（X）。',
            highlightTarget: 'cell-4', // Data attribute: data-tutorial-id="cell-4"
            position: 'bottom',
            requireAction: true
        },
        {
            id: 'opponent-turn',
            content: '现在AI对手（O）会自动落子...',
            position: 'top',
            requireAction: false, // AI will move automatically
            aiMove: 0 // AI clicks top-left cell
        },
        {
            id: 'block-strategy',
            content: '注意观察对手的棋型！如果有两子连线，一定要堵住它。',
            position: 'center',
            requireAction: false
        },
        {
            id: 'finish',
            content: '祝你好运！尝试赢得胜利吧！🎉',
            position: 'center',
            requireAction: false
        }
    ]
};
