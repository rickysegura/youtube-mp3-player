import './YouTubeMp3Player.css';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeMp3PlayerProps {
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
    <div className="player-card">
      <div id="youtube-player" style={{ display: 'none' }}></div>

      <div className="track-info">
        <h3 className="track-title">{videoInfo.title}</h3>
        <p className="track-subtitle">{videoInfo.author}</p>
      </div>

      <div className="progress-section">
        <input
          type="range"
          className="progress-bar"
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
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="controls">
        <button
          className="control-btn"
          onClick={handlePrevious}
          disabled={!playerReady}
          title="Previous Track"
        >
          <SkipBack size={24} />
        </button>
        
        <button
          className="play-btn"
          onClick={handlePlayPause}
          disabled={!playerReady}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        
        <button
          className="control-btn"
          onClick={handleNext}
          disabled={!playerReady}
          title="Next Track"
        >
          <SkipForward size={24} />
        </button>
      </div>

      <div className="volume-section">
        <button
          className="volume-btn"
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          className="volume-bar"
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
  );
};

export default YouTubeMp3Player;
