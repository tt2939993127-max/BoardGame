import type { TutorialManifest } from '../../contexts/TutorialContext';

export const TicTacToeTutorial: TutorialManifest = {
    id: 'tictactoe-basic',
    steps: [
        {
            id: 'intro',
            content: 'game-tictactoe:tutorial.steps.intro',
            position: 'center',
            requireAction: false,
            showMask: true
        },
        {
            id: 'center-strategy',
            content: 'game-tictactoe:tutorial.steps.centerStrategy',
            highlightTarget: 'cell-4', // 对应数据属性: data-tutorial-id="cell-4"
            position: 'bottom',
            requireAction: true
        },
        {
            id: 'opponent-turn',
            content: '', // 隐藏步骤 - AI 自动移动
            aiMove: 0 // AI 点击左上角格子
        },
        {
            id: 'block-strategy',
            content: 'game-tictactoe:tutorial.steps.blockStrategy',
            position: 'center',
            requireAction: false
        },
        {
            id: 'finish',
            content: 'game-tictactoe:tutorial.steps.finish',
            position: 'center',
            requireAction: false
        }
    ]
};

export default TicTacToeTutorial;
