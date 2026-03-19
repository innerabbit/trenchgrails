'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Track {
  cardNumber: number;
  name: string;
  artUrl: string;
  videoUrl: string | null;
  rarity: string;
  cardType: string;
}

function proxyUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.replace(/^raw-arts\//, '');
  return `/api/art-proxy?path=${encodeURIComponent(clean)}`;
}

const IMAGE_ADVANCE_MS = 5000;

// Left sidebar tabs matching WMP 9
const SIDEBAR_TABS = [
  'Now Playing',
  'Media Guide',
  'Copy from CD',
  'Media Library',
  'Radio Tuner',
  'Copy to CD or Device',
  'Premium Services',
  'Skin Chooser',
];

export function PlayerContent() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(5); // seconds — 5 for images, actual for video
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch cards
  useEffect(() => {
    (async () => {
      try {
        let res = await fetch('/api/cards?status=finalized');
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          res = await fetch('/api/cards');
          data = await res.json();
        }
        if (!Array.isArray(data)) { setLoading(false); return; }

        const list: Track[] = data
          .filter((c: Record<string, unknown>) =>
            c.video_path || c.thumb_path || c.processed_card_path || c.raw_art_path
          )
          .map((c: Record<string, unknown>) => ({
            cardNumber: c.card_number as number,
            name: (c.name as string) || `Card #${c.card_number}`,
            artUrl: proxyUrl((c.thumb_path || c.processed_card_path || c.raw_art_path) as string) || '',
            videoUrl: proxyUrl(c.video_path as string),
            rarity: (c.rarity_tier as string) || 'common',
            cardType: (c.card_type as string) || 'unknown',
          }));

        setTracks(list);
        if (list.length > 0) setPlaying(true);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const track = tracks[current];
  const isVideo = !!track?.videoUrl;

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    setProgress(0);
    setDuration(5);
    startRef.current = Date.now();
  }, []);

  const next = useCallback(() => {
    if (tracks.length === 0) return;
    goTo((current + 1) % tracks.length);
  }, [current, tracks.length, goTo]);

  const prev = useCallback(() => {
    if (tracks.length === 0) return;
    goTo((current - 1 + tracks.length) % tracks.length);
  }, [current, tracks.length, goTo]);

  // Auto-advance timer for IMAGE tracks only
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!playing || tracks.length === 0 || isVideo) {
      if (!isVideo) setProgress(0);
      return;
    }

    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / IMAGE_ADVANCE_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        next();
      }
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, tracks.length, next, isVideo]);

  // Video control sync
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isVideo) return;

    if (playing) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [playing, isVideo, current]);

  const handleVideoTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress(vid.currentTime / vid.duration);
    setDuration(vid.duration);
  }, []);

  const handleVideoEnded = useCallback(() => {
    next();
  }, [next]);

  const handleVideoLoaded = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration || 5);
    if (playing) vid.play().catch(() => {});
  }, [playing]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    setPlaying(p => !p);
  }, []);

  // Stop
  const stop = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  return (
    <div style={{
      background: '#243d71',
      fontFamily: 'Tahoma, sans-serif',
      userSelect: 'none',
      fontSize: 11,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Menu bar — File View Play Tools Help */}
      <div style={{
        background: 'linear-gradient(180deg, #3a6aaa 0%, #2a5090 50%, #1e3a6a 100%)',
        display: 'flex',
        gap: 0,
        padding: '2px 4px',
        borderBottom: '1px solid #1a2a50',
      }}>
        {['File', 'View', 'Play', 'Tools', 'Help'].map((m) => (
          <span key={m} style={{
            color: '#c8ddf8',
            fontSize: 11,
            padding: '1px 6px',
            cursor: 'default',
          }}>{m}</span>
        ))}
      </div>

      {/* Now Playing header bar */}
      <div style={{
        background: 'linear-gradient(180deg, #3868a8 0%, #2050a0 100%)',
        padding: '3px 8px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #183060',
      }}>
        <span style={{ color: '#a0c8f0', fontSize: 9, marginRight: 8 }}>▸ Now Playing</span>
        <div style={{
          flex: 1,
          color: '#d0e4f8',
          fontSize: 10,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {track ? `${track.cardType}. ${track.name}` : ''}
        </div>
      </div>

      {/* Main content area: sidebar + visualization */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left sidebar — navigation tabs */}
        <div style={{
          width: 72,
          background: 'linear-gradient(180deg, #1e3868 0%, #162850 100%)',
          borderRight: '1px solid #0e1a38',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 2,
          flexShrink: 0,
        }}>
          {SIDEBAR_TABS.map((tab, i) => (
            <div key={tab} style={{
              padding: '3px 4px',
              fontSize: 9,
              color: i === 0 ? '#ffffff' : '#7aa0d0',
              background: i === 0 ? 'linear-gradient(90deg, #2860a8 0%, #1a4888 100%)' : 'transparent',
              borderLeft: i === 0 ? '2px solid #60a0e0' : '2px solid transparent',
              cursor: 'default',
              lineHeight: 1.2,
            }}>
              {tab}
            </div>
          ))}
        </div>

        {/* Center — visualization / media display */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Media area */}
          <div style={{
            position: 'relative',
            background: '#000',
            height: 220,
            overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4a7aaa', fontSize: 11,
              }}>Loading...</div>
            ) : tracks.length === 0 ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
                color: '#4a7aaa', fontSize: 11,
              }}>
                <div style={{ fontSize: 40, opacity: 0.3 }}>♪</div>
                <div>No cards found</div>
              </div>
            ) : track ? (
              isVideo ? (
                <video
                  ref={videoRef}
                  key={`vid-${current}`}
                  src={track.videoUrl!}
                  muted
                  playsInline
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  onLoadedMetadata={handleVideoLoaded}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                  }}
                />
              ) : (
                <img
                  key={`img-${current}`}
                  src={track.artUrl}
                  alt={track.name}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                  }}
                />
              )
            ) : null}

            {/* Track counter */}
            {tracks.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                background: 'rgba(0,0,0,0.65)',
                color: '#a0c8f0',
                fontSize: 9,
                padding: '1px 4px',
                borderRadius: 2,
              }}>
                {current + 1}/{tracks.length}
              </div>
            )}
          </div>

          {/* Now Playing info strip */}
          <div style={{
            background: 'linear-gradient(180deg, #1a3060 0%, #142848 100%)',
            padding: '3px 6px',
            borderTop: '1px solid #0e1a38',
          }}>
            {track ? (
              <div style={{
                color: '#c0d8f0',
                fontSize: 10,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                <strong>&quot;{track.name}&quot;</strong>
                <span style={{ color: '#6a90c0', marginLeft: 6 }}>
                  {track.rarity} · #{track.cardNumber}
                  {isVideo && ' · 🎬'}
                </span>
              </div>
            ) : (
              <div style={{ color: '#3a5a8a', fontSize: 10 }}>No media</div>
            )}
          </div>
        </div>
      </div>

      {/* Transport controls bar — WMP 9 style */}
      <div style={{
        background: 'linear-gradient(180deg, #2a5090 0%, #1e3a6a 50%, #162a58 100%)',
        borderTop: '1px solid #3a6aaa',
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        {/* Play controls cluster */}
        <TransportBtn onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </TransportBtn>
        <TransportBtn onClick={stop} title="Stop">⏹</TransportBtn>
        <TransportBtn onClick={prev} title="Previous">⏮</TransportBtn>
        <TransportBtn onClick={next} title="Next">⏭</TransportBtn>

        {/* Seek bar */}
        <div style={{
          flex: 1,
          height: 8,
          background: '#0a1838',
          borderRadius: 4,
          overflow: 'hidden',
          margin: '0 4px',
          border: '1px solid #1a3060',
        }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'linear-gradient(180deg, #60b040 0%, #408028 100%)',
            borderRadius: 3,
            transition: 'width 0.05s linear',
          }} />
        </div>

        {/* Volume */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          flexShrink: 0,
        }}>
          <span style={{ color: '#6090c0', fontSize: 10 }}>🔊</span>
          <div style={{
            width: 40, height: 5,
            background: '#0a1838',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid #1a3060',
          }}>
            <div style={{
              width: '72%', height: '100%',
              background: 'linear-gradient(90deg, #4080b0, #60a0d0)',
              borderRadius: 2,
            }} />
          </div>
        </div>
      </div>

      {/* Status bar — WMP 9 bottom */}
      <div style={{
        background: 'linear-gradient(180deg, #1e3868 0%, #162850 100%)',
        borderTop: '1px solid #2a4a80',
        padding: '2px 6px',
        display: 'flex',
        alignItems: 'center',
        fontSize: 9,
        color: '#6090c0',
      }}>
        <span>♫ {isVideo ? 'Video' : 'Slideshow'}</span>
        <div style={{ flex: 1 }} />
        <span>
          {playing ? 'Playing' : 'Stopped'}
          {track ? ` · ${formatTime(progress * duration)}/${formatTime(duration)}` : ''}
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TransportBtn({ children, onClick, title }: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '1px solid #3868a0',
        background: 'linear-gradient(180deg, #4a80c0 0%, #2a5898 50%, #1a4080 100%)',
        color: '#d0e8ff',
        fontSize: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(150,200,255,0.2)',
        padding: 0,
        lineHeight: 1,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, #5a90d0 0%, #3a68a8 50%, #2a5090 100%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, #4a80c0 0%, #2a5898 50%, #1a4080 100%)';
      }}
    >
      {children}
    </button>
  );
}
