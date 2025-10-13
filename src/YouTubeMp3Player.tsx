import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubeMp3PlayerProps {
  youtubeLinks?: string[];
}

interface VideoInfo {
  title: string;
  author: string;
}

const YouTubeMp3Player: React.FC<YouTubeMp3PlayerProps> = ({ 
  youtubeLinks = [
    'https://youtu.be/s3tZtnQvebg?list=OLAK5uy_kwBubkzb1wANXW6FrwpGBxR3bRN3uGmgM',
    'https://youtu.be/5eAJWvxH_A4?list=OLAK5uy_kwBubkzb1wANXW6FrwpGBxR3bRN3uGmgM',
    'https://youtu.be/piuovGiAFvo',
  ]
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoInfo, setVideoInfo] = useState<VideoInfo>({ title: 'Loading...', author: '' });
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  const extractVideoId = (url: string): string => {
    const patterns = [
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/embed\/([^?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return '';
  };

  const videoIds = youtubeLinks.map(link => extractVideoId(link));
  const currentVideoId = videoIds[currentIndex];

  // Fetch video info when player is ready or track changes
  useEffect(() => {
    if (playerRef.current && playerReady) {
      updateVideoInfo();
    }
  }, [currentIndex, playerReady]);

  const updateVideoInfo = () => {
    if (!playerRef.current) return;
    
    try {
      const videoData = playerRef.current.getVideoData();
      setVideoInfo({
        title: videoData.title || `Track ${currentIndex + 1}`,
        author: videoData.author || 'Unknown Artist'
      });
    } catch (error) {
      console.error('Error fetching video info:', error);
      setVideoInfo({
        title: `Track ${currentIndex + 1}`,
        author: 'Unknown Artist'
      });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initPlayer = () => {
    if (!currentVideoId) return;
    
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: currentVideoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });
  };

  const onPlayerReady = (event: any) => {
    setPlayerReady(true);
    setVolume(50);
    event.target.setVolume(50);
    updateVideoInfo();
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      setDuration(playerRef.current.getDuration());
      startTimeUpdate();
      updateVideoInfo();
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      stopTimeUpdate();
    } else if (event.data === window.YT.PlayerState.ENDED) {
      handleNext();
    }
  };

  const startTimeUpdate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 100);
  };

  const stopTimeUpdate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % videoIds.length;
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    if (playerRef.current && playerReady) {
      playerRef.current.loadVideoById(videoIds[nextIndex]);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? videoIds.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setCurrentTime(0);
    if (playerRef.current && playerReady) {
      playerRef.current.loadVideoById(videoIds[prevIndex]);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
        setVolume(50);
        playerRef.current.setVolume(50);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="w-full max-w-[400px] rounded-[20px] p-8 text-white border border-white/[0.06]"
          style={{
            background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
        <div id="youtube-player" style={{ display: 'none' }}></div>

        <div className="text-center mb-7 px-2">
          <h3 className="text-xl font-semibold mb-1.5 text-white leading-[1.3] overflow-hidden"
              style={{
                letterSpacing: '-0.3px',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineClamp: 2
              }}>
            {videoInfo.title}
          </h3>
          <p className="text-sm text-white/50 m-0 font-normal" style={{ letterSpacing: '0.2px' }}>
            {videoInfo.author}
          </p>
        </div>

        <div className="mb-7">
          <input
            type="range"
            className="w-full h-1 rounded-sm outline-none cursor-pointer transition-all duration-200 appearance-none hover:h-1.5 disabled:opacity-40 disabled:cursor-not-allowed
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
                      [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:[&::-webkit-slider-thumb]:scale-110
                      hover:[&::-webkit-slider-thumb]:shadow-[0_2px_12px_rgba(255,255,255,0.3)]
                      [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200
                      [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:[&::-moz-range-thumb]:scale-110
                      hover:[&::-moz-range-thumb]:shadow-[0_2px_12px_rgba(255,255,255,0.3)]"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!playerReady}
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(currentTime / duration) * 100}%, #333333 ${(currentTime / duration) * 100}%, #333333 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-white/40 mt-2.5 font-medium" style={{ letterSpacing: '0.3px' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 mb-7">
          <button
            className="bg-transparent border-0 text-white/60 cursor-pointer p-2.5 rounded-full flex items-center justify-center
                      transition-all duration-200 hover:text-white hover:bg-white/[0.08] hover:scale-110 active:scale-95
                      disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            onClick={handlePrevious}
            disabled={!playerReady}
            title="Previous Track"
          >
            <SkipBack size={24} />
          </button>

          <button
            className="border border-white/10 text-black w-16 h-16 rounded-full cursor-pointer flex items-center justify-center
                      transition-all duration-300 hover:scale-[1.08] active:scale-[0.98]
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            style={{
              background: 'linear-gradient(145deg, #ffffff, #e0e0e0)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff, #f5f5f5)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff, #e0e0e0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            onClick={handlePlayPause}
            disabled={!playerReady}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className="bg-transparent border-0 text-white/60 cursor-pointer p-2.5 rounded-full flex items-center justify-center
                      transition-all duration-200 hover:text-white hover:bg-white/[0.08] hover:scale-110 active:scale-95
                      disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            onClick={handleNext}
            disabled={!playerReady}
            title="Next Track"
          >
            <SkipForward size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3.5 mb-0">
          <button
            className="bg-transparent border-0 text-white/60 cursor-pointer p-2.5 rounded-full flex items-center justify-center
                      transition-all duration-200 hover:text-white hover:bg-white/[0.08] hover:scale-110 active:scale-95 flex-shrink-0"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            className="w-full h-1 rounded-sm outline-none cursor-pointer transition-all duration-200 appearance-none hover:h-1.5
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
                      [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:[&::-webkit-slider-thumb]:scale-110
                      hover:[&::-webkit-slider-thumb]:shadow-[0_2px_12px_rgba(255,255,255,0.3)]
                      [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200
                      [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:[&::-moz-range-thumb]:scale-110
                      hover:[&::-moz-range-thumb]:shadow-[0_2px_12px_rgba(255,255,255,0.3)]"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume}%, #333333 ${volume}%, #333333 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default YouTubeMp3Player;
