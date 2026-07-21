import { mapRange } from '@/utils/number';
import { useEffect, useRef, useState } from 'react';
import { clamp } from 'three/src/math/MathUtils.js';

import useAudioProcessing from './useAudioProcessing';
import useRadioControlsStore from './useRadioControls';

// Find and set the current song from live data

const fetchLiveData = async (): Promise<any> => {
  const response = await fetch(`/api/live`);
  if (!response.ok) {
    throw new Error('Failed to fetch live data');
  }
  const data = await response.json();
  return data;
};

const getAudioProcessingConfig = (channelOffset: number, bass: number) => {
  return {
    distortion: mapRange(channelOffset, [0, 1], [0.05, 0.8]), // 0-1, higher = more distortion (0.2 = subtle, 0.6 = heavy)
    noise: mapRange(channelOffset, [0.5, 3], [0, 0.015]), // 0-1, higher = more static noise (0.1 = clean, 0.4 = very noisy)
    lowpass: 1, // 0-1, lower = more muffled sound (0.3 = very muffled, 0.8 = clear)
    highpass: mapRange(bass, [0, 1], [10, 0.1], false), // 0-1, higher = removes more bass (0.05 = full bass, 0.3 = thin)
    reverb: 0.1, // 0-1, higher = more echo/reverb (0.1 = dry, 0.5 = very echoey)
    tuningDrift: 0.6, // 0-1, higher = more frequency drift (0.05 = stable, 0.3 = wobbly)
    signalModulation: 0.8, // 0-1, higher = noise modulates more with signal (0.1 = constant, 0.5 = very dynamic)
  };
};

const findNearestSong = (data: Record<string, any>, channel: number) => {
  let station = data[channel.toString()];
  let channelOffset = 0;

  if (!station) {
    const stations = Object.keys(data).map((station) => Number(station));
    // Find closest station from channel
    const closestStation = stations.reduce((closest: any, station: any) => {
      return Math.abs(station - channel) < Math.abs(closest - channel)
        ? station
        : closest;
    }, stations[0]);
    channelOffset = Math.abs(closestStation - channel);
    station = data[closestStation.toString()];
  }

  const song = {
    url: station.song.url,
    duration: station.totalDuration,
    currentPart: station.part,
    remainingTime: station.remainingTime,
    station: station.station,
    timestamp: station.timestamp,
  };

  return [song, channelOffset] as const;
};

// Calculate time offset between API and client
const calculateTimeOffset = (apiTimestamp: string) => {
  const apiTime = new Date(apiTimestamp).getTime();
  const clientTime = Date.now();
  return clientTime - apiTime;
};

const useRadio = () => {
  const overallVolume = useRadioControlsStore((state) => state.volume);
  const channel = useRadioControlsStore((state) => state.channel);
  const bass = useRadioControlsStore((state) => state.bass);

  const [liveData, setLiveData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const currentSongDataRef = useRef<any>(null);
  const [channelOffset, setChannelOffset] = useState(0);

  const offsetVolume = clamp(
    mapRange(channelOffset, [0, 2], [overallVolume, 0], false),
    0,
    overallVolume
  );

  const audioProcessingConfig = getAudioProcessingConfig(channelOffset, bass);

  const { initializeAudioContext, updateVolume } = useAudioProcessing(
    audioProcessingConfig,
    overallVolume
  );

  const play = async () => {
    await audioRef?.play();
    await audioContext?.resume();
    setIsPlaying(true);
  };

  const getSong = async (shouldFetch: boolean = false) => {
    try {
      let data = liveData;
      if (!data || shouldFetch) {
        data = await fetchLiveData();
        setLiveData(data);
      }
      return findNearestSong(data, channel);
    } catch (error) {
      console.error('Error fetching live data:', error);
      return null;
    }
  };

  // Start playing the current song at the correct position
  const playCurrentSong = async (
    song: any,
    allowFallback: boolean = true
  ): Promise<HTMLAudioElement | null> => {
    if (!song || !song.url) {
      console.log('No song or URL provided');
      return null;
    }

    setAudioError(null);
    currentSongDataRef.current = song;

    let audio = audioRef;
    if (!audio) {
      audio = new Audio();
      audio.crossOrigin = 'anonymous';
      try {
        const audioContext = await initializeAudioContext(audio);
        setAudioContext(audioContext);
        if (!audioContext) {
          console.warn(
            'Audio processing could not be initialized - audio element already connected'
          );
        }
      } catch (error) {
        console.error('Failed to initialize audio processing:', error);
      }
    }
    setAudioRef(audio);

    audio.pause();

    // If the song URL is remote, route it through the local proxy to avoid CORS issues
    const src = typeof song.url === 'string' && song.url.startsWith('http')
      ? `/api/proxy?url=${encodeURIComponent(song.url)}`
      : song.url;

    // Pre-validate remote audio sources with a HEAD request to avoid format errors
    if (typeof src === 'string' && src.startsWith('/api/proxy')) {
      try {
        const head = await fetch(src, { method: 'HEAD' });
        const contentType = head.headers.get('content-type') || '';
        if (!head.ok || !/audio|mpeg|ogg|mp3|wav/i.test(contentType)) {
          console.warn('Audio HEAD check failed:', head.status, contentType);
          if (allowFallback) {
            // Try next song
            return playNextSong(true, true);
          }
        }
      } catch (err) {
        console.warn('Audio HEAD check error', err);
        if (allowFallback) {
          return playNextSong(true, true);
        }
      }
    }

    audio.src = src;
    audio.load();

    return audio;
  };

  // Fetch next song when current song finishes
  const playNextSong = async (
    shouldFetch: boolean = false,
    forcePlay: boolean = false
  ): Promise<HTMLAudioElement | null> => {
    const [nextSong, channelOffset] = (await getSong(shouldFetch)) ?? [];
    setChannelOffset(channelOffset ?? 0);
    if (
      nextSong &&
      (nextSong.url !== currentSongDataRef.current?.url || forcePlay)
    ) {
      return playCurrentSong(nextSong);
    }
    return audioRef;
  };

  useEffect(() => {
    if (!audioRef) return;
    const onLoadedMetadata = async () => {
      // Use the stored song data
      const songData = currentSongDataRef.current;
      if (!songData) return;

      // Calculate the correct start position accounting for time differences
      const timeOffset = calculateTimeOffset(songData.timestamp);
      const seekTime = clamp(
        songData.currentPart + timeOffset / 1000,
        0,
        audioRef.duration - 1
      );

      audioRef.currentTime = seekTime;

      try {
        if (isPlaying) {
          await play();
        }
      } catch {
        // Failed due to autoplay policy
      }
    };

    const onEnded = async () => {
      setIsPlaying(false);
      // Fetch next song when current song ends
      playNextSong(true);
      try {
        if (isPlaying) {
          await play();
        }
      } catch {
        // Failed due to autoplay policy
      }
    };

    const onError = (e: any) => {
      const message =
        audioRef?.error?.message ||
        (typeof e === 'object'
          ? e?.message || JSON.stringify(e)
          : String(e)) ||
        'Unknown audio error';
      console.error('Audio error:', message);
      setAudioError(message);

      // If format or decode error, attempt a fallback: try next song, else local SFX
      const isFormatError = /format|decode|NotSupported|MEDIA_ELEMENT_ERROR/i.test(
        message
      );

      if (isFormatError) {
        (async () => {
          try {
            // Try the next song in the station first
            const newAudio = await playNextSong(true, true);
            if (newAudio && newAudio.src) {
              try {
                await newAudio.play();
                setIsPlaying(true);
                setAudioError(null);
                return;
              } catch (err) {
                console.warn('Fallback play failed:', err);
              }
            }
          } catch (err) {
            console.warn('Error attempting next-song fallback', err);
          }

          // Last-resort: use a local short SFX to avoid silent UI
          try {
            if (audioRef) {
              audioRef.pause();
              audioRef.src = '/sfx/knob-tick.mp3';
              audioRef.load();
              if (hasUserInteracted) {
                await audioRef.play();
                setIsPlaying(true);
                setAudioError(null);
              }
            }
          } catch (err) {
            console.error('Local fallback failed', err);
          }
        })();
      }
    };

    audioRef.addEventListener('loadedmetadata', onLoadedMetadata);
    audioRef.addEventListener('ended', onEnded);
    audioRef.addEventListener('error', onError);

    return () => {
      audioRef.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.removeEventListener('ended', onEnded);
      audioRef.removeEventListener('error', onError);
    };
  }, [audioRef, playNextSong, setIsPlaying, isPlaying]);

  // Initialize radio when channel changes
  useEffect(() => {
    playNextSong();
  }, [channel]);

  useEffect(() => {
    if (audioRef) {
      audioRef.volume = offsetVolume * 0.75;
    }
    // Also update the audio processing volume
    updateVolume(overallVolume);
  }, [offsetVolume, overallVolume, audioRef, updateVolume]);

  return {
    liveData,
    isPlaying,
    audioRef,
    hasUserInteracted,
    playCurrentSong,
    play: async () => {
      setHasUserInteracted(true);
      let audio = audioRef;
      if (!audio || !audio.src) {
        audio = await playNextSong(false, true);
      }
      if (audio && audio.src) {
        try {
          await audio.play();
          await audioContext?.resume();
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to play audio:', error);
          setAudioError(
            typeof error === 'object' ? (error as any)?.message : String(error)
          );
        }
      } else {
        console.log('Audio not ready or no source available');
      }
    },
    stop: () => {
      if (audioRef) {
        audioRef.pause();
        setIsPlaying(false);
        setLiveData(null);
        audioContext?.suspend();
      }
    },
  };
};

export default useRadio;
