import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    startTutorial: (manifest: TutorialManifest) => void;
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

    const registerMoveCallback = useCallback((callback: (cellId: number) => void) => {
        setMoveCallback(() => callback);
    }, []);

    const startTutorial = useCallback((newManifest: TutorialManifest) => {
        setManifest(newManifest);
        setCurrentStepIndex(0);
        setIsActive(true);
    }, []);

    const closeTutorial = useCallback(() => {
        setIsActive(false);
        setManifest(null);
        setCurrentStepIndex(0);
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
        console.log(`[Tutorial] Step ${currentStepIndex}:`, currentStep);

        if (currentStep.aiMove !== undefined && moveCallback) {
            // Delay AI move slightly for better UX
            const timer = setTimeout(() => {
                console.log(`[Tutorial AI] Auto-clicking cell ${currentStep.aiMove}`);
                moveCallback(currentStep.aiMove!);
                // Auto-advance after AI move
                setTimeout(() => {
                    if (currentStepIndex < manifest.steps.length - 1) {
                        setCurrentStepIndex(prev => prev + 1);
                    }
                }, 500);
            }, 1000);
            return () => clearTimeout(timer);
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
