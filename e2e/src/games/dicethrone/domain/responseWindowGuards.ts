import type { PlayerId, ResponseWindowState } from '../../../engine/types';
import type { DiceThroneCore } from './types';
import { areTeammates, isTeamMode } from './rules';

export const isDirectDiceInterferenceActor = (
    core: DiceThroneCore,
    currentWindow: ResponseWindowState['current'] | undefined,
    playerId: PlayerId,
): boolean => {
    if (!currentWindow || currentWindow.windowType !== 'afterRollConfirmed') {
        return false;
    }
    if (!isTeamMode(core)) {
        return false;
    }

    const currentResponderId = currentWindow.responderQueue[currentWindow.currentResponderIndex];
    if (!currentResponderId || currentResponderId === playerId) {
        return false;
    }

    return areTeammates(core, currentResponderId, playerId);
};

export const hasAfterRollConfirmedWindowBeenHandled = (
    core: DiceThroneCore,
): boolean => {
    const sequence = core.rollConfirmedSequence ?? 0;
    return sequence > 0 && core.afterRollResponseWindowSequence === sequence;
};

export const hasAfterCardPlayedWindowBeenHandled = (
    core: DiceThroneCore,
): boolean => {
    const sequence = core.cardPlayedSequence ?? 0;
    return sequence > 0 && core.afterCardResponseWindowSequence === sequence;
};
