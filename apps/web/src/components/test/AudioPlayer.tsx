import { useRef, useState, useCallback, useEffect } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface AudioPlayerProps {
  audioUrl: string | null | undefined;
  autoPlay?: boolean;
  onePlay?: boolean;
  alreadyPlayed?: boolean;
  onPlayRecord?: () => void;
  onPlayEnd?: () => void;
  volume?: number;
}

export function AudioPlayer({
  audioUrl,
  autoPlay = true,
  onePlay = true,
  alreadyPlayed = false,
  onPlayRecord,
  onPlayEnd,
  volume = 1.0,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [error, setError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const initRef = useRef(false);
  const volumeRef = useRef(currentVolume);
  volumeRef.current = currentVolume;
  const containerRef = useRef<HTMLDivElement>(null);

  // Create audio element once per audioUrl
  useEffect(() => {
    if (!audioUrl || initRef.current) return;
    initRef.current = true;

    const audio = new Audio(audioUrl);
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setHasPlayed(true);
      onPlayEnd?.();
    };
    const onError = () => {
      setError("Gagal memuat audio — periksa koneksi atau coba lagi.");
      setIsPlaying(false);
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);

    if (autoPlay) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (err.name === "NotAllowedError" || err.message?.includes("play()")) {
          setAutoplayBlocked(true);
        } else {
          setError(`Gagal memutar audio: ${err.message}`);
        }
      });
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.pause();
      audioRef.current = null;
      initRef.current = false;
    };
  }, [audioUrl]); // only re-create when URL changes

  // Sync volume without re-creating audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = currentVolume;
    }
  }, [currentVolume]);

  const handlePlay = useCallback(() => {
    if (alreadyPlayed || (hasPlayed && onePlay)) return;
    if (!audioRef.current && !audioUrl) return;

    // Record play server-side (once per question)
    onPlayRecord?.();

    setAutoplayBlocked(false);
    setError(null);

    const audio = audioRef.current ?? new Audio(audioUrl!);
    if (!audioRef.current) {
      audio.volume = currentVolume;
      audioRef.current = audio;

      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setIsBuffering(false);
        setHasPlayed(true);
        onPlayEnd?.();
      });
      audio.addEventListener("error", () => {
        setError("Gagal memuat audio — periksa koneksi atau coba lagi.");
        setIsPlaying(false);
        setIsBuffering(false);
      });
      audio.addEventListener("waiting", () => setIsBuffering(true));
      audio.addEventListener("canplay", () => setIsBuffering(false));
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((err) => {
      if (err.name === "NotAllowedError" || err.message?.includes("play()")) {
        setAutoplayBlocked(true);
      } else {
        setError(`Gagal memutar audio: ${err.message}`);
      }
    });
  }, [hasPlayed, onePlay, audioUrl, currentVolume, onPlayEnd]);

  // Spacebar keyboard shortcut for play/pause
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!(alreadyPlayed || (hasPlayed && onePlay))) {
          handlePlayRef.current();
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [alreadyPlayed, hasPlayed, onePlay]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className="bg-[var(--oat-light)] rounded-xl p-4 flex items-center gap-3 text-sm text-[var(--warm-silver)]">
        <MaterialIcon name="volume_up" className="text-lg" />
        Audio belum tersedia.
      </div>
    );
  }

  return (
    <div ref={containerRef} tabIndex={0} className="bg-[var(--pure-white)] rounded-xl border-2 border-[var(--oat-border)] p-4 space-y-3 focus:ring-2 focus:ring-[var(--matcha-400)] focus:outline-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            disabled={alreadyPlayed || (hasPlayed && onePlay)}
            aria-label={alreadyPlayed ? "Audio sudah diputar" : hasPlayed && onePlay ? "Audio sudah diputar" : isPlaying ? "Memutar..." : "Putar audio"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              alreadyPlayed || (hasPlayed && onePlay)
                ? "bg-[var(--oat-light)] text-[var(--warm-silver)] cursor-not-allowed"
                : isPlaying
                  ? "bg-[var(--matcha-600)] text-[var(--pure-white)] animate-pulse"
                  : "bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-700)] active:scale-95"
            }`}
          >
            <MaterialIcon
              name={isPlaying ? "volume_up" : alreadyPlayed || (hasPlayed && onePlay) ? "lock" : "play_arrow"}
              className="text-xl"
            />
          </button>
          <div>
            <p className="text-sm font-semibold text-[var(--clay-black)]">
              {isBuffering ? "Buffering..." : isPlaying ? "Memutar audio..." : alreadyPlayed || (hasPlayed && onePlay) ? "Audio selesai" : autoplayBlocked ? "Klik play atau tekan ␣" : "Putar audio ␣"}
            </p>
            {(alreadyPlayed || (hasPlayed && onePlay)) && (
              <p className="text-xs text-[var(--pomegranate-400)] flex items-center gap-1">
                <MaterialIcon name="lock" className="text-[10px]" />
                Tidak bisa diputar ulang
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying && (
            <span className="text-xs font-mono text-[var(--warm-charcoal)]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !audioRef.current.muted;
                  setCurrentVolume(audioRef.current.muted ? 0 : 1);
                }
              }}
              aria-label={currentVolume > 0 ? "Bisukan" : "Aktifkan suara"}
              className="p-1 rounded hover:bg-[var(--oat-light)] transition-colors"
            >
              <MaterialIcon
                name={currentVolume > 0 ? "volume_up" : "volume_off"}
                className="text-sm text-[var(--warm-charcoal)]"
              />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentVolume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setCurrentVolume(v);
                if (audioRef.current) {
                  audioRef.current.volume = v;
                  audioRef.current.muted = false;
                }
              }}
              aria-label="Volume"
              className="w-16 h-1 accent-[var(--matcha-600)] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[var(--oat-light)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--matcha-600)] transition-all duration-200"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {error && (
        <p className="text-xs text-[var(--pomegranate-400)]">{error}</p>
      )}
    </div>
  );
}
