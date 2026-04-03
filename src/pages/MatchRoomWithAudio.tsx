import { AudioProvider } from '../contexts/AudioContext';
import { logMobileRuntimeCritical } from '../lib/mobile/mobileRuntimeDebug';
import { MatchRoom } from './MatchRoom';

export default function MatchRoomWithAudio() {
    logMobileRuntimeCritical('MatchRoomWithAudio', 'render-enter');
    return (
        <AudioProvider>
            <MatchRoom />
        </AudioProvider>
    );
}
