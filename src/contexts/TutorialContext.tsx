import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
export interface TutorialStep {
    id: string;
    content: string;
    // Target element to highlight (via data-tutorial-id or id)
    highlightTarget?: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';

    // If true, the "Next" button is hidden, and we wait for external trigger (e.g. a move)
    requireAction?: boolean;

    // AI opponent's automatic move (cell index). When set, AI will execute this move after a delay.
    aiMove?: number;
}

export interface TutorialManifest {
    id: string;
    steps: TutorialStep[];
}

interface TutorialContextType {
    isActive: boolean;
    currentStepIndex: number;
    currentStep: TutorialStep | null;
    startTutorial: (manifest?: TutorialManifest) => void;
    nextStep: () => void;
    closeTutorial: () => void;
    // Callback to execute game move (provided by Board component)
    registerMoveCallback: (callback: (cellId: number) => void) => void;
}

// --- Context ---
const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [manifest, setManifest] = useState<TutorialManifest | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [moveCallback, setMoveCallback] = useState<((cellId: number) => void) | null>(null);
    const executedAiStepsRef = useRef<Set<number>>(new Set());

    const registerMoveCallback = useCallback((callback: (cellId: number) => void) => {
        setMoveCallback(() => callback);
    }, []);


    // --- Default TicTacToe Manifest (Quick Fix) ---
    // In a real app, we'd fetch this based on gameId, but for now we hardcode it here
    // or import it. Let's define a simple default so the button works.
    const DEFAULT_MANIFEST: TutorialManifest = {
        id: 'tictactoe-basics',
        steps: [
            { id: 'welcome', content: 'Welcome to Tic-Tac-Toe! The goal is to get 3 in a row.', position: 'center' },
            { id: 'grid', content: 'This is the game grid. Click any empty cell to place your mark (X).', highlightTarget: 'board-grid', position: 'top', requireAction: false },
            // More steps would go here
        ]
    };

    const startTutorial = useCallback((newManifest?: TutorialManifest) => {
        setManifest(newManifest || DEFAULT_MANIFEST);
        setCurrentStepIndex(0);
        executedAiStepsRef.current = new Set();
        setIsActive(true);
    }, []);


    const closeTutorial = useCallback(() => {
        setIsActive(false);
        setManifest(null);
        setCurrentStepIndex(0);
        executedAiStepsRef.current = new Set();
    }, []);

    const nextStep = useCallback(() => {
        if (!manifest) return;

        if (currentStepIndex < manifest.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            closeTutorial(); // Finish
        }
    }, [manifest, currentStepIndex, closeTutorial]);

    // Execute AI move when entering a step with aiMove
    useEffect(() => {
        if (!isActive || !manifest) return;

        const currentStep = manifest.steps[currentStepIndex];

        if (currentStep.aiMove !== undefined && moveCallback) {
            if (executedAiStepsRef.current.has(currentStepIndex)) return;
            executedAiStepsRef.current.add(currentStepIndex);

            let advanceTimer: number | undefined;

            const moveTimer = window.setTimeout(() => {
                moveCallback(currentStep.aiMove!);

                advanceTimer = window.setTimeout(() => {
                    if (currentStepIndex < manifest.steps.length - 1) {
                        setCurrentStepIndex(prev => (prev === currentStepIndex ? prev + 1 : prev));
                    }
                }, 500);
            }, 1000);

            return () => {
                window.clearTimeout(moveTimer);
                if (advanceTimer !== undefined) window.clearTimeout(advanceTimer);
            };
        }
    }, [isActive, currentStepIndex, manifest, moveCallback]);

    const value: TutorialContextType = {
        isActive,
        currentStepIndex,
        currentStep: manifest ? manifest.steps[currentStepIndex] : null,
        startTutorial,
        nextStep,
        closeTutorial,
        registerMoveCallback,
    };

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
