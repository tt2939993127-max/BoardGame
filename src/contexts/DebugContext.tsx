/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugContextType {
    playerID: string | null;
    setPlayerID: (id: string | null) => void;
    testMode: boolean;
    setTestMode: (enabled: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [playerID, setPlayerID] = useState<string | null>(() => {
        // Persist debug player selection
        return localStorage.getItem('debug_playerID') || '0';
    });

    const [testMode, setTestMode] = useState<boolean>(() => {
        // 测试模式默认开启
        const saved = localStorage.getItem('debug_testMode');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        if (playerID) {
            localStorage.setItem('debug_playerID', playerID);
        } else {
            localStorage.removeItem('debug_playerID');
        }
    }, [playerID]);

    useEffect(() => {
        localStorage.setItem('debug_testMode', String(testMode));
    }, [testMode]);


    return (
        <DebugContext.Provider value={{
            playerID,
            setPlayerID,
            testMode,
            setTestMode
        }}>
            {children}
        </DebugContext.Provider>
    );
};

export const useDebug = () => {
    const context = useContext(DebugContext);
    if (!context) {
        throw new Error('useDebug must be used within a DebugProvider');
    }
    return context;
};
