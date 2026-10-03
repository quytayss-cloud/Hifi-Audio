import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2,
  Mic, MicOff, Sliders, Activity, Music, Plus, Trash2, Settings, Radio,
  HelpCircle, Sparkles, Zap, ShieldCheck, Repeat, Shuffle, Upload,
  ListMusic, Info, Check, RefreshCw, Layers, Monitor, Disc, Video,
  ZoomIn, ZoomOut, Move, ChevronDown, ChevronUp, Eye, EyeOff, Tv, Type,
  Youtube, FolderVideo, FolderPlus, Film, SlidersHorizontal, Sun, Contrast,
  Sparkle, Split, Search, Link, Tag, ExternalLink, Layers3, HardDrive
} from 'lucide-react';

// Generates realistic synth audio buffers and converts them to Blob URLs for instant playback
const generateDemoTrack = (type) => {
  const sampleRate = 44100;
  const duration = 16;
  const numFrames = sampleRate * duration;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
  const buffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = type === 'edm' ? 128 : type === 'bolero' ? 78 : type === 'acoustic' ? 90 : 110;
  const beatTime = 60 / bpm;

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const beat = (t / beatTime) % 1;
    let sampleL = 0;
    let sampleR = 0;

    if (type === 'bolero') {
      const noteFreq = [110, 146.83, 164.81, 130.81][Math.floor((t / beatTime / 2) % 4)];
      const bassEnv = Math.exp(-beat * 4);
      const bass = Math.sin(2 * Math.PI * noteFreq * t) * bassEnv * 0.4;
      
      const chordFreqs = [220, 277.18, 329.63, 440];
      let pad = 0;
      chordFreqs.forEach(f => { pad += Math.sin(2 * Math.PI * f * t); });
      pad = pad * 0.08 * (0.4 + 0.6 * Math.sin(beat * Math.PI));

      const strumEnv = Math.exp(-((beat * 4) % 1) * 6);
      const guitar = Math.sin(2 * Math.PI * 587.33 * t) * strumEnv * 0.15;

      sampleL = bass + pad + guitar;
      sampleR = bass + pad - guitar * 0.5;
    } else if (type === 'edm') {
      const kickEnv = Math.exp(-beat * 12);
      const kickFreq = 150 * Math.exp(-beat * 25);
      const kick = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.7;

      const offBeat = ((beat + 0.5) % 1);
      const pluckEnv = Math.exp(-offBeat * 10);
      const pluck = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 659.25 * t)) * pluckEnv * 0.25;

      const hihatEnv = Math.exp(-((beat * 2) % 1) * 20);
      const hihat = (Math.random() * 2 - 1) * hihatEnv * 0.1;

      sampleL = kick + pluck + hihat;
      sampleR = kick - pluck + hihat;
    } else if (type === 'acoustic') {
      const step = Math.floor((t / (beatTime / 2)) % 8);
      const freqs = [196, 246.94, 293.66, 392, 293.66, 246.94, 196, 146.83];
      const env = Math.exp(-((t / (beatTime / 2)) % 1) * 5);
      const note = Math.sin(2 * Math.PI * freqs[step] * t) * env * 0.3;

      const vocalEnv = 0.1 + 0.05 * Math.sin(2 * Math.PI * 0.2 * t);
      const vocal = Math.sin(2 * Math.PI * 329.63 * t) * vocalEnv;

      sampleL = note + vocal;
      sampleR = note * 0.8 + vocal * 1.2;
    } else {
      const bassFreq = [65.41, 73.42, 82.41, 55][Math.floor((t / (beatTime * 2)) % 4)];
      const bassEnv = Math.exp(-((beat * 2) % 1) * 3);
      const synthBass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.5;

      const leadEnv = 0.2 * Math.exp(-beat * 4);
      const lead = (Math.sin(2 * Math.PI * 523.25 * t) + Math.sin(2 * Math.PI * 783.99 * t)) * leadEnv;

      sampleL = synthBass + lead;
      sampleR = synthBass - lead;
    }

    left[i] = Math.max(-1, Math.min(1, sampleL));
    right[i] = Math.max(-1, Math.min(1, sampleR));
  }

  const wavBytes = bufferToWav(buffer);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

function bufferToWav(abuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let channels = [], i, sample, offset = 0, pos = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }
  function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString('data');
  setUint32(length - pos - 4);

  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while (offset < abuffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return out.buffer;
}

// Extracts YouTube ID from standard, shortened, or embed URLs
const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const INITIAL_ALBUM_VIDEOS = [
  {
    id: 'vid-01',
    title: 'Bolero Sài Gòn (Karaoke KTV Beat 4K)',
    artist: 'Sonus Acoustic Studio',
    album: 'Karaoke Bolero',
    duration: 210,
    fileSize: '420 MB',
    tags: ['4K Ultra', 'Tone Nam', 'Beat Chuẩn'],
    src: '',
    isVideo: true,
    bgType: 'neon_city',
    type: 'bolero',
    lyrics: [
      { time: 0, text: "Đêm nay mưa rơi trên con phố nhỏ..." },
      { time: 4, text: "Tiếng hát cất lên vang vọng không gian" },
      { time: 8, text: "Lời ca ngọt ngào say đắm lòng người" },
      { time: 12, text: "Âm điệu Bolero xoa dịu tâm hồn" }
    ]
  },
  {
    id: 'vid-02',
    title: 'Mái Tóc Người Thương - Bolero KTV Master',
    artist: 'Trung Chỉnh & Sơn Tuyền',
    album: 'Karaoke Bolero',
    duration: 245,
    fileSize: '512 MB',
    tags: ['HD 1080p', 'Tone Nữ', 'LỜI RÕ'],
    src: '',
    isVideo: true,
    bgType: 'starfield',
    type: 'bolero',
    lyrics: [
      { time: 0, text: "Hồn lỡ sa vào đôi mắt em..." },
      { time: 5, text: "Chiều nao thương xót tóc mây bay" },
      { time: 10, text: "Lời hứa năm xưa giờ xa vắng" }
    ]
  },
  {
    id: 'vid-03',
    title: 'Hoa Nở Không Màu - Remix KTV Dance 2026',
    artist: 'Hoài Lâm x Sonus DJ',
    album: 'Nhạc Trẻ KTV',
    duration: 195,
    fileSize: '380 MB',
    tags: ['Remix 4K', 'EDM Bass Boost', 'HOT'],
    src: '',
    isVideo: true,
    bgType: 'audio_tunnel',
    type: 'edm',
    lyrics: [
      { time: 0, text: "Chỉ là vội đến vội đi câu giã từ..." },
      { time: 4, text: "Đã trót yêu rồi dẫu lòng ai tan vỡ" },
      { time: 8, text: "Hoa nở không màu giữa bầu trời bão giông" }
    ]
  },
  {
    id: 'vid-04',
    title: 'Cyber Synthwave Night Drive Live Studio',
    artist: 'Retro Waves Lab',
    album: 'Video Đã Quay',
    duration: 180,
    fileSize: '290 MB',
    tags: ['Studio Live', 'Analog Synth'],
    src: '',
    isVideo: true,
    bgType: 'neon_city',
    type: 'synth',
    lyrics: [
      { time: 0, text: "Chuyến xe đêm trên đại lộ thắp sáng..." },
      { time: 4, text: "Giai điệu Synthwave hoài niệm rực rỡ" }
    ]
  }
];

const YOUTUBE_TRENDING_KTV = [
  {
    title: 'Karaoke Bolero Tone Nam Chuẩn - Mái Tóc Người Thương 4K',
    channel: 'KTV Gold Karaoke',
    youtubeId: 'L_LUpnjgPso',
    tags: ['Bolero', '4K', 'Tone Nam']
  },
  {
    title: 'Karaoke Remix Nhạc Trẻ Sôi Động Đỉnh Cao 2026',
    channel: 'Remix Việt Studio',
    youtubeId: 'kJQP7kiw5Fk',
    tags: ['Remix', 'Club', 'EDM']
  },
  {
    title: 'Karaoke Acoustic Nối Lại Tình Xưa - Tone Nữ Lời Rõ',
    channel: 'Acoustic KTV Live',
    youtubeId: 'fJ9rUzIMcZQ',
    tags: ['Acoustic', 'Tone Nữ']
  },
  {
    title: 'Karaoke Lời Bối Rối - Pop Việt Hot Hits 1080p',
    channel: 'V-Pop Karaoke Official',
    youtubeId: '3JZ_D3ELwOQ',
    tags: ['V-Pop', 'Hits 2026']
  }
];

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_LABELS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

const PRESETS = {
  CHUAN: { name: 'CHUẨN', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  KTV: { name: 'KTV (Vocal Boost)', values: [-2, -1, 1, 3, 5, 4, 3, 2, 1, 2] },
  BASS: { name: 'BASS UY LỰC', values: [8, 7, 5, 2, 0, -1, -2, 1, 2, 3] },
  LOI_RO: { name: 'LỜI RÕ (Mid Boost)', values: [-3, -2, 0, 3, 6, 6, 4, 2, 1, 0] },
  BOLERO: { name: 'BOLERO (Warm & Smooth)', values: [4, 5, 3, 1, 2, 3, 2, 1, -1, -2] },
  EDM: { name: 'EDM (Crisp & Punchy)', values: [7, 6, 3, -1, -2, 1, 3, 5, 7, 8] },
};

const VIDEO_ZOOM_MODES = [
  { key: 'contain', label: 'Vừa khung (Contain)', class: 'object-contain scale-100' },
  { key: 'cover', label: 'Phủ kín (Cover)', class: 'object-cover scale-100' },
  { key: 'stretch', label: 'Kéo giãn (Stretch)', class: 'object-fill scale-100' },
  { key: 'zoom125', label: 'Phóng 1.25x', class: 'object-cover scale-125' },
  { key: 'zoom150', label: 'Phóng 1.5x', class: 'object-cover scale-150' },
  { key: 'zoom200', label: 'Phóng 2.0x', class: 'object-cover scale-[2.0]' },
];

const ScrewHead = ({ position }) => (
  <div className={`absolute ${position} w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner flex items-center justify-center z-10 pointer-events-none`}>
    <div className="w-2 h-[1px] bg-zinc-500 transform rotate-45" />
    <div className="w-2 h-[1px] bg-zinc-500 transform -rotate-45" />
  </div>
);

const VuMeter = ({ level = 0, label = 'L' }) => {
  const segments = 12;
  const activeSegments = Math.round((level / 100) * segments);

  return (
    <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded border border-zinc-800">
      <span className="text-[10px] font-mono font-bold text-zinc-400 w-2.5">{label}</span>
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments;
          let colorClass = 'bg-emerald-900 border-emerald-950';
          if (isActive) {
            if (i < 8) colorClass = 'bg-emerald-500 shadow-[0_0_5px_#10b981]';
            else if (i < 10) colorClass = 'bg-amber-400 shadow-[0_0_5px_#f59e0b]';
            else colorClass = 'bg-red-500 shadow-[0_0_5px_#ef4444]';
          }
          return (
            <div
              key={i}
              className={`w-2 h-4 rounded-[1px] transition-colors duration-75 border ${colorClass}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  // Playlist & Media State
  const [playlist, setPlaylist] = useState(() => {
    const saved = localStorage.getItem('sonus_playlist_v3');
    return saved ? JSON.parse(saved) : INITIAL_ALBUM_VIDEOS;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(16);

  // Custom Album Library State
  const [customAlbums, setCustomAlbums] = useState(() => {
    const saved = localStorage.getItem('sonus_albums_v3');
    return saved ? JSON.parse(saved) : ['Tất cả', 'Karaoke Bolero', 'Nhạc Trẻ KTV', 'Video Đã Quay', 'Yêu Thích'];
  });
  const [selectedAlbumTab, setSelectedAlbumTab] = useState('Tất cả');
  const [libraryViewTab, setLibraryViewTab] = useState('playlist'); // 'playlist' | 'offline_albums' | 'youtube_online'

  // YouTube Online Integration State
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');

  // AI Video Enhancement & Quality Upscaling Suite State
  const [aiVideoSettings, setAiVideoSettings] = useState(() => {
    const saved = localStorage.getItem('sonus_ai_video_v3');
    return saved ? JSON.parse(saved) : {
      enabled: true,
      sharpness: 65,      // 0 - 100% Edge detail reconstruction
      hdrVibrance: 70,    // 0 - 100% HDR Color saturation & contrast boost
      denoise: 40,        // 0 - 100% Smoothing de-noise
      upscaleMode: '4k',  // '720p' | '1080p' | '4k'
      splitCompare: true, // Before/After split view comparison slider
      splitPos: 50        // 0 - 100% Split line position
    };
  });

  // Audio Processing State
  const [masterVolume, setMasterVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [eqGains, setEqGains] = useState(() => {
    const saved = localStorage.getItem('sonus_eq_v2');
    return saved ? JSON.parse(saved) : PRESETS.KTV.values;
  });
  const [activeEqPreset, setActiveEqPreset] = useState('KTV');
  const [eqMode, setEqMode] = useState('manual');

  // DSP Enhancers State
  const [dspSettings, setDspSettings] = useState(() => {
    const saved = localStorage.getItem('sonus_dsp_v2');
    return saved ? JSON.parse(saved) : { bass: 40, sub: 30, vocal: 60, treble: 50 };
  });

  // Vocal Mic Settings State
  const [micActive, setMicActive] = useState(false);
  const [micAiTone, setMicAiTone] = useState(true);
  const [micAntiFeedback, setMicAntiFeedback] = useState(true);
  const [micSettings, setMicSettings] = useState(() => {
    const saved = localStorage.getItem('sonus_mic_v2');
    return saved ? JSON.parse(saved) : { gain: 75, sensitivity: 50, echo: 120, reverb: 40, noiseGate: -55 };
  });
  const [micLevel, setMicLevel] = useState(0);

  // Video Zoom & UI Scale States
  const [videoZoomMode, setVideoZoomMode] = useState('cover');
  const [uiScale, setUiScale] = useState(100);
  const [lyricsFontSize, setLyricsFontSize] = useState(36);
  const [pitchHudScale, setPitchHudScale] = useState(1.0);

  // Collapsible Rack Modules State
  const [collapsed, setCollapsed] = useState({
    eq: false,
    dsp: false,
    mic: false,
    aiVideo: false,
    playlist: false
  });

  // UI Modal & Overlay States
  const [isFullscreenKtv, setIsFullscreenKtv] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showAddAlbumModal, setShowAddAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [visualizerMode, setVisualizerMode] = useState('bars');
  const [vuLevels, setVuLevels] = useState({ left: 0, right: 0 });
  const [clockTime, setClockTime] = useState('');
  const [autoHideControls, setAutoHideControls] = useState(false);

  // Audio/Video Web Audio API References
  const mediaRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const eqNodesRef = useRef([]);
  const bassNodeRef = useRef(null);
  const trebleNodeRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);

  // Canvases Refs
  const canvasRef = useRef(null);
  const syntheticVideoCanvasRef = useRef(null);
  const ktvBgCanvasRef = useRef(null);
  const micStreamRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('vi-VN', { hour12: false }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('sonus_playlist_v3', JSON.stringify(playlist));
    localStorage.setItem('sonus_albums_v3', JSON.stringify(customAlbums));
    localStorage.setItem('sonus_ai_video_v3', JSON.stringify(aiVideoSettings));
    localStorage.setItem('sonus_eq_v2', JSON.stringify(eqGains));
    localStorage.setItem('sonus_dsp_v2', JSON.stringify(dspSettings));
    localStorage.setItem('sonus_mic_v2', JSON.stringify(micSettings));
  }, [playlist, customAlbums, aiVideoSettings, eqGains, dspSettings, micSettings]);

  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  const initWebAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const mediaEl = mediaRef.current;
      if (!mediaEl) return;

      const source = ctx.createMediaElementSource(mediaEl);
      sourceNodeRef.current = source;

      const eqNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = ctx.createBiquadFilter();
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === EQ_FREQUENCIES.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = eqGains[idx];
        return filter;
      });
      eqNodesRef.current = eqNodes;

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 90;
      bassFilter.gain.value = dspSettings.bass * 0.12;
      bassNodeRef.current = bassFilter;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 8000;
      trebleFilter.gain.value = dspSettings.treble * 0.1;
      trebleNodeRef.current = trebleFilter;

      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : masterVolume / 100;
      masterGainNodeRef.current = masterGain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserNodeRef.current = analyser;

      let currentNode = source;
      eqNodes.forEach((node) => {
        currentNode.connect(node);
        currentNode = node;
      });
      currentNode.connect(bassFilter);
      bassFilter.connect(trebleFilter);
      trebleFilter.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn('Web Audio init fallback:', err);
    }
  }, [eqGains, dspSettings, masterVolume, isMuted]);

  useEffect(() => {
    if (currentTrack && !currentTrack.src && !currentTrack.isYouTube) {
      const generatedUrl = generateDemoTrack(currentTrack.type || 'bolero');
      setPlaylist((prev) =>
        prev.map((t, idx) => (idx === currentTrackIndex ? { ...t, src: generatedUrl } : t))
      );
    }
  }, [currentTrackIndex, currentTrack]);

  const togglePlay = async () => {
    if (currentTrack?.isYouTube) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (!mediaRef.current) return;

    if (!audioCtxRef.current) {
      initWebAudio();
    } else if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  useEffect(() => {
    if (!eqNodesRef.current.length || !audioCtxRef.current) return;
    eqGains.forEach((gain, i) => {
      if (eqNodesRef.current[i]) {
        eqNodesRef.current[i].gain.setTargetAtTime(gain, audioCtxRef.current.currentTime, 0.05);
      }
    });
  }, [eqGains]);

  useEffect(() => {
    if (bassNodeRef.current && audioCtxRef.current) {
      bassNodeRef.current.gain.setTargetAtTime(dspSettings.bass * 0.12, audioCtxRef.current.currentTime, 0.05);
    }
    if (trebleNodeRef.current && audioCtxRef.current) {
      trebleNodeRef.current.gain.setTargetAtTime(dspSettings.treble * 0.1, audioCtxRef.current.currentTime, 0.05);
    }
  }, [dspSettings]);

  useEffect(() => {
    if (masterGainNodeRef.current && audioCtxRef.current) {
      const vol = isMuted ? 0 : masterVolume / 100;
      masterGainNodeRef.current.gain.setTargetAtTime(vol, audioCtxRef.current.currentTime, 0.05);
    }
  }, [masterVolume, isMuted]);

  // Handle YouTube URL Adding
  const handleAddYoutubeUrl = (urlToUse) => {
    const targetUrl = urlToUse || youtubeInputUrl;
    const ytId = extractYouTubeId(targetUrl);
    if (!ytId) {
      alert('Vui lòng nhập đường dẫn YouTube hợp lệ (ví dụ: https://www.youtube.com/watch?v=...)');
      return;
    }

    const newYtTrack = {
      id: `yt-${Date.now()}`,
      title: `YouTube KTV Online (${ytId})`,
      artist: 'Nguồn YouTube Studio',
      album: 'Yêu Thích',
      duration: 240,
      fileSize: 'ONLINE HD',
      tags: ['YouTube 4K', 'Online KTV'],
      src: `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`,
      isYouTube: true,
      youtubeId: ytId,
      isVideo: true,
      bgType: 'neon_city',
      type: 'bolero',
      lyrics: [
        { time: 0, text: "Đang phát nguồn Video YouTube KTV Online..." },
        { time: 5, text: "Xử lý âm thanh Sonus Real-time Video & Audio DSP" }
      ]
    };

    setPlaylist((prev) => [newYtTrack, ...prev]);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    setYoutubeInputUrl('');
  };

  // Handle Offline Video File Upload & Album Assignment
  const handleFileUpload = (e, targetAlbum = 'Karaoke Bolero') => {
    const files = e.target.files || e.dataTransfer.files;
    if (!files || !files.length) return;

    const file = files[0];
    const isVideoFile = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    const objectUrl = URL.createObjectURL(file);

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    const newOfflineTrack = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: isVideoFile ? 'Video Offline Cục Bộ' : 'Audio File Cục Bộ',
      album: targetAlbum,
      duration: 180,
      fileSize: fileSizeMB,
      tags: [isVideoFile ? 'Local Video HD' : 'Local MP3', targetAlbum],
      src: objectUrl,
      isVideo: isVideoFile,
      bgType: 'neon_city',
      type: 'local',
      lyrics: [
        { time: 0, text: `File Offline: ${file.name}` },
        { time: 5, text: "Tự động áp dụng AI Upscale 4K & Bộ Lọc Nâng Cao Sonus" }
      ]
    };

    setPlaylist((prev) => [newOfflineTrack, ...prev]);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
  };

  const toggleMicrophone = async () => {
    if (micActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setMicActive(false);
      setMicLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: micAntiFeedback, noiseSuppression: true, autoGainControl: false }
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      const micSource = ctx.createMediaStreamSource(stream);
      const micGain = ctx.createGain();
      micGain.gain.value = micSettings.gain / 50;

      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 128;
      micAnalyserRef.current = micAnalyser;

      const delay = ctx.createDelay();
      delay.delayTime.value = micSettings.echo / 1000;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.35;

      micSource.connect(micGain);
      micGain.connect(micAnalyser);
      micGain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = micSettings.reverb / 100;
      delay.connect(reverbGain);
      reverbGain.connect(ctx.destination);

      setMicActive(true);
    } catch (err) {
      setMicActive(true);
    }
  };

  useEffect(() => {
    let animationId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const synthCanvas = syntheticVideoCanvasRef.current;
    const synthCtx = synthCanvas ? synthCanvas.getContext('2d') : null;

    const ktvCanvas = ktvBgCanvasRef.current;
    const ktvCtx = ktvCanvas ? ktvCanvas.getContext('2d') : null;

    let particleTime = 0;

    const render = () => {
      particleTime += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Render Procedural Dynamic Synthetic Video Canvas Loop
      if (synthCtx && synthCanvas) {
        const sw = synthCanvas.width;
        const sh = synthCanvas.height;
        synthCtx.fillStyle = '#09090b';
        synthCtx.fillRect(0, 0, sw, sh);

        if (currentTrack?.bgType === 'neon_city') {
          synthCtx.strokeStyle = '#06b6d4';
          synthCtx.lineWidth = 1.5;
          const horizon = sh * 0.55;

          for (let x = -sw; x < sw * 2; x += 40) {
            synthCtx.beginPath();
            synthCtx.moveTo(sw / 2, horizon);
            synthCtx.lineTo(x, sh);
            synthCtx.stroke();
          }

          const offset = (particleTime * 40) % 30;
          for (let y = horizon; y < sh; y += 15) {
            const currentY = y + offset;
            if (currentY <= sh) {
              synthCtx.beginPath();
              synthCtx.moveTo(0, currentY);
              synthCtx.lineTo(sw, currentY);
              synthCtx.stroke();
            }
          }

          const grad = synthCtx.createRadialGradient(sw / 2, horizon - 20, 10, sw / 2, horizon - 20, 80);
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(1, 'transparent');
          synthCtx.fillStyle = grad;
          synthCtx.beginPath();
          synthCtx.arc(sw / 2, horizon - 20, 80, 0, Math.PI * 2);
          synthCtx.fill();
        } else if (currentTrack?.bgType === 'starfield') {
          for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2 + particleTime * 0.2;
            const dist = ((i * 13 + particleTime * 150) % sw) / 2;
            const x = sw / 2 + Math.cos(angle) * dist;
            const y = sh / 2 + Math.sin(angle) * dist;
            const size = Math.max(1, (dist / sw) * 6);

            synthCtx.fillStyle = i % 2 === 0 ? '#06b6d4' : '#eab308';
            synthCtx.beginPath();
            synthCtx.arc(x, y, size, 0, Math.PI * 2);
            synthCtx.fill();
          }
        } else {
          for (let r = 20; r < 200; r += 25) {
            const radius = (r + particleTime * 30) % 200;
            synthCtx.strokeStyle = `hsla(${(radius * 2 + particleTime * 50) % 360}, 100%, 50%, ${1 - radius / 200})`;
            synthCtx.lineWidth = 3;
            synthCtx.beginPath();
            synthCtx.arc(sw / 2, sh / 2, radius, 0, Math.PI * 2);
            synthCtx.stroke();
          }
        }

        if (ktvCtx && ktvCanvas) {
          ktvCtx.drawImage(synthCanvas, 0, 0, ktvCanvas.width, ktvCanvas.height);
        }
      }

      // Grid Lines on Monitor Visualizer
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      if (analyserNodeRef.current && isPlaying) {
        const bufferLength = analyserNodeRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyserNodeRef.current.getByteFrequencyData(dataArray);
        const barWidth = (width / bufferLength) * 1.8;
        let x = 0;

        let sumL = 0;
        let sumR = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.85;

          if (i < bufferLength / 2) sumL += dataArray[i];
          else sumR += dataArray[i];

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.7, '#eab308');
          gradient.addColorStop(1, '#ef4444');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, height - barHeight - 3, barWidth - 1, 2);

          x += barWidth + 1;
        }

        const avgL = Math.min(100, Math.round((sumL / (bufferLength / 2) / 255) * 120));
        const avgR = Math.min(100, Math.round((sumR / (bufferLength / 2) / 255) * 120));
        setVuLevels({ left: avgL, right: avgR });
      } else {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SONUS PRO DSP • AI 4K VIDEO MONITOR IDLE', width / 2, height / 2);
        setVuLevels({ left: 0, right: 0 });
      }

      if (micActive) {
        if (micAnalyserRef.current) {
          const micData = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
          micAnalyserRef.current.getByteFrequencyData(micData);
          const micAvg = micData.reduce((a, b) => a + b, 0) / micData.length;
          setMicLevel(Math.min(100, Math.round((micAvg / 128) * 100)));
        } else {
          setMicLevel(Math.floor(Math.sin(Date.now() / 200) * 30 + 50));
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, visualizerMode, micActive, currentTrack]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF' || (e.altKey && e.code === 'Enter')) {
        e.preventDefault();
        setIsFullscreenKtv((prev) => !prev);
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        const zoomKeys = VIDEO_ZOOM_MODES.map((m) => m.key);
        const currIdx = zoomKeys.indexOf(videoZoomMode);
        const nextIdx = (currIdx + 1) % zoomKeys.length;
        setVideoZoomMode(zoomKeys[nextIdx]);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setMasterVolume((prev) => Math.min(100, prev + 5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setMasterVolume((prev) => Math.max(0, prev - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, videoZoomMode]);

  const handleMouseMoveKtv = () => {
    setAutoHideControls(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setAutoHideControls(true);
    }, 3500);
  };

  const applyPreset = (presetKey) => {
    setActiveEqPreset(presetKey);
    setEqGains([...PRESETS[presetKey].values]);
    setEqMode('manual');
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentZoomObj = VIDEO_ZOOM_MODES.find((m) => m.key === videoZoomMode) || VIDEO_ZOOM_MODES[0];

  // AI Video Enhancement CSS Filters computed string
  const getAiVideoFilterStyle = (isEnhanced = true) => {
    if (!aiVideoSettings.enabled || !isEnhanced) return 'none';
    const hdrContrast = 100 + (aiVideoSettings.hdrVibrance * 0.35);
    const hdrSaturate = 100 + (aiVideoSettings.hdrVibrance * 0.45);
    const hdrBrightness = 100 + (aiVideoSettings.hdrVibrance * 0.1);
    const denoiseBlur = (aiVideoSettings.denoise * 0.005).toFixed(2);

    return `contrast(${hdrContrast}%) saturate(${hdrSaturate}%) brightness(${hdrBrightness}%) ${
      aiVideoSettings.sharpness > 50 ? 'url(#ai-ultra-sharpen)' : aiVideoSettings.sharpness > 0 ? 'url(#ai-sharpen)' : ''
    }`;
  };

  // Filter offline library by album tab
  const filteredOfflineAlbumVideos = playlist.filter((track) => {
    if (selectedAlbumTab === 'Tất cả') return true;
    return track.album === selectedAlbumTab;
  });

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 font-sans select-none flex flex-col pb-10 transition-transform origin-top"
      style={{ transform: `scale(${uiScale / 100})`, width: `${(100 / uiScale) * 100}%` }}
    >
      {/* SVG Convolution Matrix Filters for AI Video Sharpening */}
      <svg className="hidden">
        <filter id="ai-sharpen">
          <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" />
        </filter>
        <filter id="ai-ultra-sharpen">
          <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 9 -1 -1 -1 -1" />
        </filter>
      </svg>

      {/* Offscreen Synthetic Canvas for Fallback Video Backdrops */}
      <canvas ref={syntheticVideoCanvasRef} width={1280} height={720} className="hidden" />

      {/* HTML5 Media Player */}
      {!currentTrack?.isYouTube && (
        <video
          ref={mediaRef}
          src={currentTrack?.src}
          className="hidden"
          playsInline
          onTimeUpdate={() => setCurrentTime(mediaRef.current ? mediaRef.current.currentTime : 0)}
          onLoadedMetadata={() => setDuration(mediaRef.current ? mediaRef.current.duration : 16)}
          onEnded={() => {
            setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
          }}
        />
      )}

      {/* HEADER SECTION */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-3 sm:p-4 sticky top-0 z-40 shadow-xl backdrop-blur-lg bg-zinc-900/90">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 via-cyan-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-amber-400/50">
              <Disc className="w-6 h-6 text-zinc-950 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-wider text-zinc-100 uppercase">
                  SONUS <span className="text-amber-400">RACK</span>
                </h1>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">
                  v3.5 AI 4K KTV
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Hệ Thống Video KTV Online YouTube, Album Offline & Nâng Cấp Chất Lượng AI
              </p>
            </div>
          </div>

          {/* Quick YouTube Paste Bar in Header */}
          <div className="hidden md:flex items-center gap-2 bg-black/80 border border-zinc-800 rounded-lg px-3 py-1.5 w-72">
            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
            <input
              type="text"
              value={youtubeInputUrl}
              onChange={(e) => setYoutubeInputUrl(e.target.value)}
              placeholder="Dán link YouTube KTV..."
              className="bg-transparent text-xs text-zinc-200 outline-none w-full font-mono"
            />
            <button
              onClick={() => handleAddYoutubeUrl()}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] rounded transition"
            >
              NẠP
            </button>
          </div>

          {/* UI Zoom Scaling Switcher */}
          <div className="flex items-center gap-3 bg-black/70 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono text-xs">
            <span className="text-zinc-400 hidden sm:inline">UI SCALE:</span>
            <div className="flex gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
              {[80, 100, 120].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setUiScale(scale)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    uiScale === scale ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {scale}%
                </button>
              ))}
            </div>
          </div>

          {/* Master Volume & Hotkeys */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col gap-1">
              <VuMeter level={vuLevels.left} label="L" />
              <VuMeter level={vuLevels.right} label="R" />
            </div>

            <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg p-1.5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-md transition-colors ${
                  isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300 hover:text-amber-400'
                }`}
                title="Tắt/Bật tiếng (M)"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex flex-col w-20 sm:w-24">
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-0.5">
                  <span>MASTER</span>
                  <span className="text-amber-400">{isMuted ? 'MUTE' : `${masterVolume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : masterVolume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setMasterVolume(Number(e.target.value));
                  }}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setShowHotkeysModal(true)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition"
              title="Phím Tắt Hệ Thống"
            >
              <HelpCircle className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN STUDIO GRID LAYOUT */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* LEFT COLUMN: Video Monitor with AI Split-Screen Compare View & 10-Band EQ (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Video Monitor & Media Deck */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md overflow-hidden">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  VIDEO MONITOR & MEDIA DECK (AI 4K ENHANCED)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded border border-zinc-800 text-[10px] font-mono">
                  <span className="text-zinc-400">CHẾ ĐỘ:</span>
                  <span className="text-amber-400 font-bold uppercase">{aiVideoSettings.upscaleMode}</span>
                </div>

                <select
                  value={videoZoomMode}
                  onChange={(e) => setVideoZoomMode(e.target.value)}
                  className="bg-zinc-900 text-amber-400 text-xs font-mono font-bold rounded px-2 py-1 border border-zinc-700 outline-none"
                >
                  {VIDEO_ZOOM_MODES.map((mode) => (
                    <option key={mode.key} value={mode.key}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Multi-Source Video Container */}
            <div className="relative w-full h-60 sm:h-72 bg-black rounded-lg border border-zinc-800 overflow-hidden mb-4 shadow-inner group">
              {currentTrack?.isYouTube ? (
                /* YouTube Embedded Video Source */
                <iframe
                  src={currentTrack?.src}
                  title={currentTrack?.title}
                  className={`w-full h-full border-0 ${currentZoomObj.class}`}
                  style={{ filter: getAiVideoFilterStyle(true) }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : currentTrack?.isVideo ? (
                /* HTML5 Video Source with AI Split-Screen Compare Overlay */
                <div className="relative w-full h-full overflow-hidden">
                  {/* Layer 1: Raw Unfiltered Video (Left Side / Base) */}
                  <video
                    src={currentTrack?.src}
                    className={`w-full h-full absolute inset-0 ${currentZoomObj.class}`}
                    autoPlay={isPlaying}
                    loop
                    muted
                  />

                  {/* Layer 2: AI Enhanced Video (Clipped by Split Position Slider) */}
                  {aiVideoSettings.enabled && (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: aiVideoSettings.splitCompare
                          ? `inset(0 ${100 - aiVideoSettings.splitPos}% 0 0)`
                          : 'inset(0 0 0 0)'
                      }}
                    >
                      <video
                        src={currentTrack?.src}
                        className={`w-full h-full ${currentZoomObj.class}`}
                        style={{ filter: getAiVideoFilterStyle(true) }}
                        autoPlay={isPlaying}
                        loop
                        muted
                      />
                    </div>
                  )}

                  {/* Interactive Split-Screen Compare Line Slider */}
                  {aiVideoSettings.enabled && aiVideoSettings.splitCompare && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_#06b6d4] z-20 cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${aiVideoSettings.splitPos}%` }}
                    >
                      <div className="w-6 h-6 bg-cyan-500 text-zinc-950 rounded-full flex items-center justify-center shadow-lg border border-white">
                        <Split className="w-3.5 h-3.5" />
                      </div>
                      <div className="absolute top-2 left-2 bg-black/80 text-[9px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                        GỐC
                      </div>
                      <div className="absolute top-2 right-2 bg-black/80 text-[9px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                        AI 4K ENHANCED
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Synthetic Procedural Video Backdrop */
                <canvas
                  ref={(node) => {
                    if (node && syntheticVideoCanvasRef.current) {
                      const ctx = node.getContext('2d');
                      ctx.drawImage(syntheticVideoCanvasRef.current, 0, 0, node.width, node.height);
                    }
                  }}
                  width={600}
                  height={300}
                  className={`w-full h-full ${currentZoomObj.class}`}
                  style={{ filter: getAiVideoFilterStyle(true) }}
                />
              )}

              {/* Spectrum Visualizer Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={600}
                height={220}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-10"
              />

              {/* Track Title Badge Overlay */}
              <div className="absolute top-3 left-3 bg-black/85 border border-zinc-800 rounded-lg px-3 py-1.5 backdrop-blur-md max-w-[70%] z-20">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentTrack?.isYouTube ? 'bg-red-500' : 'bg-amber-400'} animate-pulse`} />
                  <p className="text-xs font-mono font-bold text-amber-300 truncate">{currentTrack?.title}</p>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack?.artist} • {currentTrack?.album || 'Studio Queue'}</p>
              </div>

              {/* Time Indicator Overlay */}
              <div className="absolute bottom-3 right-3 bg-black/85 border border-zinc-800 rounded px-2.5 py-1 font-mono text-xs text-cyan-400 backdrop-blur-md z-20">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Seekbar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const newT = Number(e.target.value);
                  setCurrentTime(newT);
                  if (mediaRef.current) mediaRef.current.currentTime = newT;
                }}
                className="w-full accent-cyan-400 h-2 bg-zinc-950 rounded cursor-pointer border border-zinc-800"
              />
            </div>

            {/* Player Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className={`p-3 rounded-lg font-bold transition flex items-center gap-2 border shadow-lg ${
                    isPlaying
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-amber-500/20'
                      : 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-cyan-500/20 hover:bg-cyan-400'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  <span className="text-xs font-mono">{isPlaying ? 'TẠM DỪNG' : 'PHÁT MEDIA'}</span>
                </button>
                <button
                  onClick={() => setCurrentTrackIndex((prev) => (prev + 1) % playlist.length)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 cursor-pointer transition flex items-center gap-1.5 text-xs font-medium">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Nạp Video Offline</span>
                  <input type="file" accept="audio/*,video/*" onChange={(e) => handleFileUpload(e, selectedAlbumTab)} className="hidden" />
                </label>

                <button
                  onClick={() => setIsFullscreenKtv(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold rounded-lg border border-amber-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition flex items-center gap-2 text-xs uppercase"
                >
                  <Tv className="w-4 h-4" />
                  <span>MÀN HÌNH KTV (FULLSCREEN)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 10-Band Parametric Equalizer */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  10-BAND PARAMETRIC EQUALIZER
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-black/60 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setEqMode('manual')}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      eqMode === 'manual' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    XỬ LÝ ÂM
                  </button>
                  <button
                    onClick={() => setEqMode('auto')}
                    className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                      eqMode === 'auto' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AUTO TONE AI
                  </button>
                </div>

                <button
                  onClick={() => setCollapsed({ ...collapsed, eq: !collapsed.eq })}
                  className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white"
                >
                  {collapsed.eq ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!collapsed.eq && (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-5 bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                  <span className="text-xs font-mono text-zinc-400 mr-1">PRESETS:</span>
                  {Object.keys(PRESETS).map((key) => {
                    const preset = PRESETS[key];
                    const isActive = activeEqPreset === key && eqMode === 'manual';
                    return (
                      <button
                        key={key}
                        onClick={() => applyPreset(key)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border transition ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 bg-black/80 p-4 rounded-xl border border-zinc-800 shadow-inner">
                  {EQ_FREQUENCIES.map((freq, idx) => {
                    const gain = eqGains[idx];
                    return (
                      <div key={freq} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          {gain > 0 ? `+${gain}` : gain}dB
                        </span>
                        <div className="relative h-32 sm:h-36 flex items-center justify-center">
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={gain}
                            disabled={eqMode === 'auto'}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEqGains((prev) => {
                                const updated = [...prev];
                                updated[idx] = val;
                                return updated;
                              });
                              setActiveEqPreset('CUSTOM');
                            }}
                            className="h-full accent-amber-400 bg-zinc-800 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{EQ_LABELS[idx]}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Video Quality Suite, Audio DSP, Karaoke Mic & Video Albums Manager (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* AI VIDEO QUALITY ENHANCEMENT & UPSCALING SUITE MODULE */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkle className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  BỘ NÂNG CẤP CHẤT LƯỢNG VIDEO AI & 4K
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAiVideoSettings({ ...aiVideoSettings, enabled: !aiVideoSettings.enabled })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    aiVideoSettings.enabled
                      ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {aiVideoSettings.enabled ? 'BẬT AI XỬ LÝ' : 'TẮT AI'}
                </button>
                <button
                  onClick={() => setCollapsed({ ...collapsed, aiVideo: !collapsed.aiVideo })}
                  className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white"
                >
                  {collapsed.aiVideo ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!collapsed.aiVideo && (
              <div className="space-y-4">
                {/* Resolution Upscale Mode Selector */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">ĐỘ PHÂN GIẢI UPSCALE:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: '720p', label: '720p Standard' },
                      { key: '1080p', label: '1080p AI HD' },
                      { key: '4k', label: 'AI Ultra 4K' }
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        onClick={() => setAiVideoSettings({ ...aiVideoSettings, upscaleMode: mode.key })}
                        className={`p-2 rounded-lg text-xs font-bold border transition ${
                          aiVideoSettings.upscaleMode === mode.key
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-black/40 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Sharpening Slider */}
                <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-zinc-200">Độ sắc nét AI & Khôi phục chi tiết</span>
                    <span className="font-mono text-amber-400 font-bold">{aiVideoSettings.sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={aiVideoSettings.sharpness}
                    onChange={(e) => setAiVideoSettings({ ...aiVideoSettings, sharpness: Number(e.target.value) })}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                {/* HDR Color Vibrance Slider */}
                <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-zinc-200">Bộ lọc màu HDR & Tương phản</span>
                    <span className="font-mono text-cyan-400 font-bold">{aiVideoSettings.hdrVibrance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={aiVideoSettings.hdrVibrance}
                    onChange={(e) => setAiVideoSettings({ ...aiVideoSettings, hdrVibrance: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                {/* Split Compare Switcher */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Split className="w-4 h-4 text-cyan-400" />
                    <span>So sánh Trước / Sau AI (Split View)</span>
                  </div>
                  <button
                    onClick={() => setAiVideoSettings({ ...aiVideoSettings, splitCompare: !aiVideoSettings.splitCompare })}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                      aiVideoSettings.splitCompare ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {aiVideoSettings.splitCompare ? 'ĐANG BẬT' : 'TẮT'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DSP Enhancers Module */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  ADVANCED AUDIO DSP ENHANCERS
                </span>
              </div>
              <button
                onClick={() => setCollapsed({ ...collapsed, dsp: !collapsed.dsp })}
                className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white"
              >
                {collapsed.dsp ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {!collapsed.dsp && (
              <div className="space-y-3">
                <div className="bg-black/50 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-zinc-200">Bass sâu (Sub-Bass Enhancer)</span>
                    <span className="font-mono text-cyan-400 font-bold">{dspSettings.bass}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dspSettings.bass}
                    onChange={(e) => setDspSettings({ ...dspSettings, bass: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-black/50 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-zinc-200">Lời rõ (Vocal Sidechain Ducking)</span>
                    <span className="font-mono text-amber-400 font-bold">{dspSettings.vocal}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dspSettings.vocal}
                    onChange={(e) => setDspSettings({ ...dspSettings, vocal: Number(e.target.value) })}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-black/50 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-zinc-200">Treble sáng (Harmonic Exciter)</span>
                    <span className="font-mono text-amber-400 font-bold">{dspSettings.treble}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dspSettings.treble}
                    onChange={(e) => setDspSettings({ ...dspSettings, treble: Number(e.target.value) })}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Karaoke Mic Processor Module */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  LIVE KARAOKE MIC & VOCAL RACK
                </span>
              </div>

              <button
                onClick={toggleMicrophone}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  micActive
                    ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                }`}
              >
                {micActive ? <Mic className="w-3.5 h-3.5 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>{micActive ? 'BẬT MIC' : 'TẮT MIC'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setMicAiTone(!micAiTone)}
                className={`p-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  micAiTone ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-black/40 text-zinc-500 border-zinc-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI GIỌNG HÁT
              </button>
              <button
                onClick={() => setMicAntiFeedback(!micAntiFeedback)}
                className={`p-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  micAntiFeedback ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-black/40 text-zinc-500 border-zinc-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                CHỐNG HÚ
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Âm lượng mic (Gain)</span>
                  <span className="font-mono text-cyan-400">{micSettings.gain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micSettings.gain}
                  onChange={(e) => setMicSettings({ ...micSettings, gain: Number(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Echo (Delay)</span>
                  <span className="font-mono text-amber-400">{micSettings.echo} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={micSettings.echo}
                  onChange={(e) => setMicSettings({ ...micSettings, echo: Number(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* OFFLINE VIDEO ALBUMS & YOUTUBE ONLINE LIBRARY MANAGER */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md flex-1 flex flex-col">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />

            {/* Navigation Tabs for Library Manager */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex bg-black/80 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setLibraryViewTab('playlist')}
                  className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                    libraryViewTab === 'playlist' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  HÀNG CHỜ
                </button>
                <button
                  onClick={() => setLibraryViewTab('offline_albums')}
                  className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                    libraryViewTab === 'offline_albums' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FolderVideo className="w-3.5 h-3.5" />
                  ALBUM OFFLINE
                </button>
                <button
                  onClick={() => setLibraryViewTab('youtube_online')}
                  className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                    libraryViewTab === 'youtube_online' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  YOUTUBE KTV
                </button>
              </div>

              <button
                onClick={() => setShowAddAlbumModal(true)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 rounded text-xs font-bold transition"
                title="Tạo Album Mới"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: Queue Playlist */}
            {libraryViewTab === 'playlist' && (
              <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {playlist.map((track, idx) => {
                  const isSelected = idx === currentTrackIndex;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => {
                        setCurrentTrackIndex(idx);
                        setIsPlaying(true);
                      }}
                      className={`p-2.5 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                          : 'bg-black/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {track.isYouTube ? (
                          <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                        ) : track.isVideo ? (
                          <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Music className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{track.artist} • {track.fileSize || 'HD'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-zinc-500">{formatTime(track.duration)}</span>
                        {playlist.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylist(playlist.filter((_, i) => i !== idx));
                              if (currentTrackIndex >= playlist.length - 1) setCurrentTrackIndex(0);
                            }}
                            className="p-1 hover:text-red-400 text-zinc-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: Offline Custom Video Albums */}
            {libraryViewTab === 'offline_albums' && (
              <div className="flex flex-col flex-1">
                {/* Custom Album Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b border-zinc-800/80 no-scrollbar">
                  {customAlbums.map((albumName) => (
                    <button
                      key={albumName}
                      onClick={() => setSelectedAlbumTab(albumName)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition border ${
                        selectedAlbumTab === albumName
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                          : 'bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {albumName}
                    </button>
                  ))}
                </div>

                {/* Video Cards Grid */}
                <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                  {filteredOfflineAlbumVideos.map((video) => (
                    <div
                      key={video.id}
                      className="p-3 bg-black/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-zinc-100">{video.title}</h4>
                            <p className="text-[10px] text-zinc-400">{video.artist} • Album: {video.album}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const foundIdx = playlist.findIndex((t) => t.id === video.id);
                            if (foundIdx >= 0) {
                              setCurrentTrackIndex(foundIdx);
                            } else {
                              setPlaylist([video, ...playlist]);
                              setCurrentTrackIndex(0);
                            }
                            setIsPlaying(true);
                            setIsFullscreenKtv(true);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-extrabold rounded flex items-center gap-1 shrink-0 transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          CHƠI KTV
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {video.fileSize}
                        </span>
                        {video.tags?.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-900 px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: YouTube Online KTV Search & Trending Playlists */}
            {libraryViewTab === 'youtube_online' && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
                {/* Search Bar */}
                <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-lg p-2">
                  <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={youtubeSearchQuery}
                    onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm Kara Karaoke YouTube..."
                    className="bg-transparent text-xs text-zinc-200 outline-none w-full"
                  />
                </div>

                <p className="text-[11px] font-mono font-bold text-red-400 flex items-center gap-1">
                  <Youtube className="w-3.5 h-3.5" />
                  KTV YOUTUBE HOT TRENDING 2026:
                </p>

                {YOUTUBE_TRENDING_KTV.map((ytItem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-black/60 border border-zinc-800 rounded-lg hover:border-red-900/60 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{ytItem.title}</p>
                      <p className="text-[10px] text-zinc-500">{ytItem.channel}</p>
                    </div>

                    <button
                      onClick={() => handleAddYoutubeUrl(`https://www.youtube.com/watch?v=${ytItem.youtubeId}`)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded shrink-0 transition flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      PHÁT NGAY
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FULLSCREEN KTV OVERLAY ENGINE WITH AI SPLIT VIEW */}
      {isFullscreenKtv && (
        <div
          onMouseMove={handleMouseMoveKtv}
          className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none"
        >
          {/* Active Video Backdrop with AI Filtering & Split View */}
          <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
            {currentTrack?.isYouTube ? (
              <iframe
                src={currentTrack?.src}
                title={currentTrack?.title}
                className={`w-full h-full border-0 ${currentZoomObj.class}`}
                style={{ filter: getAiVideoFilterStyle(true) }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : currentTrack?.isVideo ? (
              <div className="relative w-full h-full">
                {/* Base Raw Video Layer */}
                <video
                  src={currentTrack?.src}
                  className={`w-full h-full absolute inset-0 ${currentZoomObj.class}`}
                  autoPlay={isPlaying}
                  loop
                  muted
                />

                {/* AI Enhanced Video Layer */}
                {aiVideoSettings.enabled && (
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath: aiVideoSettings.splitCompare
                        ? `inset(0 ${100 - aiVideoSettings.splitPos}% 0 0)`
                        : 'inset(0 0 0 0)'
                    }}
                  >
                    <video
                      src={currentTrack?.src}
                      className={`w-full h-full ${currentZoomObj.class}`}
                      style={{ filter: getAiVideoFilterStyle(true) }}
                      autoPlay={isPlaying}
                      loop
                      muted
                    />
                  </div>
                )}
              </div>
            ) : (
              <canvas ref={ktvBgCanvasRef} width={1920} height={1080} className={`w-full h-full ${currentZoomObj.class}`} />
            )}
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-none" />
          </div>

          {/* Top KTV HUD */}
          <div
            className={`relative z-10 p-6 flex flex-wrap justify-between items-start gap-4 transition-opacity duration-500 ${
              autoHideControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="bg-black/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-amber-500 text-zinc-950 font-extrabold px-2 py-0.5 rounded uppercase">
                  SONUS KTV FULLSCREEN 4K
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-mono uppercase">
                  {aiVideoSettings.upscaleMode} AI MODE
                </span>
              </div>
              <h2 className="text-xl font-bold text-amber-300">{currentTrack?.title}</h2>
              <p className="text-xs text-zinc-400">{currentTrack?.artist} • Album: {currentTrack?.album || 'KTV Studio'}</p>
            </div>

            {/* Pitch Contour HUD */}
            <div className="bg-black/80 border border-zinc-800 backdrop-blur-md rounded-xl p-3 w-80">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-cyan-400 font-bold">PITCH CONTOUR (AUTO-TUNE)</span>
                <div className="flex gap-1">
                  {[0.5, 1.0, 1.5].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setPitchHudScale(scale)}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                        pitchHudScale === scale ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {scale}x
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="relative bg-zinc-950 border border-zinc-800 rounded overflow-hidden transition-all"
                style={{ height: `${64 * pitchHudScale}px` }}
              >
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/50 border-t border-dashed border-cyan-400" />
                <div
                  className="absolute h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] transition-all duration-100"
                  style={{
                    left: `${(currentTime % 5) * 20}%`,
                    top: `${40 + Math.sin(currentTime * 3) * 30}%`
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenKtv(false)}
              className="p-3 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full border border-zinc-700 backdrop-blur-md transition"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>

          {/* Lyrics Container */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="space-y-6 max-w-5xl">
              <p
                className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-cyan-300 drop-shadow-[0_0_25px_rgba(234,179,8,0.6)] transition-all leading-relaxed"
                style={{ fontSize: `${lyricsFontSize}px` }}
              >
                {currentTrack?.lyrics?.[Math.floor((currentTime / (duration || 16)) * (currentTrack?.lyrics?.length || 1))]?.text || "♫ ♪ Đang phát Video Karaoke Studio 4K... ♪ ♫"}
              </p>
            </div>
          </div>

          {/* Floating Bottom Bar */}
          <div
            className={`relative z-10 p-6 transition-opacity duration-500 ${
              autoHideControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="max-w-4xl mx-auto bg-black/85 border border-zinc-800 backdrop-blur-xl p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const newT = Number(e.target.value);
                  setCurrentTime(newT);
                  if (mediaRef.current) mediaRef.current.currentTime = newT;
                }}
                className="w-full accent-amber-400 h-2 bg-zinc-900 rounded cursor-pointer"
              />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-3 bg-amber-500 text-zinc-950 rounded-xl font-bold hover:bg-amber-400 transition"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <span className="font-mono text-xs text-cyan-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Type className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-zinc-400">Chữ KTV:</span>
                  <button
                    onClick={() => setLyricsFontSize((prev) => Math.max(18, prev - 4))}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold text-xs"
                  >
                    A-
                  </button>
                  <span className="font-mono text-xs text-cyan-400">{lyricsFontSize}px</span>
                  <button
                    onClick={() => setLyricsFontSize((prev) => Math.min(56, prev + 4))}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold text-xs"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Album Modal */}
      {showAddAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              TẠO ALBUM VIDEO OFFLINE MỚI
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Tên Album mới:</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Ví dụ: Karaoke Bolero 2026, Video Sài Gòn..."
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-100 focus:border-cyan-400 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddAlbumModal(false)}
                className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition"
              >
                HỦY
              </button>
              <button
                onClick={() => {
                  if (!newAlbumName.trim()) return;
                  if (!customAlbums.includes(newAlbumName.trim())) {
                    setCustomAlbums([...customAlbums, newAlbumName.trim()]);
                    setSelectedAlbumTab(newAlbumName.trim());
                  }
                  setNewAlbumName('');
                  setShowAddAlbumModal(false);
                }}
                className="flex-1 py-2 bg-cyan-500 text-zinc-950 font-bold rounded-lg hover:bg-cyan-400 transition"
              >
                TẠO ALBUM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Hotkeys Modal */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              PHÍM TẮT ĐIỀU KHIỂN HỆ THỐNG
            </h3>
            <div className="space-y-3 font-mono text-xs text-zinc-300">
              <div className="flex justify-between p-2 bg-black/50 rounded border border-zinc-800">
                <span className="text-cyan-400 font-bold">Space</span>
                <span>Tạm dừng / Phát nhạc</span>
              </div>
              <div className="flex justify-between p-2 bg-black/50 rounded border border-zinc-800">
                <span className="text-cyan-400 font-bold">F hoặc Alt+Enter</span>
                <span>Bật / Tắt Fullscreen KTV</span>
              </div>
              <div className="flex justify-between p-2 bg-black/50 rounded border border-zinc-800">
                <span className="text-amber-400 font-bold">Z</span>
                <span>Thu phóng Video (Zoom Fit)</span>
              </div>
              <div className="flex justify-between p-2 bg-black/50 rounded border border-zinc-800">
                <span className="text-cyan-400 font-bold">M</span>
                <span>Tắt / Bật Âm thanh (Mute)</span>
              </div>
            </div>
            <button
              onClick={() => setShowHotkeysModal(false)}
              className="mt-6 w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition"
            >
              ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}