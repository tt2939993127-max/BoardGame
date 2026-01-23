import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    Volume2,
    VolumeX,
    Music,
    Disc,
    Speaker,
    SkipForward
} from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';

export const AudioControlSection: React.FC = () => {
    const { t } = useTranslation('game');
    const {
        muted,
        toggleMute,
        sfxVolume,
        setSfxVolume,
        bgmVolume,
        setBgmVolume,
        playlist,
        currentBgm,
        playBgm
    } = useAudio();

    const handleSwitchBgm = () => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(track => track.key === currentBgm);
        const nextIndex = (currentIndex + 1) % playlist.length;
        playBgm(playlist[nextIndex].key);
    };

    const currentTrack = playlist.find(track => track.key === currentBgm);
    const currentTrackLabel = currentTrack
        ? t(`audio.tracks.${currentTrack.key}`, { defaultValue: currentTrack.name })
        : t('audio.nonePlaying');

    return (
        <div className="space-y-4 pt-2 border-t border-white/10">
            {/* Volume Sliders */}
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        <div className="flex items-center gap-1.5">
                            <Music size={12} />
                            <span>{t('audio.bgmVolume')}</span>
                        </div>
                        <span>{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={bgmVolume}
                            onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-400 hover:bg-white/20 transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        <div className="flex items-center gap-1.5">
                            <Speaker size={12} />
                            <span>{t('audio.sfxVolume')}</span>
                        </div>
                        <span>{Math.round(sfxVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={sfxVolume}
                            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-400 hover:bg-white/20 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* BGM Info & Switcher */}
            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 overflow-hidden">
                    <motion.div
                        animate={{ rotate: currentBgm ? 360 : 0 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className={`text-indigo-400/80 ${!currentBgm && 'opacity-40'}`}
                    >
                        <Disc size={18} />
                    </motion.div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-tighter">{t('audio.nowPlaying')}</span>
                        <span className="text-white/90 text-[11px] font-medium truncate">
                            {currentTrackLabel}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleMute}
                        className={`p-1.5 rounded-lg transition-all ${muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-white/40'}`}
                        title={muted ? t('audio.unmute') : t('audio.mute')}
                    >
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button
                        onClick={handleSwitchBgm}
                        disabled={playlist.length <= 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title={t('audio.switchTrack')}
                    >
                        <SkipForward size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
