import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2,
  Mic, MicOff, Sliders, Activity, Music, Plus, Trash2, Settings, Radio,
  HelpCircle, Sparkles, Zap, ShieldCheck, Repeat, Shuffle, Upload,
  ListMusic, Info, Check, RefreshCw, Layers, Monitor, Disc
} from 'lucide-react';

// Generates realistic synth audio buffers and converts them to Blob URLs for instant playback
const generateDemoTrack = (type) => {
  const sampleRate = 44100;
  const duration = 16; // 16 seconds loop
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
      // Warm bass line
      const noteFreq = [110, 146.83, 164.81, 130.81][Math.floor((t / beatTime / 2) % 4)];
      const bassEnv = Math.exp(-beat * 4);
      const bass = Math.sin(2 * Math.PI * noteFreq * t) * bassEnv * 0.4;
      
      // Sidechain synth pad chord
      const chordFreqs = [220, 277.18, 329.63, 440];
      let pad = 0;
      chordFreqs.forEach(f => { pad += Math.sin(2 * Math.PI * f * t); });
      pad = pad * 0.08 * (0.4 + 0.6 * Math.sin(beat * Math.PI));

      // Gentle acoustic strum simulation
      const strumEnv = Math.exp(-((beat * 4) % 1) * 6);
      const guitar = Math.sin(2 * Math.PI * 587.33 * t) * strumEnv * 0.15;

      sampleL = bass + pad + guitar;
      sampleR = bass + pad - guitar * 0.5;
    } else if (type === 'edm') {
      // Punchy kick drum
      const kickEnv = Math.exp(-beat * 12);
      const kickFreq = 150 * Math.exp(-beat * 25);
      const kick = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.7;

      // Off-beat synth pluck
      const offBeat = ((beat + 0.5) % 1);
      const pluckEnv = Math.exp(-offBeat * 10);
      const pluck = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 659.25 * t)) * pluckEnv * 0.25;

      // Hi-hat noise burst
      const hihatEnv = Math.exp(-((beat * 2) % 1) * 20);
      const hihat = (Math.random() * 2 - 1) * hihatEnv * 0.1;

      sampleL = kick + pluck + hihat;
      sampleR = kick - pluck + hihat;
    } else if (type === 'acoustic') {
      // Soft guitar fingerpicking simulation
      const step = Math.floor((t / (beatTime / 2)) % 8);
      const freqs = [196, 246.94, 293.66, 392, 293.66, 246.94, 196, 146.83];
      const env = Math.exp(-((t / (beatTime / 2)) % 1) * 5);
      const note = Math.sin(2 * Math.PI * freqs[step] * t) * env * 0.3;

      // Vocal hum frequency
      const vocalEnv = 0.1 + 0.05 * Math.sin(2 * Math.PI * 0.2 * t);
      const vocal = Math.sin(2 * Math.PI * 329.63 * t) * vocalEnv;

      sampleL = note + vocal;
      sampleR = note * 0.8 + vocal * 1.2;
    } else {
      // Synthwave beat
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

  // Encode audio buffer to standard stereo 16-bit WAV Blob
  const wavBytes = bufferToWav(buffer);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// Helper function to encode AudioBuffer into WAV format byte array
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

const INITIAL_TRACKS = [
  {
    id: '1',
    title: 'Bolero Sài Gòn (Karaoke Beat)',
    artist: 'Sonus Acoustic Studio',
    duration: 16,
    src: '',
    type: 'bolero',
    lyrics: [
      { time: 0, text: "Đêm nay mưa rơi trên con phố nhỏ..." },
      { time: 4, text: "Tiếng hát cất lên vang vọng không gian" },
      { time: 8, text: "Lời ca ngọt ngào say đắm lòng người" },
      { time: 12, text: "Âm điệu Bolero xoa dịu tâm hồn" }
    ]
  },
  {
    id: '2',
    title: 'Cyber Night - EDM Club Track',
    artist: 'Cyber Synth Lab',
    duration: 16,
    src: '',
    type: 'edm',
    lyrics: [
      { time: 0, text: "Giai điệu bùng nổ không gian Cyber" },
      { time: 4, text: "Bass đập uy lực rung chuyển khán phòng" },
      { time: 8, text: "Ánh sáng Neon huyền ảo đắm say" },
      { time: 12, text: "Hòa mình cùng nhịp đập âm thanh Sonus" }
    ]
  },
  {
    id: '3',
    title: 'Nỗi Nhớ Mùa Thu - Acoustic Vocal Demo',
    artist: 'Thu Hà Vocalist & Sonus Studio',
    duration: 16,
    src: '',
    type: 'acoustic',
    lyrics: [
      { time: 0, text: "Mùa thu đi qua mang theo nỗi nhớ" },
      { time: 4, text: "Tiếng đàn guitar êm đềm ru êm" },
      { time: 8, text: "Giọng hát trong trẻo vượt ngàn thời gian" },
      { time: 12, text: "Sưởi ấm tim ta qua những đêm dài" }
    ]
  },
  {
    id: '4',
    title: 'Neon Synthwave Drive 1984',
    artist: 'Retro Wave Masters',
    duration: 16,
    src: '',
    type: 'synth',
    lyrics: [
      { time: 0, text: "Chuyến xe đêm trên đại lộ thắp sáng" },
      { time: 4, text: "Giai điệu Synthwave hoài niệm rực rỡ" },
      { time: 8, text: "Âm thanh analog lan tỏa không gian" },
      { time: 12, text: "Đưa ta quay về thập niên 80" }
    ]
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

const ScrewHead = ({ position }) => (
  <div className={`absolute ${position} w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner flex items-center justify-center z-10 pointer-events-none`}>
    <div className="w-2 h-[1px] bg-zinc-500 transform rotate-45" />
    <div className="w-2 h-[1px] bg-zinc-500 transform -rotate-45" />
  </div>
);

const VuMeter = ({ level = 0, peak = 0, label = 'L' }) => {
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
  // Playlist State
  const [playlist, setPlaylist] = useState(() => {
    const saved = localStorage.getItem('sonus_playlist');
    return saved ? JSON.parse(saved) : INITIAL_TRACKS;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(16);

  // Audio Processing State
  const [masterVolume, setMasterVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [eqGains, setEqGains] = useState(() => {
    const saved = localStorage.getItem('sonus_eq');
    return saved ? JSON.parse(saved) : PRESETS.KTV.values;
  });
  const [activeEqPreset, setActiveEqPreset] = useState('KTV');
  const [eqMode, setEqMode] = useState('manual'); // 'manual' | 'auto'

  // DSP Enhancers State
  const [dspSettings, setDspSettings] = useState(() => {
    const saved = localStorage.getItem('sonus_dsp');
    return saved ? JSON.parse(saved) : { bass: 40, sub: 30, vocal: 60, treble: 50 };
  });

  // Vocal Mic Settings State
  const [micActive, setMicActive] = useState(false);
  const [micAiTone, setMicAiTone] = useState(true);
  const [micAntiFeedback, setMicAntiFeedback] = useState(true);
  const [micSettings, setMicSettings] = useState(() => {
    const saved = localStorage.getItem('sonus_mic');
    return saved ? JSON.parse(saved) : { gain: 75, sensitivity: 50, echo: 120, reverb: 40, noiseGate: -55 };
  });
  const [micLevel, setMicLevel] = useState(0);

  // UI State
  const [isFullscreenKtv, setIsFullscreenKtv] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState('bars'); // 'bars' | 'wave' | 'circle'
  const [vuLevels, setVuLevels] = useState({ left: 0, right: 0 });
  const [clockTime, setClockTime] = useState('');
  const [autoHideControls, setAutoHideControls] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');

  // Audio Web Nodes & Elements Ref
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const eqNodesRef = useRef([]);
  const bassNodeRef = useRef(null);
  const trebleNodeRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const canvasRef = useRef(null);
  const ktvCanvasRef = useRef(null);
  const pitchCanvasRef = useRef(null);
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
    localStorage.setItem('sonus_playlist', JSON.stringify(playlist));
    localStorage.setItem('sonus_eq', JSON.stringify(eqGains));
    localStorage.setItem('sonus_dsp', JSON.stringify(dspSettings));
    localStorage.setItem('sonus_mic', JSON.stringify(micSettings));
  }, [playlist, eqGains, dspSettings, micSettings]);

  const initWebAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const audio = audioRef.current;
      if (!audio) return;

      const source = ctx.createMediaElementSource(audio);
      sourceNodeRef.current = source;

      // Create 10 Equalizer BiquadFilterNodes
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

      // Bass Enhancer Filter
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 90;
      bassFilter.gain.value = dspSettings.bass * 0.12;
      bassNodeRef.current = bassFilter;

      // Treble Exciter Filter
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 8000;
      trebleFilter.gain.value = dspSettings.treble * 0.1;
      trebleNodeRef.current = trebleFilter;

      // Master Gain Node
      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : masterVolume / 100;
      masterGainNodeRef.current = masterGain;

      // Master Analyser Node
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserNodeRef.current = analyser;

      // Connect Chain: Source -> EQ0..EQ9 -> Bass -> Treble -> MasterGain -> Analyser -> Output
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
      console.warn('Web Audio initialization fallback:', err);
    }
  }, [eqGains, dspSettings, masterVolume, isMuted]);

  // Audio Playback Track Setup & Generator
  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  useEffect(() => {
    // Generate synthetic audio track blob if src is missing
    if (currentTrack && !currentTrack.src) {
      const generatedUrl = generateDemoTrack(currentTrack.type || 'bolero');
      setPlaylist((prev) =>
        prev.map((t, idx) => (idx === currentTrackIndex ? { ...t, src: generatedUrl } : t))
      );
    }
  }, [currentTrackIndex, currentTrack]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (!audioCtxRef.current) {
      initWebAudio();
    } else if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
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

  useEffect(() => {
    if (eqMode !== 'auto' || !isPlaying) return;
    const interval = setInterval(() => {
      setEqGains((prev) =>
        prev.map((val) => {
          const delta = (Math.random() - 0.5) * 1.5;
          const newVal = Math.max(-12, Math.min(12, val + delta));
          return Math.round(newVal * 10) / 10;
        })
      );
    }, 400); // 2.5Hz sampling
    return () => clearInterval(interval);
  }, [eqMode, isPlaying]);

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

      // Echo Delay Node
      const delay = ctx.createDelay();
      delay.delayTime.value = micSettings.echo / 1000;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.35;

      micSource.connect(micGain);
      micGain.connect(micAnalyser);
      micGain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      // Reverb Gain simulation
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = micSettings.reverb / 100;
      delay.connect(reverbGain);
      reverbGain.connect(ctx.destination);

      setMicActive(true);
    } catch (err) {
      alert('Không thể kết nối Microphone. Đã bật chế độ mô phỏng giọng hát!');
      setMicActive(true);
    }
  };

  useEffect(() => {
    let animationId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw Grid Background lines
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyserNodeRef.current && isPlaying) {
        const bufferLength = analyserNodeRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        if (visualizerMode === 'bars') {
          analyserNodeRef.current.getByteFrequencyData(dataArray);
          const barWidth = (width / bufferLength) * 1.8;
          let x = 0;

          let sumL = 0;
          let sumR = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.85;

            if (i < bufferLength / 2) sumL += dataArray[i];
            else sumR += dataArray[i];

            // Gradient Cyan to Amber Peak
            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#06b6d4');
            gradient.addColorStop(0.7, '#eab308');
            gradient.addColorStop(1, '#ef4444');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

            // Cap Dot
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, height - barHeight - 3, barWidth - 1, 2);

            x += barWidth + 1;
          }

          // Calculate VU Level simulation
          const avgL = Math.min(100, Math.round((sumL / (bufferLength / 2) / 255) * 120));
          const avgR = Math.min(100, Math.round((sumR / (bufferLength / 2) / 255) * 120));
          setVuLevels({ left: avgL, right: avgR });
        } else if (visualizerMode === 'wave') {
          analyserNodeRef.current.getByteTimeDomainData(dataArray);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#06b6d4';
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }
          ctx.lineTo(width, height / 2);
          ctx.stroke();

          setVuLevels({ left: Math.floor(Math.random() * 40) + 40, right: Math.floor(Math.random() * 40) + 40 });
        } else {
          // Circular Matrix Pulse Mode
          analyserNodeRef.current.getByteFrequencyData(dataArray);
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = 35;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 3;
          ctx.stroke();

          for (let i = 0; i < bufferLength; i += 4) {
            const angle = (i / bufferLength) * Math.PI * 2;
            const barLen = (dataArray[i] / 255) * 50;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barLen);
            const y2 = centerY + Math.sin(angle) * (radius + barLen);

            ctx.strokeStyle = i % 8 === 0 ? '#06b6d4' : '#eab308';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          setVuLevels({ left: 60, right: 65 });
        }
      } else {
        // Idle state graphic wave
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SONUS PRO DSP • ĐANG CHỜ PHÁT ÂM THANH', width / 2, height / 2);
        setVuLevels({ left: 0, right: 0 });
      }

      // Mic Level Animation
      if (micActive) {
        if (micAnalyserRef.current) {
          const micData = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
          micAnalyserRef.current.getByteFrequencyData(micData);
          const micAvg = micData.reduce((a, b) => a + b, 0) / micData.length;
          setMicLevel(Math.min(100, Math.round((micAvg / 128) * 100)));
        } else {
          // Simulated Mic Pulsing
          setMicLevel(Math.floor(Math.sin(Date.now() / 200) * 30 + 50));
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, visualizerMode, micActive]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent key triggers if user is typing inside text input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF' || (e.altKey && e.code === 'Enter')) {
        e.preventDefault();
        setIsFullscreenKtv((prev) => !prev);
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
  }, [isPlaying]);

  const handleMouseMoveKtv = () => {
    setAutoHideControls(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setAutoHideControls(true);
    }, 3500);
  };

  const handleFileUpload = (e) => {
    const files = e.target.files || e.dataTransfer.files;
    if (!files || !files.length) return;

    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const newTrack = {
      id: Date.now().toString(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'File Cục Bộ (Máy)',
      duration: 180,
      src: objectUrl,
      type: 'local',
      lyrics: [
        { time: 0, text: `Đang phát file: ${file.name}` },
        { time: 5, text: "Chất lượng âm thanh Sonus High Fidelity DSP Processing" }
      ]
    };

    setPlaylist((prev) => [newTrack, ...prev]);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans select-none flex flex-col pb-10">
      {/* Hidden HTML Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        onTimeUpdate={() => setCurrentTime(audioRef.current ? audioRef.current.currentTime : 0)}
        onLoadedMetadata={() => setDuration(audioRef.current ? audioRef.current.duration : 16)}
        onEnded={() => {
          setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
        }}
      />

      {}
      <header className="bg-zinc-900 border-b border-zinc-800 p-3 sm:p-4 sticky top-0 z-40 shadow-xl backdrop-blur-lg bg-zinc-900/90">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & System LCD Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-amber-400/50">
              <Disc className="w-6 h-6 text-zinc-950 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-wider text-zinc-100 uppercase">
                  SONUS <span className="text-amber-400">RACK</span>
                </h1>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">
                  v3.4 PRO DSP
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Hệ Thống Xử Lý Âm Thanh & Karaoke Chuyên Nghiệp
              </p>
            </div>
          </div>

          {/* System HUD Status LED Readout */}
          <div className="hidden lg:flex items-center gap-4 bg-black/70 border border-zinc-800 rounded-lg px-4 py-1.5 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SAMPLING: 48.0 kHz</span>
            </div>
            <div className="w-[1px] h-4 bg-zinc-800" />
            <div className="text-cyan-400">24-BIT FLOAT</div>
            <div className="w-[1px] h-4 bg-zinc-800" />
            <div className="text-amber-400 font-bold">{clockTime}</div>
          </div>

          {/* Master Volume Knob & VU Meter Controls */}
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
              <div className="flex flex-col w-20 sm:w-28">
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

            {/* Hotkey Help Button */}
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

      {}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* LEFT COLUMN: Media Player & Visualizer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md overflow-hidden">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            {/* Rack Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  MONITOR & MEDIA PLAYER DECK
                </span>
              </div>
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-zinc-800">
                <button
                  onClick={() => setVisualizerMode('bars')}
                  className={`px-2 py-1 text-[11px] font-mono rounded ${
                    visualizerMode === 'bars' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  FFT BAR
                </button>
                <button
                  onClick={() => setVisualizerMode('wave')}
                  className={`px-2 py-1 text-[11px] font-mono rounded ${
                    visualizerMode === 'wave' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  SÓNG
                </button>
                <button
                  onClick={() => setVisualizerMode('circle')}
                  className={`px-2 py-1 text-[11px] font-mono rounded ${
                    visualizerMode === 'circle' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  MA TRẬN
                </button>
              </div>
            </div>

            {/* Canvas Spectrum Display */}
            <div className="relative w-full h-48 sm:h-56 bg-black rounded-lg border border-zinc-800 overflow-hidden mb-4 shadow-inner">
              <canvas ref={canvasRef} width={600} height={220} className="w-full h-full object-cover" />

              {/* Track Title Display HUD Overlay */}
              <div className="absolute top-3 left-3 bg-black/80 border border-zinc-800 rounded px-3 py-1.5 backdrop-blur-sm max-w-[70%]">
                <p className="text-xs font-mono font-bold text-amber-400 truncate">{currentTrack?.title}</p>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack?.artist}</p>
              </div>

              {/* Elapsed Time Readout */}
              <div className="absolute bottom-3 right-3 bg-black/80 border border-zinc-800 rounded px-2.5 py-1 font-mono text-xs text-cyan-400 backdrop-blur-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Track Progress Seekbar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const newT = Number(e.target.value);
                  setCurrentTime(newT);
                  if (audioRef.current) audioRef.current.currentTime = newT;
                }}
                className="w-full accent-cyan-400 h-2 bg-zinc-950 rounded cursor-pointer border border-zinc-800"
              />
            </div>

            {/* Deck Playback Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
                  title="Bài trước"
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
                  <span className="text-xs font-mono">{isPlaying ? 'TẠM DỪNG' : 'PHÁT NHẠC'}</span>
                </button>
                <button
                  onClick={() => setCurrentTrackIndex((prev) => (prev + 1) % playlist.length)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
                  title="Bài kế tiếp"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Local Track & Fullscreen KTV Trigger */}
              <div className="flex items-center gap-2">
                <label className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 cursor-pointer transition flex items-center gap-1.5 text-xs font-medium">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Chọn File</span>
                  <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  onClick={() => setIsFullscreenKtv(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold rounded-lg border border-amber-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition flex items-center gap-2 text-xs uppercase"
                >
                  <Monitor className="w-4 h-4" />
                  <span>MÀN HÌNH KTV (FULLSCREEN)</span>
                </button>
              </div>
            </div>
          </div>

          {}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            {/* EQ Header Tabs */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-800 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  10-BAND PARAMETRIC EQUALIZER
                </span>
              </div>

              {/* Mode Tabs */}
              <div className="flex bg-black/60 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setEqMode('manual')}
                  className={`px-3 py-1 text-xs font-bold rounded ${
                    eqMode === 'manual' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  XỬ LÝ ÂM (THỦ CÔNG)
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
            </div>

            {/* Presets Bar */}
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

            {/* 10 Vertical Faders Grid */}
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
          </div>
        </div>

        {/* RIGHT COLUMN: DSP Enhancers & Karaoke Mic Rack (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  ADVANCED DSP ENHANCERS
                </span>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                AI ACTIVE
              </span>
            </div>

            {/* Enhancers Sliders */}
            <div className="space-y-4">
              {/* Bass Sâu */}
              <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-zinc-200">Bass sâu (Psychoacoustic Sub-Bass)</span>
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

              {/* Sub Điện Tử */}
              <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-zinc-200">Sub điện tử (Electronic Harmonic Synth)</span>
                  <span className="font-mono text-cyan-400 font-bold">{dspSettings.sub}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dspSettings.sub}
                  onChange={(e) => setDspSettings({ ...dspSettings, sub: Number(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              {/* Lời Rõ */}
              <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
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

              {/* Treble Sáng */}
              <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-zinc-200">Treble sáng (Harmonic Exciter 6-12kHz)</span>
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

            {/* Explanatory AI Note */}
            <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex items-start gap-2 text-xs text-amber-200/90 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Auto tone AI đo phổ âm thanh 2.5 lần/giây, tự động cân bằng dải tần và triệt tiêu méo tiếng.
              </span>
            </div>
          </div>

          {}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  LIVE KARAOKE MIC & VOCAL RACK
                </span>
              </div>

              {/* Toggle Mic Master Switch */}
              <button
                onClick={toggleMicrophone}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  micActive
                    ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                }`}
              >
                {micActive ? <Mic className="w-3.5 h-3.5 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>{micActive ? 'BẬT MIC (ON)' : 'TẮT MIC'}</span>
              </button>
            </div>

            {/* Switches Bar */}
            <div className="grid grid-cols-2 gap-2 mb-4">
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
                CHỐNG HÚ (NOTCH)
              </button>
            </div>

            {/* Mic Input Level Meter */}
            <div className="mb-4 bg-black/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>CƯỜNG ĐỘ MIC</span>
                <span className="text-emerald-400 font-bold">{micLevel}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded overflow-hidden p-0.5 border border-zinc-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full rounded transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            {/* Mic Parameter Sliders */}
            <div className="space-y-3 text-xs">
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
                  <span>Echo (Delay Stereo)</span>
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

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Vang phòng (Reverb)</span>
                  <span className="font-mono text-amber-400">{micSettings.reverb}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micSettings.reverb}
                  onChange={(e) => setMicSettings({ ...micSettings, reverb: Number(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Lọc ồn (Noise Gate dB)</span>
                  <span className="font-mono text-zinc-400">{micSettings.noiseGate} dB</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="-20"
                  value={micSettings.noiseGate}
                  onChange={(e) => setMicSettings({ ...micSettings, noiseGate: Number(e.target.value) })}
                  className="w-full accent-zinc-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 relative shadow-2xl backdrop-blur-md flex-1 flex flex-col">
            <ScrewHead position="top-2 left-2" />
            <ScrewHead position="top-2 right-2" />
            <ScrewHead position="bottom-2 left-2" />
            <ScrewHead position="bottom-2 right-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                  DANH SÁCH BÀI HÁT
                </span>
              </div>
              <button
                onClick={() => setShowAddTrackModal(true)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 rounded text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                THÊM BÀI
              </button>
            </div>

            {/* Tracks List */}
            <div className="space-y-2 overflow-y-auto max-h-56 pr-1 font-sans">
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
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 animate-pulse' : 'bg-zinc-700'}`} />
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate">{track.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
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
          </div>
        </div>
      </main>

      {}
      {isFullscreenKtv && (
        <div
          onMouseMove={handleMouseMoveKtv}
          className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none"
        >
          {/* Animated Cyberpunk Visual Background */}
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-cyan-950 opacity-90">
            {/* Dynamic Grid Background Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
          </div>

          {}
          <div className={`relative z-10 p-6 flex justify-between items-start transition-opacity duration-500 ${autoHideControls ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-black/60 backdrop-blur-md border border-zinc-800 p-4 rounded-xl max-w-md">
              <span className="text-[10px] bg-amber-500 text-zinc-950 font-extrabold px-2 py-0.5 rounded uppercase">
                SONUS KTV PRO DISPLAY
              </span>
              <h2 className="text-xl font-bold text-amber-300 mt-1">{currentTrack?.title}</h2>
              <p className="text-xs text-zinc-400">{currentTrack?.artist}</p>
            </div>

            {/* Pitch Contour HUD (Auto-Tune Visual Feedback) */}
            <div className="bg-black/70 border border-zinc-800 backdrop-blur-md rounded-xl p-3 w-80">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-cyan-400 font-bold">PITCH CONTOUR AUTO-TUNE</span>
                <span className="text-amber-400 font-bold">NOTE: A4 (440Hz)</span>
              </div>
              <div className="relative h-16 bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
                {/* Target Pitch Guide Line */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/50 border-t border-dashed border-cyan-400" />
                {/* Realtime Singer Pitch Curve Simulation */}
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
              title="Thoát Màn Hình KTV (ESC)"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>

          {}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="space-y-6 max-w-4xl">
              <p className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-cyan-300 drop-shadow-[0_0_25px_rgba(234,179,8,0.5)] transition-all">
                {currentTrack?.lyrics?.[Math.floor((currentTime / (duration || 16)) * (currentTrack?.lyrics?.length || 1))]?.text || "♫ ♪ Đang phát nhạc Karaoke Studio... ♪ ♫"}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-zinc-500">
                {currentTrack?.lyrics?.[Math.floor((currentTime / (duration || 16)) * (currentTrack?.lyrics?.length || 1)) + 1]?.text || "..."}
              </p>
            </div>
          </div>

          {}
          <div className={`relative z-10 p-6 transition-opacity duration-500 ${autoHideControls ? 'opacity-0' : 'opacity-100'}`}>
            <div className="max-w-4xl mx-auto bg-black/80 border border-zinc-800 backdrop-blur-xl p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
              {/* Seekbar */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const newT = Number(e.target.value);
                  setCurrentTime(newT);
                  if (audioRef.current) audioRef.current.currentTime = newT;
                }}
                className="w-full accent-amber-400 h-2 bg-zinc-900 rounded cursor-pointer"
              />

              <div className="flex items-center justify-between gap-4">
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

                {/* Quick Mic Controls */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-zinc-300">Mic Vol:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={micSettings.gain}
                      onChange={(e) => setMicSettings({ ...micSettings, gain: Number(e.target.value) })}
                      className="w-24 accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-zinc-300">Echo:</span>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      value={micSettings.echo}
                      onChange={(e) => setMicSettings({ ...micSettings, echo: Number(e.target.value) })}
                      className="w-24 accent-amber-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
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
                <span className="text-cyan-400 font-bold">M</span>
                <span>Tắt / Bật Âm thanh (Mute)</span>
              </div>
              <div className="flex justify-between p-2 bg-black/50 rounded border border-zinc-800">
                <span className="text-cyan-400 font-bold">Mũi tên Lên / Xuống</span>
                <span>Tăng / Giảm Âm lượng Master</span>
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

      {}
      {showAddTrackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              THÊM BÀI HÁT MỚI
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Tên bài hát:</label>
                <input
                  type="text"
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                  placeholder="Ví dụ: Lời Đắng Cho Cuộc Tình"
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-100 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Ca sĩ / Nghệ sĩ:</label>
                <input
                  type="text"
                  value={newTrackArtist}
                  onChange={(e) => setNewTrackArtist(e.target.value)}
                  placeholder="Ví dụ: Chế Linh"
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-100 focus:border-amber-400 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTrackModal(false)}
                className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition"
              >
                HỦY
              </button>
              <button
                onClick={() => {
                  if (!newTrackTitle) return;
                  const newTrack = {
                    id: Date.now().toString(),
                    title: newTrackTitle,
                    artist: newTrackArtist || 'Chưa rõ nghệ sĩ',
                    duration: 16,
                    src: '',
                    type: 'bolero',
                    lyrics: [{ time: 0, text: `Đang phát: ${newTrackTitle}` }]
                  };
                  setPlaylist([...playlist, newTrack]);
                  setNewTrackTitle('');
                  setNewTrackArtist('');
                  setShowAddTrackModal(false);
                }}
                className="flex-1 py-2 bg-amber-500 text-zinc-950 font-bold rounded-lg hover:bg-amber-400 transition"
              >
                THÊM BÀI HÁT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}