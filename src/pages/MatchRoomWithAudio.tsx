import { AudioProvider } from '../contexts/AudioContext';
import { logMobileRuntimeCritical } from '../lib/mobile/mobileRuntimeDebug';
import { isNativeAndroidRuntime } from '../lib/mobile/androidRuntime';
import { MatchRoom } from './MatchRoom';

export default function MatchRoomWithAudio() {
    if (isNativeAndroidRuntime()) {
        logMobileRuntimeCritical('MatchRoomWithAudio', 'render-enter');
    }
    return (
        <AudioProvider>
            <MatchRoom />
        </AudioProvider>
    );
}
