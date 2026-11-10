
/**
 * TheGreeter - Premium Interactive Lock Screens Engine
 * 2 Premium Interactive Lock Screen Designs:
 * 1. Modern Glassmorphic Numeric Keypad Lock (3-6 PIN slots)
 * 2. Number Tumbler Mechanical Lock (3, 4, 6 cylindrical wheels)
 * + Classic Password Lock (backward compatibility)
 * 5 Universal Themes: Romantic Pink, Dreamy Purple, Luxury Black & Gold, Elegant Silver, Cute Pastel
 * Sound Effects ON by default with recipient mute toggle.
 */

(function (root, factory) {
  const exports = factory();
  if (root) {
    root.GreeterLockEngine = exports;
    root.renderGreeterLock = exports.renderGreeterLock;
    root.removeGreeterLock = exports.removeGreeterLock;
    root.LOCK_THEMES = exports.LOCK_THEMES;
  }
  if (typeof window !== 'undefined') {
    window.GreeterLockEngine = exports;
    window.renderGreeterLock = exports.renderGreeterLock;
    window.removeGreeterLock = exports.removeGreeterLock;
    window.LOCK_THEMES = exports.LOCK_THEMES;
  }
  if (typeof global !== 'undefined') {
    global.GreeterLockEngine = exports;
    global.renderGreeterLock = exports.renderGreeterLock;
    global.removeGreeterLock = exports.removeGreeterLock;
    global.LOCK_THEMES = exports.LOCK_THEMES;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function () {

  const LOCK_THEMES = {
    'romantic-pink': {
      id: 'romantic-pink',
      name: 'Romantic Pink',
      nameHi: 'रोमांटिक पिंक',
      icon: '💖',
      ribbonText: 'SECRET SURPRISE LOCK',
      ribbonTextHi: 'सीक्रेट सरप्राइज लॉक',
      cornerChar: '✦',
      frameBorder: '2px solid rgba(255, 105, 180, 0.65)',
      frameInlay: 'rgba(255, 182, 193, 0.35)',
      frameGlow: '0 25px 60px rgba(255, 20, 147, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      windowBorder: '1.5px solid rgba(255, 182, 193, 0.5)',
      windowGlow: '0 8px 24px rgba(255, 20, 147, 0.3), inset 0 2px 6px rgba(0, 0, 0, 0.35)',
      btnGradient: 'linear-gradient(135deg, #ff2d78 0%, #ff5e9c 50%, #ff85b3 100%)',
      btnGlow: 'rgba(255, 45, 120, 0.55)',
      btnGlowStrong: 'rgba(255, 45, 120, 0.85)',
      defaultMedia: '/assets/media/lock/theme-romantic-pink.jpg',
      bg: 'radial-gradient(ellipse at top, #2d0827 0%, #170415 60%, #0a0109 100%)',
      cardBg: 'linear-gradient(145deg, rgba(255, 182, 193, 0.16), rgba(219, 112, 147, 0.1))',
      cardBorder: 'rgba(255, 105, 180, 0.55)',
      cardShadow: '0 25px 60px rgba(255, 20, 147, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      accent: '#ff4d94',
      accentGlow: 'rgba(255, 77, 148, 0.75)',
      textColor: '#ffffff',
      subtextColor: '#ffd1e3',
      slotBg: 'rgba(255, 255, 255, 0.12)',
      slotBorder: 'rgba(255, 105, 180, 0.55)',
      slotActive: '#ff4d94',
      buttonBg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 192, 203, 0.12))',
      buttonText: '#ffffff',
      buttonBorder: 'rgba(255, 255, 255, 0.3)',
      buttonActive: 'linear-gradient(145deg, rgba(255, 77, 148, 0.75), rgba(255, 105, 180, 0.55))',
      tumblerRim: 'linear-gradient(180deg, #ffb3c6 0%, #853753 50%, #ffb3c6 100%)',
      tumblerBg: 'linear-gradient(180deg, #150510 0%, #2b0b20 50%, #150510 100%)',
      confetti: ['#ff4d94', '#ff70a6', '#ffd1e3', '#ffc2d1', '#ffffff']
    },
    'dreamy-purple': {
      id: 'dreamy-purple',
      name: 'Dreamy Purple',
      nameHi: 'ड्रीम पर्पल',
      icon: '🌙',
      ribbonText: 'CELESTIAL MOON LOCK',
      ribbonTextHi: 'सेलेस्टियल मून लॉक',
      cornerChar: '✧',
      frameBorder: '2px solid rgba(192, 132, 252, 0.65)',
      frameInlay: 'rgba(216, 180, 254, 0.35)',
      frameGlow: '0 25px 60px rgba(147, 51, 234, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      windowBorder: '1.5px solid rgba(216, 180, 254, 0.5)',
      windowGlow: '0 8px 24px rgba(147, 51, 234, 0.35), inset 0 2px 6px rgba(0, 0, 0, 0.4)',
      btnGradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c084fc 100%)',
      btnGlow: 'rgba(168, 85, 247, 0.55)',
      btnGlowStrong: 'rgba(192, 132, 252, 0.85)',
      defaultMedia: '/assets/media/lock/theme-dreamy-purple.jpg',
      bg: 'radial-gradient(ellipse at top, #1e0d38 0%, #0d061c 60%, #05020c 100%)',
      cardBg: 'linear-gradient(145deg, rgba(168, 85, 247, 0.16), rgba(126, 34, 206, 0.1))',
      cardBorder: 'rgba(168, 85, 247, 0.55)',
      cardShadow: '0 25px 60px rgba(147, 51, 234, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      accent: '#c084fc',
      accentGlow: 'rgba(192, 132, 252, 0.8)',
      textColor: '#ffffff',
      subtextColor: '#e9d5ff',
      slotBg: 'rgba(255, 255, 255, 0.1)',
      slotBorder: 'rgba(168, 85, 247, 0.55)',
      slotActive: '#c084fc',
      buttonBg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(168, 85, 247, 0.12))',
      buttonText: '#ffffff',
      buttonBorder: 'rgba(255, 255, 255, 0.25)',
      buttonActive: 'linear-gradient(145deg, rgba(168, 85, 247, 0.7), rgba(126, 34, 206, 0.5))',
      tumblerRim: 'linear-gradient(180deg, #c4a7ff 0%, #4c1d95 50%, #c4a7ff 100%)',
      tumblerBg: 'linear-gradient(180deg, #0c0418 0%, #1a0b30 50%, #0c0418 100%)',
      confetti: ['#c084fc', '#a855f7', '#7e22ce', '#e9d5ff', '#ffffff']
    },
    'luxury-gold': {
      id: 'luxury-gold',
      name: 'Luxury Black & Gold',
      nameHi: 'लक्ज़री गोल्ड',
      icon: '👑',
      ribbonText: 'ROYAL SOVEREIGN LOCK',
      ribbonTextHi: 'रॉयल सोवरेन लॉक',
      cornerChar: '❖',
      frameBorder: '2.5px solid rgba(250, 204, 21, 0.75)',
      frameInlay: 'rgba(254, 240, 138, 0.45)',
      frameGlow: '0 25px 60px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(254, 240, 138, 0.5)',
      windowBorder: '2px solid rgba(254, 240, 138, 0.7)',
      windowGlow: '0 8px 24px rgba(234, 179, 8, 0.4), inset 0 2px 8px rgba(0, 0, 0, 0.5)',
      btnGradient: 'linear-gradient(135deg, #b45309 0%, #d97706 30%, #facc15 70%, #fef08a 100%)',
      btnGlow: 'rgba(250, 204, 21, 0.55)',
      btnGlowStrong: 'rgba(250, 204, 21, 0.9)',
      defaultMedia: '/assets/media/lock/theme-luxury-gold.jpg',
      bg: 'radial-gradient(ellipse at top, #1e1608 0%, #100b04 60%, #050301 100%)',
      cardBg: 'linear-gradient(145deg, rgba(234, 179, 8, 0.15), rgba(161, 98, 7, 0.09))',
      cardBorder: 'rgba(234, 179, 8, 0.65)',
      cardShadow: '0 25px 60px rgba(234, 179, 8, 0.32), inset 0 1px 0 rgba(254, 240, 138, 0.35)',
      accent: '#facc15',
      accentGlow: 'rgba(250, 204, 21, 0.85)',
      textColor: '#ffffff',
      subtextColor: '#fef08a',
      slotBg: 'rgba(255, 255, 255, 0.08)',
      slotBorder: 'rgba(234, 179, 8, 0.6)',
      slotActive: '#facc15',
      buttonBg: 'linear-gradient(145deg, rgba(254, 240, 138, 0.16), rgba(202, 138, 4, 0.12))',
      buttonText: '#ffffff',
      buttonBorder: 'rgba(234, 179, 8, 0.4)',
      buttonActive: 'linear-gradient(145deg, rgba(234, 179, 8, 0.7), rgba(161, 98, 7, 0.6))',
      tumblerRim: 'linear-gradient(180deg, #fef08a 0%, #854d0e 50%, #fef08a 100%)',
      tumblerBg: 'linear-gradient(180deg, #0a0804 0%, #1a1408 50%, #0a0804 100%)',
      confetti: ['#facc15', '#eab308', '#ca8a04', '#fef08a', '#ffffff']
    },
    'elegant-silver': {
      id: 'elegant-silver',
      name: 'Elegant Silver',
      nameHi: 'एलिगेंट सिल्वर',
      icon: '💎',
      ribbonText: 'CRYSTAL DIAMOND LOCK',
      ribbonTextHi: 'क्रिस्टल डायमंड लॉक',
      cornerChar: '◆',
      frameBorder: '2px solid rgba(56, 189, 248, 0.7)',
      frameInlay: 'rgba(186, 230, 253, 0.4)',
      frameGlow: '0 25px 60px rgba(56, 189, 248, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
      windowBorder: '1.5px solid rgba(186, 230, 253, 0.6)',
      windowGlow: '0 8px 24px rgba(56, 189, 248, 0.35), inset 0 2px 6px rgba(0, 0, 0, 0.35)',
      btnGradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #7dd3fc 100%)',
      btnGlow: 'rgba(56, 189, 248, 0.55)',
      btnGlowStrong: 'rgba(56, 189, 248, 0.85)',
      defaultMedia: '/assets/media/lock/theme-elegant-silver.jpg',
      bg: 'radial-gradient(ellipse at top, #1a222f 0%, #0d121a 60%, #06090e 100%)',
      cardBg: 'linear-gradient(145deg, rgba(203, 213, 225, 0.16), rgba(148, 163, 184, 0.09))',
      cardBorder: 'rgba(203, 213, 225, 0.6)',
      cardShadow: '0 25px 60px rgba(148, 163, 184, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.8)',
      textColor: '#ffffff',
      subtextColor: '#cbd5e1',
      slotBg: 'rgba(255, 255, 255, 0.1)',
      slotBorder: 'rgba(203, 213, 225, 0.55)',
      slotActive: '#38bdf8',
      buttonBg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(148, 163, 184, 0.12))',
      buttonText: '#ffffff',
      buttonBorder: 'rgba(255, 255, 255, 0.3)',
      buttonActive: 'linear-gradient(145deg, rgba(56, 189, 248, 0.6), rgba(14, 116, 144, 0.5))',
      tumblerRim: 'linear-gradient(180deg, #f8fafc 0%, #334155 50%, #f8fafc 100%)',
      tumblerBg: 'linear-gradient(180deg, #030712 0%, #111827 50%, #030712 100%)',
      confetti: ['#38bdf8', '#cbd5e1', '#94a3b8', '#f8fafc', '#ffffff']
    },
    'cute-pastel': {
      id: 'cute-pastel',
      name: 'Cute Pastel',
      nameHi: 'क्यूट पेस्टल',
      icon: '🧸',
      ribbonText: 'SWEET PASTEL LOCK',
      ribbonTextHi: 'स्वीट पेस्टल लॉक',
      cornerChar: '✿',
      frameBorder: '2px solid rgba(251, 146, 60, 0.7)',
      frameInlay: 'rgba(254, 215, 170, 0.45)',
      frameGlow: '0 25px 60px rgba(251, 146, 60, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      windowBorder: '1.5px solid rgba(254, 215, 170, 0.6)',
      windowGlow: '0 8px 24px rgba(249, 115, 22, 0.32), inset 0 2px 6px rgba(0, 0, 0, 0.35)',
      btnGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 45%, #fb923c 80%, #fed7aa 100%)',
      btnGlow: 'rgba(249, 115, 22, 0.55)',
      btnGlowStrong: 'rgba(249, 115, 22, 0.85)',
      defaultMedia: '/assets/media/lock/theme-cute-pastel.jpg',
      bg: 'radial-gradient(ellipse at top, #2d1e28 0%, #18101a 60%, #0d080e 100%)',
      cardBg: 'linear-gradient(145deg, rgba(254, 215, 170, 0.18), rgba(251, 191, 36, 0.1))',
      cardBorder: 'rgba(251, 146, 60, 0.55)',
      cardShadow: '0 25px 60px rgba(251, 146, 60, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      accent: '#fb923c',
      accentGlow: 'rgba(251, 146, 60, 0.8)',
      textColor: '#ffffff',
      subtextColor: '#fed7aa',
      slotBg: 'rgba(255, 255, 255, 0.12)',
      slotBorder: 'rgba(251, 146, 60, 0.55)',
      slotActive: '#fb923c',
      buttonBg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.22), rgba(254, 215, 170, 0.15))',
      buttonText: '#ffffff',
      buttonBorder: 'rgba(255, 255, 255, 0.35)',
      buttonActive: 'linear-gradient(145deg, rgba(251, 146, 60, 0.7), rgba(249, 115, 22, 0.5))',
      tumblerRim: 'linear-gradient(180deg, #fed7aa 0%, #9a3412 50%, #fed7aa 100%)',
      tumblerBg: 'linear-gradient(180deg, #120a14 0%, #241624 50%, #120a14 100%)',
      confetti: ['#fb923c', '#f472b6', '#38bdf8', '#fed7aa', '#ffffff']
    }
  };

  // Zero-latency Web Audio Synthesizer - Sounds ON by default
  function createSoundEngine(soundEnabled = true, win = null) {
    let audioCtx = null;
    let muted = (soundEnabled === false);

    function getAudioCtx() {
      if (!audioCtx) {
        try {
          const targetWin = win || (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null));
          const AudioContextClass = targetWin && (targetWin.AudioContext || targetWin.webkitAudioContext);
          if (AudioContextClass) audioCtx = new AudioContextClass();
        } catch (e) {}
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    function playTick() {
      if (muted) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.02);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      } catch(e) {}
    }

    function resumeAudio() {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }

    // Authentic Mechanical Combination Lock Ratchet & Tumbler Gear Click
    function playTumbler() {
      if (muted) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      try {
        const t0 = ctx.currentTime;
        // Organic micro-detune so consecutive gear teeth clicks feel physical and tactile
        const detune = (Math.random() - 0.5) * 60;

        // 1. High metallic spring-pawl snap (transient attack 0 - 15ms)
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        const snapFilter = ctx.createBiquadFilter();

        snapFilter.type = 'bandpass';
        snapFilter.frequency.setValueAtTime(3200 + detune * 4, t0);
        snapFilter.Q.setValueAtTime(6, t0);

        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(4200, t0);
        snapOsc.frequency.exponentialRampToValueAtTime(800, t0 + 0.012);

        snapGain.gain.setValueAtTime(0.35, t0);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.015);

        snapOsc.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(ctx.destination);

        snapOsc.start(t0);
        snapOsc.stop(t0 + 0.018);

        // 2. Secondary pawl rebound tap (settling into gear tooth 7ms - 24ms)
        const tapOsc = ctx.createOscillator();
        const tapGain = ctx.createGain();
        const tapFilter = ctx.createBiquadFilter();

        tapFilter.type = 'bandpass';
        tapFilter.frequency.setValueAtTime(2100 + detune * 2, t0 + 0.006);
        tapFilter.Q.setValueAtTime(4.5, t0 + 0.006);

        tapOsc.type = 'square';
        tapOsc.frequency.setValueAtTime(2400, t0 + 0.006);
        tapOsc.frequency.exponentialRampToValueAtTime(400, t0 + 0.022);

        tapGain.gain.setValueAtTime(0.0, t0);
        tapGain.gain.setValueAtTime(0.24, t0 + 0.006);
        tapGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.024);

        tapOsc.connect(tapFilter);
        tapFilter.connect(tapGain);
        tapGain.connect(ctx.destination);

        tapOsc.start(t0 + 0.006);
        tapOsc.stop(t0 + 0.026);

        // 3. Resonant metallic body ring (brass/steel tumbler clink 0 - 45ms)
        const ringOsc = ctx.createOscillator();
        const ringGain = ctx.createGain();

        ringOsc.type = 'sine';
        ringOsc.frequency.setValueAtTime(980 + detune, t0);
        ringOsc.frequency.exponentialRampToValueAtTime(420, t0 + 0.045);

        ringGain.gain.setValueAtTime(0.18, t0);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

        ringOsc.connect(ringGain);
        ringGain.connect(ctx.destination);

        ringOsc.start(t0);
        ringOsc.stop(t0 + 0.05);

        // 4. Low mechanical lock housing thump (tactile inertia)
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();

        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(190, t0);
        thudOsc.frequency.exponentialRampToValueAtTime(60, t0 + 0.035);

        thudGain.gain.setValueAtTime(0.22, t0);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);

        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);

        thudOsc.start(t0);
        thudOsc.stop(t0 + 0.04);
      } catch(e) {}
    }

    function playBeep(noteIndex = 0) {
      if (muted) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      try {
        const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
        const freq = notes[noteIndex % notes.length] || 523.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      } catch(e) {}
    }

    function playUnlock(audioEl) {
      if (muted) return;
      if (audioEl) {
        try {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        } catch(e) {}
      }
    }

    function playWrong(audioEl) {
      if (muted) return;
      if (audioEl) {
        try {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        } catch(e) {}
      }
    }

    return {
      playTick,
      playTumbler,
      playBeep,
      playUnlock,
      playWrong,
      resumeAudio,
      isMuted: () => muted,
      setMuted: (val) => { muted = !!val; }
    };
  }

  // Thematic SVG Illustrations
  function getThematicIllustration(themeId) {
    if (themeId === 'romantic-pink') {
      return '<svg viewBox="0 0 240 180" class="lock-thematic-svg"><defs><linearGradient id="rp-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe29f"/><stop offset="50%" stop-color="#d4af37"/><stop offset="100%" stop-color="#8a6d1b"/></linearGradient><linearGradient id="rp-heart" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff75a0"/><stop offset="50%" stop-color="#ff4382"/><stop offset="100%" stop-color="#c9184a"/></linearGradient><radialGradient id="rp-bear" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#fff5f0"/><stop offset="60%" stop-color="#eddcd2"/><stop offset="100%" stop-color="#d5bdaf"/></radialGradient></defs><circle cx="120" cy="95" r="75" fill="rgba(255, 105, 180, 0.15)"/><path d="M 98 75 V 45 C 98 25 142 25 142 45 V 75" fill="none" stroke="url(#rp-gold)" stroke-width="12" stroke-linecap="round"/><circle cx="50" cy="45" r="16" fill="url(#rp-bear)"/><circle cx="50" cy="45" r="9" fill="#ffb3c6"/><circle cx="85" cy="40" r="14" fill="url(#rp-bear)"/><circle cx="85" cy="40" r="8" fill="#ffb3c6"/><ellipse cx="65" cy="62" rx="26" ry="24" fill="url(#rp-bear)"/><ellipse cx="58" cy="64" rx="10" ry="8" fill="#fff"/><ellipse cx="56" cy="62" rx="4" ry="2.5" fill="#4a2e2b"/><circle cx="53" cy="56" r="3" fill="#331811"/><circle cx="65" cy="54" r="3" fill="#331811"/><circle cx="54" cy="55" r="1" fill="#fff"/><circle cx="66" cy="53" r="1" fill="#fff"/><circle cx="48" cy="63" r="3" fill="#ff99bb" opacity="0.6"/><circle cx="70" cy="61" r="3" fill="#ff99bb" opacity="0.6"/><ellipse cx="88" cy="78" rx="11" ry="8" fill="url(#rp-bear)" transform="rotate(-15 88 78)"/><path d="M 120 70 C 100 45 65 55 68 90 C 70 120 120 155 120 155 C 120 155 170 120 172 90 C 175 55 140 45 120 70 Z" fill="url(#rp-heart)" stroke="url(#rp-gold)" stroke-width="4"/><path d="M 120 78 C 106 58 80 65 82 92 C 84 114 120 142 120 142 C 120 142 156 114 158 92 C 160 65 134 58 120 78 Z" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/><circle cx="120" cy="98" r="7" fill="#3a0418"/><polygon points="116,98 124,98 126,114 114,114" fill="#3a0418"/><path d="M 142 56 C 158 45 175 52 165 65 C 152 75 140 60 142 56 Z" fill="#ff75a0"/><path d="M 142 56 C 132 42 122 55 135 65 C 145 72 142 56 142 56 Z" fill="#ff4382"/><circle cx="140" cy="60" r="5" fill="#c9184a"/><circle cx="175" cy="130" r="12" fill="#e63946"/><circle cx="173" cy="128" r="8" fill="#ff4d6d"/><circle cx="192" cy="140" r="10" fill="#c9184a"/><polygon points="190,35 193,42 200,45 193,48 190,55 187,48 180,45 187,42" fill="#ffd166"/><polygon points="30,60 32,65 37,67 32,69 30,74 28,69 23,67 28,65" fill="#ffd166"/></svg>';
    } else if (themeId === 'dreamy-purple') {
      return '<svg viewBox="0 0 240 180" class="lock-thematic-svg"><defs><linearGradient id="dp-moon" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fffbeb"/><stop offset="60%" stop-color="#fde047"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient><linearGradient id="dp-star" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#facc15"/></linearGradient><linearGradient id="dp-cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.4)"/><stop offset="100%" stop-color="rgba(192,132,252,0.2)"/></linearGradient></defs><path d="M 175 35 C 145 35 125 55 125 85 C 125 115 150 135 180 135 C 160 135 142 120 142 85 C 142 55 160 38 175 35 Z" fill="url(#dp-moon)"/><path d="M 50 145 C 40 145 30 138 32 126 C 33 115 45 110 52 112 C 58 100 75 96 86 104 C 95 92 115 90 128 100 C 140 92 162 96 168 110 C 178 110 186 118 185 128 C 184 138 175 145 165 145 Z" fill="url(#dp-cloud)"/><ellipse cx="95" cy="120" rx="30" ry="22" fill="#ffffff"/><polygon points="75,100 82,82 92,94" fill="#ffffff"/><polygon points="78,98 83,87 90,95" fill="#f472b6"/><polygon points="102,94 112,82 118,100" fill="#ffffff"/><polygon points="105,95 111,87 116,98" fill="#f472b6"/><ellipse cx="95" cy="108" rx="20" ry="16" fill="#ffffff"/><path d="M 86 108 Q 90 103 94 108" fill="none" stroke="#4c1d95" stroke-width="2.5" stroke-linecap="round"/><path d="M 102 108 Q 106 103 110 108" fill="none" stroke="#4c1d95" stroke-width="2.5" stroke-linecap="round"/><polygon points="98,111 96,114 100,114" fill="#f472b6"/><polygon points="125,95 132,108 146,110 136,120 138,135 125,127 112,135 114,120 104,110 118,108" fill="url(#dp-star)"/><circle cx="118" cy="116" r="6" fill="#fff"/><circle cx="132" cy="116" r="6" fill="#fff"/><line x1="60" y1="20" x2="60" y2="60" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 2"/><polygon points="60,60 63,66 70,67 65,72 66,79 60,75 54,79 55,72 50,67 57,66" fill="#facc15"/><line x1="195" y1="20" x2="195" y2="70" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 2"/><polygon points="195,70 197,75 203,76 199,80 200,86 195,83 190,86 191,80 187,76 193,75" fill="#facc15"/></svg>';
    } else if (themeId === 'luxury-gold') {
      return '<svg viewBox="0 0 240 180" class="lock-thematic-svg"><defs><linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fffbeb"/><stop offset="25%" stop-color="#fef08a"/><stop offset="50%" stop-color="#eab308"/><stop offset="75%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#854d0e"/></linearGradient><linearGradient id="lg-ruby" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff4d6d"/><stop offset="100%" stop-color="#800f2f"/></linearGradient></defs><circle cx="120" cy="90" r="75" fill="rgba(234,179,8,0.18)"/><path d="M 60 120 C 100 130 140 130 180 120 L 175 135 C 140 145 100 145 65 135 Z" fill="url(#lg-gold)"/><circle cx="85" cy="128" r="4" fill="url(#lg-ruby)"/><circle cx="120" cy="132" r="5" fill="#38bdf8"/><circle cx="155" cy="128" r="4" fill="url(#lg-ruby)"/><path d="M 60 120 L 65 75 L 90 95 L 120 50 L 150 95 L 175 75 L 180 120 Z" fill="url(#lg-gold)" stroke="#fef08a" stroke-width="2"/><circle cx="65" cy="72" r="6" fill="#fef08a"/><circle cx="90" cy="93" r="5" fill="url(#lg-ruby)"/><circle cx="120" cy="46" r="8" fill="#fff" stroke="#facc15" stroke-width="2"/><circle cx="150" cy="93" r="5" fill="url(#lg-ruby)"/><circle cx="175" cy="72" r="6" fill="#fef08a"/><polygon points="120,30 123,38 131,41 123,44 120,52 117,44 109,41 117,38" fill="#fff"/><circle cx="55" cy="142" r="14" fill="#991b1b"/><circle cx="53" cy="140" r="10" fill="#dc2626"/><circle cx="185" cy="142" r="14" fill="#991b1b"/><circle cx="187" cy="140" r="10" fill="#dc2626"/><polygon points="40,65 42,72 49,74 42,76 40,83 38,76 31,74 38,72" fill="#fef08a"/><polygon points="200,65 202,72 209,74 202,76 200,83 198,76 191,74 198,72" fill="#fef08a"/></svg>';
    } else if (themeId === 'elegant-silver') {
      return '<svg viewBox="0 0 240 180" class="lock-thematic-svg"><defs><linearGradient id="es-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="35%" stop-color="#cbd5e1"/><stop offset="55%" stop-color="#94a3b8"/><stop offset="85%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#64748b"/></linearGradient><linearGradient id="es-gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="50%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><circle cx="120" cy="90" r="75" fill="rgba(56,189,248,0.15)"/><polygon points="120,25 185,75 120,160 55,75" fill="url(#es-chrome)" stroke="#ffffff" stroke-width="3"/><polygon points="120,40 165,80 120,145 75,80" fill="url(#es-gem)" opacity="0.9"/><polygon points="120,40 120,145 75,80" fill="rgba(255,255,255,0.2)"/><polygon points="120,40 165,80 120,95" fill="rgba(255,255,255,0.4)"/><polygon points="120,15 123,28 136,31 123,34 120,47 117,34 104,31 117,28" fill="#fff"/><polygon points="60,70 62,77 69,79 62,81 60,88 58,81 51,79 58,77" fill="#fff"/><polygon points="180,70 182,77 189,79 182,81 180,88 178,81 171,79 178,77" fill="#fff"/></svg>';
    } else {
      // cute-pastel
      return '<svg viewBox="0 0 240 180" class="lock-thematic-svg"><defs><linearGradient id="cp-box" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fed7aa"/><stop offset="50%" stop-color="#fdba74"/><stop offset="100%" stop-color="#fb923c"/></linearGradient></defs><circle cx="85" cy="45" r="14" fill="#d97706"/><circle cx="85" cy="45" r="8" fill="#fed7aa"/><circle cx="155" cy="45" r="14" fill="#d97706"/><circle cx="155" cy="45" r="8" fill="#fed7aa"/><circle cx="120" cy="65" r="32" fill="#b45309"/><polygon points="120,15 105,45 135,45" fill="#f43f5e"/><circle cx="120" cy="15" r="4" fill="#fef08a"/><ellipse cx="120" cy="72" rx="14" ry="11" fill="#fed7aa"/><ellipse cx="120" cy="68" rx="5" ry="3.5" fill="#451a03"/><circle cx="108" cy="62" r="3.5" fill="#1c1917"/><circle cx="132" cy="62" r="3.5" fill="#1c1917"/><rect x="75" y="95" width="90" height="65" rx="10" fill="url(#cp-box)" stroke="#f97316" stroke-width="2"/><rect x="112" y="95" width="16" height="65" fill="#f43f5e"/><rect x="75" y="122" width="90" height="12" fill="#f43f5e"/><path d="M 120 95 C 105 80 85 90 102 98 C 112 102 120 95 120 95 Z" fill="#f43f5e"/><circle cx="120" cy="96" r="5" fill="#e11d48"/><ellipse cx="80" cy="110" rx="9" ry="7" fill="#b45309" transform="rotate(20 80 110)"/><ellipse cx="160" cy="110" rx="9" ry="7" fill="#b45309" transform="rotate(-20 160 110)"/><circle cx="45" cy="50" r="3" fill="#f43f5e"/><rect x="185" y="45" width="6" height="6" fill="#38bdf8" transform="rotate(25 185 45)"/><polygon points="55,140 58,146 64,148 58,150 55,156 52,150 46,148 52,146" fill="#facc15"/></svg>';
    }
  }

  // Parse config helper
  function parseLockConfig(lockConfig) {
    const cfg = (typeof lockConfig === 'object' && lockConfig !== null) ? lockConfig : { text: String(lockConfig || '1234') };
    const rawText = (cfg.text && String(cfg.text).trim()) ? String(cfg.text).trim() : '1234';
    let lockType = cfg.lockType || 'keypad';
    if (lockType === 'rotary') lockType = 'keypad'; // Fallback if rotary requested
    const themeId = cfg.theme || 'romantic-pink';

    // Smart auto-detection of digits from numeric code length (3-6)
    let numericCode = rawText.replace(/\D/g, '');
    if (!numericCode) numericCode = '1234';
    let digits = Math.max(3, Math.min(6, numericCode.length));
    if (numericCode.length < digits) numericCode = numericCode.padEnd(digits, '0');
    if (numericCode.length > digits) numericCode = numericCode.slice(0, digits);

    const hintEnabled = !!cfg.hintEnabled;
    const hintText = (cfg.hintText && String(cfg.hintText).trim()) ? String(cfg.hintText).trim() : '';
    const customImage = cfg.customImage || '';
    const soundEnabled = true; // Sounds always ON by default

    return {
      rawText,
      lockType,
      themeId,
      digits,
      hintEnabled,
      hintText,
      customImage,
      soundEnabled,
      numericCode
    };
  }

  // Inject or ensure CSS styles in document
  function injectLockStyles(doc, theme) {
    if (doc.getElementById('greeter-lock-styles')) {
      doc.getElementById('greeter-lock-styles').remove();
    }
    const style = doc.createElement('style');
    style.id = 'greeter-lock-styles';
    style.setAttribute('data-lock-styles', 'true');
    style.textContent = `
      #lock-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483649;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #ffffff;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        opacity: 0;
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        padding: clamp(6px, 1.5vh, 14px);
        box-sizing: border-box;
        overflow: hidden; /* Zero scrollbar: Auto-Fit engine dynamically scales content to 100% viewport fit */
        --theme-card-bg: ${theme.cardBg};
        --theme-card-border: ${theme.cardBorder};
        --theme-card-shadow: ${theme.cardShadow};
        --theme-frame-border: ${theme.frameBorder || ('2px solid ' + theme.cardBorder)};
        --theme-frame-inlay: ${theme.frameInlay || 'rgba(255,255,255,0.35)'};
        --theme-frame-glow: ${theme.frameGlow || theme.cardShadow};
        --theme-window-border: ${theme.windowBorder || '1.5px solid rgba(255,255,255,0.35)'};
        --theme-window-glow: ${theme.windowGlow || '0 8px 24px rgba(0,0,0,0.35)'};
        --theme-accent: ${theme.accent};
        --theme-accent-glow: ${theme.accentGlow || theme.accent};
      }
      #lock-overlay * {
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
      }
      .lock-mute-btn {
        position: absolute;
        top: clamp(10px, 1.8vh, 16px);
        right: clamp(10px, 1.8vw, 16px);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.25);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        z-index: 40;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .lock-mute-btn:hover {
        background: rgba(255,255,255,0.25);
        transform: scale(1.06);
      }

      /* Unified Content Wrapper: On Mobile, combines both image and keypad into ONE seamless card */
      .lock-content-wrap {
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: clamp(320px, 92vw, 420px);
        margin: auto;
        box-sizing: border-box;
        border-radius: clamp(24px, 4.5vw, 32px);
        background: var(--theme-card-bg, rgba(255, 255, 255, 0.08));
        border: 1.5px solid var(--theme-card-border, rgba(255, 255, 255, 0.28));
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.42), var(--theme-card-shadow, inset 0 1px 0 rgba(255, 255, 255, 0.25));
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        padding: clamp(14px, 2.2vh, 20px) clamp(14px, 3.5vw, 22px);
        gap: clamp(6px, 1.2vh, 10px);
        transform-origin: center center;
        will-change: transform;
        transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Single Column Stage Elements on Mobile */
      .lock-stage-left {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .lock-stage-right {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        text-align: center;
      }

      /* Mobile Hero Picture Presentation (Seamlessly Integrated inside the Unified Card) */
      .lock-arch-card {
        position: relative;
        width: auto !important;
        max-width: 100% !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        padding: 0 !important;
        animation: none !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        margin: 0 auto;
      }
      .lock-card-halo {
        display: none !important;
      }
      .lock-frame-corner {
        display: none !important;
      }
      .lock-arch-badge {
        position: absolute;
        top: -11px;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.22);
        border: 1.5px solid rgba(255, 255, 255, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        z-index: 8;
      }
      /* Mobile Picture Display Window: Enlarged, 1:1 Aspect Ratio with Zero-Cutting */
      .lock-arch-window {
        position: relative;
        width: clamp(140px, 22vh, 180px);
        aspect-ratio: 1 / 1;
        height: auto;
        border-radius: clamp(18px, 3.2vw, 24px);
        overflow: hidden;
        border: 1.8px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.38), inset 0 1px 3px rgba(255, 255, 255, 0.35);
        background: rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 4px auto clamp(4px, 1vh, 8px) auto;
      }
      .lock-media-img {
        width: 100%;
        height: 100%;
        object-fit: contain; /* Guarantees 100% full picture with zero cutting */
        display: block;
        border-radius: inherit;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .lock-arch-card:hover .lock-media-img {
        transform: scale(1.03);
      }
      .lock-thematic-svg {
        width: 100%;
        height: 100%;
        display: block;
        transition: transform 0.4s ease;
      }
      .lock-custom-img-wrap {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lock-custom-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      /* Hide redundant ribbon subtitle on mobile */
      .lock-arch-subtitle {
        display: none !important;
      }

      /* Mobile Interactive Keypad Section (Seamlessly inside the Unified Card) */
      .lock-card {
        position: relative;
        width: 100% !important;
        max-width: 100% !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        transition: all 0.3s ease;
        margin: 0 auto !important;
      }
      /* Hide redundant eyebrow tag on mobile */
      .lock-eyebrow {
        display: none !important;
      }
      .lock-title {
        font-size: clamp(1.25rem, 4.4vw, 1.55rem);
        font-weight: 800;
        font-family: 'Outfit', 'Inter', sans-serif;
        letter-spacing: -0.3px;
        margin: 0 0 2px 0;
        line-height: 1.15;
      }
      .lock-subtitle {
        font-size: clamp(0.8rem, 2.8vw, 0.92rem);
        margin: 0 0 clamp(8px, 1.3vh, 12px) 0;
        opacity: 0.88;
      }
      .lock-hint-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.22);
        font-size: 11px;
        margin-bottom: 8px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .lock-status-msg {
        min-height: 14px;
        font-size: 11px;
        font-weight: 600;
        margin-top: 4px;
        transition: color 0.3s;
      }
      .lock-status-msg.error {
        color: #ef4444;
      }
      /* Hide redundant footer note on mobile */
      .lock-footer-note {
        display: none !important;
      }

      /* === TABLET, LAPTOP & PC RESPONSIVE TWO-SECTION LAYOUT (Large, Majestic & Perfectly Balanced) === */
      @media (min-width: 650px) and (min-height: 380px) {
        #lock-overlay {
          padding: clamp(14px, 2.5vh, 40px) clamp(16px, 2.5vw, 48px) !important;
          justify-content: center !important;
        }
        .lock-content-wrap {
          flex-direction: row !important;
          justify-content: center !important;
          align-items: center !important;
          max-width: clamp(980px, 88vw, 1280px) !important;
          gap: clamp(28px, 4.8vw, 72px) !important;
          padding: clamp(8px, 1.4vh, 20px) !important;
          margin: auto !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .lock-stage-left {
          flex: 0 0 auto !important;
          justify-content: flex-end !important;
          align-items: center !important;
          width: auto !important;
        }
        .lock-stage-left .lock-arch-card {
          width: clamp(320px, 30vw, 440px) !important;
          padding: clamp(14px, 1.6vw, 20px) clamp(14px, 1.6vw, 20px) clamp(16px, 1.8vh, 22px) clamp(14px, 1.6vw, 20px) !important;
          border-radius: clamp(26px, 2.8vw, 36px) !important;
          background: var(--theme-card-bg) !important;
          border: var(--theme-frame-border) !important;
          box-shadow: var(--theme-frame-glow) !important;
          outline: 1.5px solid var(--theme-frame-inlay) !important;
          outline-offset: -5px !important;
          animation: floatLockCard 4.6s ease-in-out infinite !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .lock-stage-left .lock-card-halo {
          display: block !important;
        }
        .lock-stage-left .lock-arch-window {
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: clamp(18px, 2vw, 24px) !important;
          margin: 0 auto !important;
          border: var(--theme-window-border) !important;
          box-shadow: var(--theme-window-glow) !important;
        }
        .lock-stage-left .lock-arch-badge {
          top: -14px !important;
          width: 34px !important;
          height: 34px !important;
          font-size: 16px !important;
        }
        .lock-stage-left .lock-arch-subtitle {
          display: flex !important;
          margin-top: clamp(10px, 1.4vh, 14px) !important;
          font-size: clamp(0.72rem, 1vw, 0.86rem) !important;
          letter-spacing: 2px !important;
        }
        .lock-stage-right {
          flex: 0 1 auto !important;
          align-items: center !important;
          justify-content: center !important;
          max-width: clamp(380px, 42vw, 540px) !important;
          text-align: center !important;
        }
        .lock-stage-right .lock-card {
          width: 100% !important;
          max-width: 100% !important;
          padding: clamp(18px, 2.6vh, 32px) clamp(20px, 2.6vw, 36px) !important;
          border-radius: 28px !important;
          background: var(--theme-card-bg) !important;
          border: 1.5px solid var(--theme-card-border) !important;
          box-shadow: var(--theme-card-shadow) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
        }
        .lock-stage-right .lock-eyebrow {
          display: inline-flex !important;
          font-size: clamp(0.72rem, 1vw, 0.88rem) !important;
          letter-spacing: 2.4px !important;
          margin-bottom: clamp(4px, 0.8vh, 8px) !important;
        }
        .lock-stage-right .lock-title {
          font-size: clamp(1.6rem, 2.8vw, 2.5rem) !important;
          letter-spacing: -0.4px !important;
          margin: 0 0 clamp(4px, 0.8vh, 8px) 0 !important;
        }
        .lock-stage-right .lock-subtitle {
          font-size: clamp(0.88rem, 1.2vw, 1.08rem) !important;
          margin-bottom: clamp(10px, 1.6vh, 16px) !important;
        }
        .lock-stage-right .lock-footer-note {
          display: block !important;
          font-size: clamp(0.7rem, 0.95vw, 0.82rem) !important;
          opacity: 0.68;
          margin-top: clamp(8px, 1.2vh, 12px) !important;
          letter-spacing: 0.5px !important;
        }
      }

      /* === MODERN GLASSMORPHIC NUMERIC KEYPAD === */
      .keypad-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: clamp(280px, 30vw, 380px);
        margin: 0 auto;
        box-sizing: border-box;
      }
      .keypad-slots-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: clamp(8px, 1.6vw, 15px);
        margin: clamp(6px, 1vh, 10px) auto clamp(12px, 1.8vh, 20px);
        width: 100%;
        transition: transform 0.25s ease;
      }
      .keypad-slot {
        position: relative;
        width: clamp(42px, 4.4vw, 58px);
        height: clamp(46px, 4.8vw, 62px);
        border-radius: 18px;
        border: 2px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.35);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      .keypad-slot.filled {
        transform: translateY(-2px) scale(1.05);
        background: rgba(255, 255, 255, 0.18);
      }
      .keypad-slot-dot {
        font-size: clamp(20px, 2vw, 26px);
        font-weight: 700;
        line-height: 1;
        opacity: 0;
        transform: scale(0.2);
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-shadow: 0 0 14px currentColor;
        pointer-events: none;
      }
      .keypad-slot.filled .keypad-slot-dot {
        opacity: 1;
        transform: scale(1);
      }
      .keypad-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: clamp(6px, 1.1vh, 12px) clamp(10px, 1.8vw, 16px);
        width: 100%;
        max-width: clamp(270px, 28vw, 360px);
        margin: 0 auto;
        box-sizing: border-box;
      }
      .keypad-btn {
        position: relative;
        width: 100%;
        height: clamp(44px, 5.8vh, 58px);
        max-width: 96px;
        border-radius: 999px;
        font-family: 'Outfit', 'Poppins', 'Inter', -apple-system, sans-serif;
        font-size: clamp(1.2rem, 1.8vw, 1.5rem);
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        box-sizing: border-box;
        border: 1.5px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22), inset 0 2px 2px rgba(255, 255, 255, 0.35);
        color: #ffffff;
        transition: transform 0.12s ease, background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }
      .keypad-btn:hover {
        background: rgba(255, 255, 255, 0.24);
        border-color: rgba(255, 255, 255, 0.55);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.32), inset 0 2px 3px rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
      }
      .keypad-btn:active {
        transform: scale(0.92);
        background: rgba(255, 255, 255, 0.38);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      }
      .keypad-btn.action-btn {
        font-size: clamp(1rem, 1.6vw, 1.25rem);
        color: rgba(255, 255, 255, 0.88);
        background: rgba(255, 255, 255, 0.08);
      }
      .keypad-btn.action-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .lock-cta-btn {
        position: relative;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: clamp(11px, 1.6vh, 15px) clamp(30px, 3.5vw, 44px);
        border-radius: 999px;
        border: 1.5px solid rgba(255, 255, 255, 0.45);
        background: var(--btn-gradient, linear-gradient(135deg, #7b5df6, #ff7a2f));
        color: #ffffff;
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        font-size: clamp(13px, 1.4vw, 16px);
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4), 0 0 24px var(--btn-glow, rgba(123, 93, 246, 0.4)), inset 0 1.5px 0 rgba(255, 255, 255, 0.55), inset 0 -2px 0 rgba(0, 0, 0, 0.25);
        transition: all 0.28s cubic-bezier(0.2, 0.85, 0.35, 1.2);
        user-select: none;
        -webkit-user-select: none;
        margin-top: clamp(10px, 1.6vh, 16px);
      }
      .lock-cta-btn:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), 0 0 32px var(--btn-glow-strong, rgba(123, 93, 246, 0.7)), inset 0 1.5px 0 rgba(255, 255, 255, 0.7);
        border-color: rgba(255, 255, 255, 0.7);
      }
      .lock-cta-btn:active {
        transform: translateY(1px) scale(0.97);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), 0 0 16px var(--btn-glow, rgba(123, 93, 246, 0.3));
      }

      /* === 3D ROLLING TUMBLER WHEELS === */
      .tumbler-chassis {
        position: relative;
        width: 100%;
        max-width: 380px;
        padding: 16px 14px;
        border-radius: 22px;
        border: 2px solid rgba(255,255,255,0.25);
        box-shadow: 0 18px 40px rgba(0,0,0,0.55), inset 0 2px 4px rgba(255,255,255,0.25);
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .tumbler-chassis::before {
        content: '';
        position: absolute;
        top: 7px;
        left: 7px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #94a3b8;
        box-shadow: 0 0 4px rgba(0,0,0,0.6);
      }
      .tumbler-chassis::after {
        content: '';
        position: absolute;
        top: 7px;
        right: 7px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #94a3b8;
        box-shadow: 0 0 4px rgba(0,0,0,0.6);
      }
      .tumbler-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 1;
        max-width: 68px;
      }
      .tumbler-arrow {
        width: 36px;
        height: 28px;
        border-radius: 10px;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.25);
        color: #ffffff;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.2, 0.85, 0.35, 1.2);
        user-select: none;
      }
      .tumbler-arrow:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.12);
        box-shadow: 0 0 10px rgba(255,255,255,0.3);
      }
      .tumbler-arrow:active {
        transform: scale(0.92);
      }
      .tumbler-cylinder {
        position: relative;
        width: 100%;
        height: 90px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow: inset 0 14px 16px -4px rgba(0,0,0,0.85), inset 0 -14px 16px -4px rgba(0,0,0,0.85), 0 6px 14px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        cursor: grab;
        touch-action: none;
        perspective: 340px;
      }
      .tumbler-cylinder:active {
        cursor: grabbing;
      }
      .tumbler-cylinder-lens {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 42px;
        transform: translateY(-50%);
        border-top: 1.5px solid rgba(255,255,255,0.35);
        border-bottom: 1.5px solid rgba(255,255,255,0.35);
        background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.14) 100%);
        pointer-events: none;
        z-index: 5;
        box-shadow: 0 0 14px rgba(0,0,0,0.25);
      }
      .tumbler-drum {
        position: absolute;
        inset: 0;
        transform-style: preserve-3d;
        display: flex;
        align-items: center;
        justify-content: center;
        will-change: transform;
      }
      .tumbler-drum-digit {
        position: absolute;
        width: 100%;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 28px;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        user-select: none;
        transition: color 0.2s, opacity 0.2s, text-shadow 0.2s;
      }

      /* === Classic Lock Styles === */
      .classic-container {
        width: 100%;
        max-width: 340px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .classic-input-wrap {
        width: 100%;
        position: relative;
      }
      .classic-input {
        width: 100%;
        padding: 16px 20px;
        border-radius: 30px;
        border: 2px solid rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.1);
        color: #ffffff;
        font-size: 16px;
        text-align: center;
        outline: none;
        transition: all 0.3s;
      }
      .classic-input:focus {
        border-color: #ffffff;
        box-shadow: 0 0 20px rgba(255,255,255,0.3);
      }

      /* === LUXURY UNLOCK LATCH BUTTON === */
      .lock-cta-btn {
        position: relative;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: clamp(10px, 1.5vh, 13px) clamp(26px, 3.5vw, 36px);
        border-radius: 999px;
        border: 1.5px solid rgba(255, 255, 255, 0.45);
        background: var(--btn-gradient, linear-gradient(135deg, #7b5df6, #ff7a2f));
        color: #ffffff;
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4), 0 0 24px var(--btn-glow, rgba(123, 93, 246, 0.4)), inset 0 1.5px 0 rgba(255, 255, 255, 0.55), inset 0 -2px 0 rgba(0, 0, 0, 0.25);
        transition: all 0.28s cubic-bezier(0.2, 0.85, 0.35, 1.2);
        user-select: none;
        -webkit-user-select: none;
        margin-top: clamp(8px, 1.4vh, 14px);
      }
      .lock-cta-btn:hover {
        transform: translateY(-2px) scale(1.025);
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5), 0 0 32px var(--btn-glow-strong, rgba(123, 93, 246, 0.65)), inset 0 1.5px 0 rgba(255, 255, 255, 0.7);
        border-color: rgba(255, 255, 255, 0.7);
      }
      .lock-cta-btn:active {
        transform: translateY(2px) scale(0.98);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45), inset 0 2px 4px rgba(0, 0, 0, 0.35);
      }
      .lock-btn-sheen {
        position: absolute;
        top: -50%;
        left: -60%;
        width: 40%;
        height: 200%;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.38) 50%, transparent 100%);
        transform: rotate(25deg);
        pointer-events: none;
        animation: unlockBtnShine 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes unlockBtnShine {
        0%, 30% { left: -60%; }
        60%, 100% { left: 140%; }
      }
      .lock-btn-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      .lock-cta-btn:hover .lock-btn-icon-wrap {
        transform: scale(1.18) rotate(-8deg);
      }
      .lock-btn-sparkle {
        font-size: 14px;
        opacity: 0.85;
        animation: pulseSparkle 2s infinite ease-in-out;
      }
      @keyframes pulseSparkle {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
        50% { transform: scale(1.3) rotate(15deg); opacity: 1; }
      }
      /* === Celebration Overlay === */
      .lock-celebration-overlay {
        position: absolute;
        inset: 0;
        border-radius: 28px;
        background: rgba(15, 7, 24, 0.88);
        backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.9);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 50;
      }
      .lock-celebration-overlay.active {
        opacity: 1;
        pointer-events: auto;
        transform: scale(1);
      }
      .celebration-icon {
        font-size: 56px;
        margin-bottom: 8px;
        animation: lockCelebrationBounce 1s infinite alternate cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .celebration-title {
        font-size: 32px;
        font-weight: 900;
        font-family: 'Outfit', sans-serif;
        background: linear-gradient(135deg, #fef08a 0%, #facc15 50%, #ea580c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0 0 6px 0;
        text-align: center;
      }
      .celebration-subtitle {
        font-size: 16px;
        color: #fed7aa;
        margin: 0;
        text-align: center;
      }

      /* === Animations === */
      @keyframes lockHintPulse {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.03); }
      }
      @keyframes lockShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-12px); }
        40% { transform: translateX(12px); }
        60% { transform: translateX(-8px); }
        80% { transform: translateX(8px); }
      }
      .lock-shake {
        animation: lockShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      }
      @keyframes lockCelebrationBounce {
        0% { transform: scale(1) translateY(0); }
        100% { transform: scale(1.15) translateY(-8px); }
      }
      .lock-float-particle {
        position: absolute;
        pointer-events: none;
        border-radius: 50%;
        animation: lockFloatUp var(--dur, 3s) infinite ease-in-out;
      }
      @keyframes lockFloatUp {
        0% { transform: translateY(0) scale(0.8); opacity: 0; }
        30% { opacity: 0.7; }
        80% { opacity: 0.6; }
        100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
      }
    `;
    (doc.head || doc.body).appendChild(style);
  }

  // Remove Greeter Lock
  function removeGreeterLock(doc, win, isEditorPreview) {
    if (!doc) return;
    const overlay = doc.getElementById('lock-overlay');
    if (overlay) {
      if (typeof overlay._fitCleanup === 'function') {
        try { overlay._fitCleanup(); } catch(e){}
      }
      overlay.remove();
    }
    if (doc.body) doc.body.classList.remove('magic-noscroll');
    // When lock is removed or disabled, mark unlocked and notify any deferred features
    if (win) win.lockUnlocked = true;
    if (typeof window !== 'undefined') window.lockUnlocked = true;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}
    try { if (win && win !== window) win.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}
    try { if (doc && typeof doc.dispatchEvent === 'function') doc.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}

    if (isEditorPreview && typeof editModeBeforeLock !== 'undefined' && typeof editModeActive !== 'undefined') {
      if (editModeBeforeLock && editModeActive) {
        if (doc && doc.body) doc.body.contentEditable = true;
      } else {
        if (doc && doc.body) doc.body.contentEditable = false;
      }
    }
    const lockStyles = doc.getElementById('greeter-lock-styles') || doc.querySelector('style[data-lock-styles]');
    if (lockStyles) lockStyles.remove();
  }

  // Render Greeter Lock
  function renderGreeterLock(doc, win, userName, lockConfig, isEditorPreview) {
    if (!doc || !doc.body) return {};

    // Clean up any existing lock instance before rendering new one
    const prevOverlay = doc.getElementById('lock-overlay');
    if (prevOverlay) {
      if (typeof prevOverlay._fitCleanup === 'function') {
        try { prevOverlay._fitCleanup(); } catch(e){}
      }
      prevOverlay.remove();
    }

    // Actively rendering lock: mark as locked
    if (win) win.lockUnlocked = false;
    if (typeof window !== 'undefined') window.lockUnlocked = false;

    // If countdown is active, defer lock screen until countdown finishes (for shared page)
    if (!isEditorPreview) {
      if (doc.getElementById("magic-countdown-overlay") || (win && win.countdownFinished === false) || (typeof window !== 'undefined' && window.countdownFinished === false)) {
        const onCountdownDone = () => {
          if (typeof window !== 'undefined') window.removeEventListener('countdownFinished', onCountdownDone);
          if (win && win !== window) win.removeEventListener('countdownFinished', onCountdownDone);
          if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('countdownFinished', onCountdownDone);
          renderGreeterLock(doc, win, userName, lockConfig, isEditorPreview);
        };
        if (typeof window !== 'undefined') window.addEventListener('countdownFinished', onCountdownDone);
        if (win && win !== window) win.addEventListener('countdownFinished', onCountdownDone);
        if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('countdownFinished', onCountdownDone);
        return {};
      }
    }

    // Remove existing curtain or welcome message
    const existingCurtain = doc.getElementById('magic-curtain-reveal-root');
    if (existingCurtain) {
      if (doc.body && existingCurtain._prevOverflow !== undefined) doc.body.style.overflow = existingCurtain._prevOverflow || "";
      existingCurtain.remove();
    }
    const existingWelcome = doc.getElementById('magic-welcome-typing-root');
    if (existingWelcome) {
      existingWelcome.remove();
      if (doc.body) doc.body.classList.remove('magic-noscroll');
    }

// Lock unlocked check handled at start

    // Editor mode save/restore
    if (isEditorPreview && typeof editModeActive !== 'undefined') {
      editModeBeforeLock = editModeActive;
      editModeActive = false;
      if (doc.body) doc.body.contentEditable = false;
      const editToggleBtnEl = (doc.getElementById && doc.getElementById('editToggleBtn')) || (typeof document !== 'undefined' && document.getElementById ? document.getElementById('editToggleBtn') : null);
      if (editToggleBtnEl) editToggleBtnEl.classList.remove('active');
    }

    // Parse config
    const parsed = parseLockConfig(lockConfig);
    const theme = LOCK_THEMES[parsed.themeId] || LOCK_THEMES['romantic-pink'];
    const soundEngine = createSoundEngine(true, win); // Sounds always ON by default

    // Ensure Font Awesome
    if (!doc.getElementById('greeter-font-awesome')) {
      const faLink = doc.createElement('link');
      faLink.id = 'greeter-font-awesome';
      faLink.rel = 'stylesheet';
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
      (doc.head || doc.body).appendChild(faLink);
    }

    // Inject CSS
    injectLockStyles(doc, theme);

    // Create Main Overlay
    const overlay = doc.createElement('div');
    overlay.id = 'lock-overlay';
    overlay.style.background = theme.bg;

    // Audio elements
    const unlockAudio = doc.createElement('audio');
    unlockAudio.src = '/assets/sounds/unlocked.mp3';
    unlockAudio.preload = 'auto';
    overlay.appendChild(unlockAudio);

    const wrongAudio = doc.createElement('audio');
    wrongAudio.src = '/assets/sounds/wrong-input.mp3';
    wrongAudio.preload = 'auto';
    overlay.appendChild(wrongAudio);

    // Floating particles
    const particlesWrap = doc.createElement('div');
    particlesWrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
    for (let i = 0; i < 22; i++) {
      const p = doc.createElement('div');
      p.className = 'lock-float-particle';
      const size = 3 + Math.random() * 5;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * 100) + '%';
      p.style.top = (20 + Math.random() * 80) + '%';
      p.style.background = theme.confetti[i % theme.confetti.length];
      p.style.setProperty('--dur', (2.5 + Math.random() * 3) + 's');
      particlesWrap.appendChild(p);
    }
    overlay.appendChild(particlesWrap);

    // Mute Button for Recipient
    const muteBtn = doc.createElement('button');
    muteBtn.className = 'lock-mute-btn';
    muteBtn.title = soundEngine.isMuted() ? 'Unmute Sound' : 'Mute Sound';
    muteBtn.innerHTML = soundEngine.isMuted() ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
    muteBtn.onclick = (e) => {
      e.stopPropagation();
      const newMuted = !soundEngine.isMuted();
      soundEngine.setMuted(newMuted);
      muteBtn.innerHTML = newMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
      muteBtn.title = newMuted ? 'Unmute Sound' : 'Mute Sound';
    };
    overlay.appendChild(muteBtn);

    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi') ||
      (win && win.currentLang === 'hi') ||
      (typeof window !== 'undefined' && window.currentLang === 'hi') ||
      (typeof window !== 'undefined' && window.parent?.currentLang === 'hi');

    // Two-Side Content Wrapper (Matching Countdown Screen)
    const contentWrap = doc.createElement('div');
    contentWrap.className = 'lock-content-wrap';

    // --- STAGE LEFT: Luxury Portrait Picture Frame (Never Crops Artwork) ---
    const stageLeft = doc.createElement('div');
    stageLeft.className = 'lock-stage-left';

    const archCard = doc.createElement('div');
    archCard.className = 'lock-arch-card theme-' + theme.id;
    archCard.style.background = theme.cardBg;
    archCard.style.border = theme.frameBorder || ('2px solid ' + theme.cardBorder);
    archCard.style.boxShadow = theme.frameGlow || theme.cardShadow;
    if (theme.frameInlay) {
      archCard.style.outline = '1.5px solid ' + theme.frameInlay;
      archCard.style.outlineOffset = '-5px';
    }

    // Glowing theme-tinted halo behind card
    const halo = doc.createElement('div');
    halo.className = 'lock-card-halo';
    halo.style.background = 'radial-gradient(circle, ' + (theme.accentGlow || theme.accent) + ' 0%, transparent 70%)';
    archCard.appendChild(halo);

    // Corner studs removed to prevent flexbox in-flow stacking

    // Top Apex Badge Pin with theme emoji
    const archBadge = doc.createElement('div');
    archBadge.className = 'lock-arch-badge';
    archBadge.style.background = theme.buttonActive || theme.accent;
    archBadge.innerHTML = `<span>${theme.icon || '🔒'}</span>`;
    archCard.appendChild(archBadge);

    // Picture Window: 1:1 Aspect Ratio with Zero-Cutting contain fit
    const archWindow = doc.createElement('div');
    archWindow.className = 'lock-arch-window';
    if (theme.windowBorder) archWindow.style.border = theme.windowBorder;
    if (theme.windowGlow) archWindow.style.boxShadow = theme.windowGlow;

    const activeMedia = parsed.customImage || theme.defaultMedia || '/assets/media/lock/theme-romantic-pink.jpg';
    const imgEl = doc.createElement('img');
    imgEl.className = 'lock-media-img';
    imgEl.src = activeMedia;
    imgEl.alt = theme.name;
    imgEl.loading = 'eager';
    imgEl.onerror = () => {
      if (theme.defaultMedia && imgEl.src !== theme.defaultMedia) {
        imgEl.src = theme.defaultMedia;
      }
    };
    archWindow.appendChild(imgEl);
    archCard.appendChild(archWindow);

    // Bottom Subtitle Ribbon Plaque
    const archSubtitle = doc.createElement('div');
    archSubtitle.className = 'lock-arch-subtitle';
    archSubtitle.style.color = theme.subtextColor || theme.accent;
    const ribbonText = isHi ? (theme.ribbonTextHi || 'सीक्रेट सरप्राइज लॉक') : (theme.ribbonText || 'SECRET SURPRISE LOCK');
    archSubtitle.innerHTML = `<span class="lock-ribbon-sparkle">✦</span><span class="lock-ribbon-text">${ribbonText}</span><span class="lock-ribbon-sparkle">✦</span>`;
    archCard.appendChild(archSubtitle);

    stageLeft.appendChild(archCard);
    contentWrap.appendChild(stageLeft);

    // --- STAGE RIGHT: Interactive Lock Card ---
    const stageRight = doc.createElement('div');
    stageRight.className = 'lock-stage-right';

    const card = doc.createElement('div');
    card.className = 'lock-card';
    card.style.background = theme.cardBg;
    card.style.border = '1.5px solid ' + theme.cardBorder;
    card.style.boxShadow = theme.cardShadow;

    // Eyebrow Tag (matching countdown)
    const eyebrow = doc.createElement('div');
    eyebrow.className = 'lock-eyebrow';
    eyebrow.style.color = theme.accent;
    eyebrow.innerHTML = `<span>✨</span><span>${isHi ? 'गोपनीय कोड' : 'SECRET PASSCODE'}</span><span>✨</span>`;
    card.appendChild(eyebrow);

    // Title & Subtitle
    const title = doc.createElement('div');
    title.className = 'lock-title';
    title.textContent = isHi ? 'सीक्रेट कोड डालें' : 'Enter the Secret Code';
    title.style.color = theme.textColor;
    card.appendChild(title);

    const subtitle = doc.createElement('div');
    subtitle.className = 'lock-subtitle';
    subtitle.textContent = isHi ? 'सरप्राइज अनलॉक करें 💕' : 'Unlock the surprise 💕';
    subtitle.style.color = theme.subtextColor;
    card.appendChild(subtitle);

    // Hint Pill (if enabled)
    if (parsed.hintEnabled && parsed.hintText) {
      const hintPill = doc.createElement('div');
      hintPill.className = 'lock-hint-pill';
      hintPill.style.color = theme.subtextColor;
      hintPill.style.borderColor = theme.cardBorder;
      hintPill.innerHTML = '<i class="fas fa-lightbulb" style="color:' + theme.accent + '"></i> ' + (isHi ? 'हिंट: ' : 'Hint: ') + parsed.hintText;
      card.appendChild(hintPill);
    }

    // Status Message
    const statusMsg = doc.createElement('div');
    statusMsg.className = 'lock-status-msg';

    // Footer reassuring note (matching countdown)
    const footerNote = doc.createElement('div');
    footerNote.className = 'lock-footer-note';
    footerNote.style.color = theme.subtextColor;
    footerNote.innerHTML = `<span>✦</span><span>${isHi ? 'सरप्राइज देखने के लिए सही कोड डालें' : 'Enter the correct code to unlock your surprise'}</span><span>✦</span>`;

    // Celebration Overlay inside card
    const celebration = doc.createElement('div');
    celebration.className = 'lock-celebration-overlay';
    celebration.innerHTML = `
      <div class="celebration-icon">${parsed.themeId === 'luxury-gold' ? '👑' : (parsed.themeId === 'dreamy-purple' ? '⭐' : '🎁')}</div>
      <div class="celebration-title">✨ Unlocked! ✨</div>
      <div class="celebration-subtitle">Your surprise awaits...</div>
      <div style="font-size:22px;margin-top:10px;">💖 💕 💗 💓</div>
    `;

    // Common Unlock Trigger
    let isUnlocking = false;
    function triggerSuccess() {
      if (isUnlocking) return;
      isUnlocking = true;
      soundEngine.playUnlock(unlockAudio);

      celebration.classList.add('active');

      try {
        const confFn = (win && win.confetti) ? win.confetti : (typeof window !== 'undefined' && window.confetti ? window.confetti : null);
        if (typeof confFn === 'function') {
          confFn({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: theme.confetti });
          setTimeout(() => {
            confFn({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0.1, y: 0.6 }, colors: theme.confetti });
            confFn({ particleCount: 50, angle: 120, spread: 55, origin: { x: 0.9, y: 0.6 }, colors: theme.confetti });
          }, 350);
        }
      } catch(e) {}

      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(1.04)';
        setTimeout(() => {
          overlay.remove();
          if (typeof window !== 'undefined') window.lockUnlocked = true;
          if (win) win.lockUnlocked = true;
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}
          try { if (win && win !== window) win.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}
          try { if (doc && typeof doc.dispatchEvent === 'function') doc.dispatchEvent(new CustomEvent('lockUnlocked')); } catch(e){}

          if (isEditorPreview && typeof editModeBeforeLock !== 'undefined') {
            if (doc && doc.body) doc.body.contentEditable = editModeBeforeLock;
            if (typeof editModeActive !== 'undefined') editModeActive = editModeBeforeLock;
            const editToggleBtnEl = (doc && doc.getElementById && doc.getElementById('editToggleBtn')) || (typeof document !== 'undefined' && document.getElementById ? document.getElementById('editToggleBtn') : null);
            if (editToggleBtnEl) editToggleBtnEl.classList.toggle('active', editModeBeforeLock);
          }
        }, 650);
      }, 2200);
    }

    function triggerWrong(targetEl, msg) {
      soundEngine.playWrong(wrongAudio);
      if (targetEl) {
        targetEl.classList.add('lock-shake');
        setTimeout(() => targetEl.classList.remove('lock-shake'), 600);
      }
      statusMsg.textContent = msg || 'Incorrect code, please try again!';
      statusMsg.classList.add('error');
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.classList.remove('error');
      }, 2000);
    }

    // Build specific lock mechanics
    if (parsed.lockType === 'tumbler') {
      buildTumblerLock(card, parsed, theme, soundEngine, triggerSuccess, triggerWrong, doc);
    } else if (parsed.lockType === 'classic') {
      buildClassicLock(card, parsed, theme, soundEngine, triggerSuccess, triggerWrong, doc);
    } else {
      buildKeypadLock(card, parsed, theme, soundEngine, triggerSuccess, triggerWrong, doc);
    }

    card.appendChild(statusMsg);
    card.appendChild(footerNote);
    card.appendChild(celebration);

    stageRight.appendChild(card);
    contentWrap.appendChild(stageRight);
    // Auto-resume Web AudioContext on first touch/click anywhere on screen
    const unlockAudioContext = () => {
      if (typeof soundEngine.resumeAudio === 'function') soundEngine.resumeAudio();
    };
    overlay.addEventListener('pointerdown', unlockAudioContext, { passive: true });
    overlay.addEventListener('touchstart', unlockAudioContext, { passive: true });
    overlay.addEventListener('click', unlockAudioContext, { passive: true });

    overlay.appendChild(contentWrap);
    doc.body.appendChild(overlay);

    // === DYNAMIC AUTO-FIT SCALE CONTROLLER ===
    // Guarantees zero cut-off content across any short or narrow viewport (preview pane & live devices)
    function fitContentToViewport() {
      if (!overlay || !overlay.isConnected || !contentWrap || !contentWrap.isConnected) return;

      // Temporarily remove transform to measure natural unconstrained dimensions
      contentWrap.style.transform = '';

      const winH = (win && win.innerHeight) ? win.innerHeight : (typeof window !== 'undefined' ? window.innerHeight : 600);
      const winW = (win && win.innerWidth) ? win.innerWidth : (typeof window !== 'undefined' ? window.innerWidth : 800);
      const overlayH = overlay.clientHeight || winH;
      const overlayW = overlay.clientWidth || winW;

      // Safe breathing margins (leave at least 16px vertical, 16px horizontal)
      const maxH = Math.max(120, overlayH - 20);
      const maxW = Math.max(160, overlayW - 20);

      const naturalH = contentWrap.scrollHeight;
      const naturalW = contentWrap.scrollWidth;

      if (naturalH > maxH || naturalW > maxW) {
        const scaleH = maxH / naturalH;
        const scaleW = maxW / naturalW;
        const scale = Math.min(1, Math.min(scaleH, scaleW));
        // Bound minimum scale to 0.5 so content remains readable
        const finalScale = Math.max(0.5, Math.min(1, scale));
        contentWrap.style.transform = `scale(${finalScale.toFixed(4)})`;
      } else {
        contentWrap.style.transform = '';
      }
    }

    // Run fit immediately and on animation frames to settle initial layout
    fitContentToViewport();
    const raf = (win && win.requestAnimationFrame) ? win.requestAnimationFrame : (typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (fn) => setTimeout(fn, 16));
    raf(() => {
      fitContentToViewport();
      setTimeout(fitContentToViewport, 40);
      setTimeout(fitContentToViewport, 180);
    });

    const targetWin = win || (typeof window !== 'undefined' ? window : null);
    const resizeListener = () => fitContentToViewport();
    if (targetWin && targetWin.addEventListener) {
      targetWin.addEventListener('resize', resizeListener);
    }

    let resizeObs = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        resizeObs = new ResizeObserver(() => fitContentToViewport());
        resizeObs.observe(overlay);
        resizeObs.observe(contentWrap);
      } catch(e) {}
    }

    overlay._fitCleanup = () => {
      if (targetWin && targetWin.removeEventListener) {
        targetWin.removeEventListener('resize', resizeListener);
      }
      if (resizeObs) {
        try { resizeObs.disconnect(); } catch(e){}
      }
    };

    // Smooth entrance
    raf(() => {
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 50);
    });

    return { cleanup: () => removeGreeterLock(doc, win, isEditorPreview) };
  }

  // --- Sub-builder 1: Number Tumbler Lock (Smooth 3D Rolling Wheels) ---
  function buildTumblerLock(card, parsed, theme, soundEngine, onSuccess, onWrong, doc) {
    const wrap = doc.createElement('div');
    wrap.className = 'tumbler-container';

    const count = parsed.digits;
    const targetCode = parsed.numericCode;
    const currentDigits = Array(count).fill(0);

    const chassis = doc.createElement('div');
    chassis.className = 'tumbler-chassis';
    chassis.style.background = theme.tumblerBg;
    chassis.style.borderColor = theme.cardBorder;

    const colElements = [];

    for (let colIdx = 0; colIdx < count; colIdx++) {
      const col = doc.createElement('div');
      col.className = 'tumbler-col';

      const btnUp = doc.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'tumbler-arrow';
      btnUp.title = 'Rotate Up';
      btnUp.innerHTML = '<i class="fas fa-chevron-up"></i>';

      const cylinder = doc.createElement('div');
      cylinder.className = 'tumbler-cylinder';
      cylinder.style.background = theme.tumblerRim;

      // Center Magnifying Glass Lens
      const lens = doc.createElement('div');
      lens.className = 'tumbler-cylinder-lens';
      cylinder.appendChild(lens);

      // 3D Drum: 10-sided prism cylinder
      const drum = doc.createElement('div');
      drum.className = 'tumbler-drum';

      const digitEls = [];
      // Arrange digits so at step 0: 9 is TOP, 0 is CENTER, 1 is BOTTOM (matching reference design)
      for (let d = 0; d < 10; d++) {
        const dEl = doc.createElement('div');
        dEl.className = 'tumbler-drum-digit';
        dEl.textContent = d;
        dEl.style.transform = `rotateX(${-d * 36}deg) translateZ(46px)`;
        drum.appendChild(dEl);
        digitEls.push(dEl);
      }
      cylinder.appendChild(drum);

      const btnDown = doc.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'tumbler-arrow';
      btnDown.title = 'Rotate Down';
      btnDown.innerHTML = '<i class="fas fa-chevron-down"></i>';

      let currentStep = 0;

      function rotateTo(step, animate = true, playSound = true) {
        const prevStep = currentStep;
        currentStep = step;
        const v = ((currentStep % 10) + 10) % 10;
        currentDigits[colIdx] = v;

        if (animate) {
          drum.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.35, 1.25)';
        } else {
          drum.style.transition = 'none';
        }
        // Rotate drum forward to bring digit v to front (angle 0)
        drum.style.transform = `rotateX(${currentStep * 36}deg)`;

        digitEls.forEach((el, idx) => {
          if (idx === v) {
            el.style.color = theme.accent;
            el.style.opacity = '1';
            el.style.textShadow = `0 0 14px ${theme.accentGlow}, 0 2px 4px rgba(0,0,0,0.8)`;
          } else {
            el.style.color = '#ffffff';
            el.style.opacity = '0.38';
            el.style.textShadow = '0 2px 4px rgba(0,0,0,0.6)';
          }
        });

        // Trigger mechanical ratchet click whenever step changes
        if (playSound && prevStep !== currentStep) {
          soundEngine.playTumbler();
        }

        return v;
      }

      rotateTo(0, false, false);

      // Click ▲ (UP): rolls drum UP to advance to next number (0 -> 1 -> 2...)
      btnUp.onclick = (e) => {
        if (e) e.preventDefault();
        rotateTo(currentStep + 1, true, true);
      };

      // Click ▼ (DOWN): rolls drum DOWN to return to previous number (0 -> 9 -> 8...)
      btnDown.onclick = (e) => {
        if (e) e.preventDefault();
        rotateTo(currentStep - 1, true, true);
      };

      // Mouse wheel support: responsive detent threshold triggers mechanical ratchet click per number rolled
      let wheelAcc = 0;
      cylinder.addEventListener('wheel', (e) => {
        e.preventDefault();
        wheelAcc += e.deltaY;
        const threshold = 26;
        if (Math.abs(wheelAcc) >= threshold) {
          const stepChange = wheelAcc > 0 ? 1 : -1;
          wheelAcc = 0;
          rotateTo(currentStep + stepChange, true, true);
        }
      }, { passive: false });

      // Touch / pointer drag vertical with continuous live mechanical ratchet feedback
      let isDragging = false;
      let startY = 0;
      let startStep = 0;

      cylinder.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startStep = currentStep;
        cylinder.setPointerCapture(e.pointerId);
        cylinder.style.cursor = 'grabbing';
      });

      cylinder.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startY;
        // Dragging finger UP (negative deltaY) pulls drum UP (advances step)
        const stepDelta = Math.round(-deltaY / 24);
        const targetStep = startStep + stepDelta;
        if (targetStep !== currentStep) {
          rotateTo(targetStep, false, true);
        }
      });

      const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        try { cylinder.releasePointerCapture(e.pointerId); } catch(err){}
        cylinder.style.cursor = 'grab';
        rotateTo(currentStep, true, false); // Snap cleanly into final tooth position
      };

      cylinder.addEventListener('pointerup', endDrag);
      cylinder.addEventListener('pointercancel', endDrag);

      col.appendChild(btnUp);
      col.appendChild(cylinder);
      col.appendChild(btnDown);

      chassis.appendChild(col);
      colElements.push({ col, rotateTo, getDigit: () => currentDigits[colIdx] });
    }

    wrap.appendChild(chassis);

    function checkCode() {
      const entered = currentDigits.join('');
      return entered === targetCode;
    }

    // Elevated Luxury Mechanical Unlock Button - Lock ONLY opens when user clicks this button
    const unlockBtn = doc.createElement('button');
    unlockBtn.type = 'button';
    unlockBtn.className = 'lock-cta-btn tumbler-latch-btn';
    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi') ||
      (doc && doc.defaultView && doc.defaultView.currentLang === 'hi') ||
      (typeof window !== 'undefined' && window.currentLang === 'hi');

    unlockBtn.style.setProperty('--btn-gradient', theme.btnGradient || theme.buttonActive);
    unlockBtn.style.setProperty('--btn-glow', theme.btnGlow || theme.accentGlow || 'rgba(123, 93, 246, 0.55)');
    unlockBtn.style.setProperty('--btn-glow-strong', theme.btnGlowStrong || 'rgba(123, 93, 246, 0.85)');
    unlockBtn.style.background = theme.btnGradient || 'linear-gradient(135deg, ' + theme.accent + ', #ff7a2f)';

    unlockBtn.innerHTML = `
      <span class="lock-btn-sheen"></span>
      <span class="lock-btn-icon-wrap"><i class="fas fa-lock"></i></span>
      <span class="lock-btn-text">${isHi ? 'सरप्राइज अनलॉक करें' : 'Open Lock'}</span>
      <span class="lock-btn-sparkle">✦</span>
    `;

    unlockBtn.onclick = (e) => {
      if (e) e.preventDefault();
      if (checkCode()) {
        const iconEl = unlockBtn.querySelector('.lock-btn-icon-wrap');
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-lock-open"></i>';
        chassis.style.borderColor = '#22c55e';
        chassis.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.7), inset 0 2px 4px rgba(255,255,255,0.4)';
        unlockBtn.style.borderColor = '#22c55e';
        unlockBtn.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.8)';
        setTimeout(onSuccess, 180);
      } else {
        onWrong(chassis, isHi ? 'कोड मेल नहीं खा रहा है!' : 'Numbers do not match the secret code!');
      }
    };
    wrap.appendChild(unlockBtn);

    card.appendChild(wrap);
  }

  // --- Sub-builder 2: Numeric Keypad Lock ---
  function buildKeypadLock(card, parsed, theme, soundEngine, onSuccess, onWrong, doc) {
    const wrap = doc.createElement('div');
    wrap.className = 'keypad-container';

    const count = parsed.digits;
    const targetPin = parsed.numericCode;
    let enteredPin = '';

    // PIN Slots Row
    const slotsRow = doc.createElement('div');
    slotsRow.className = 'keypad-slots-row';
    const slotElements = [];

    for (let i = 0; i < count; i++) {
      const slot = doc.createElement('div');
      slot.className = 'keypad-slot';
      slot.style.background = theme.slotBg;
      slot.style.border = '2px solid ' + theme.slotBorder;
      const dot = doc.createElement('div');
      dot.className = 'keypad-slot-dot';
      dot.textContent = '✦';
      dot.style.color = theme.slotActive;
      slot.appendChild(dot);
      slotsRow.appendChild(slot);
      slotElements.push(slot);
    }
    wrap.appendChild(slotsRow);

    function updateSlots() {
      slotElements.forEach((slot, idx) => {
        if (idx < enteredPin.length) {
          slot.classList.add('filled');
          slot.style.borderColor = theme.slotActive;
          slot.style.boxShadow = '0 0 16px ' + theme.accentGlow;
        } else {
          slot.classList.remove('filled');
          slot.style.borderColor = theme.slotBorder;
          slot.style.boxShadow = 'none';
        }
      });
    }

    function appendDigit(d) {
      if (enteredPin.length >= count) return;
      enteredPin += d;
      soundEngine.playBeep(parseInt(d, 10));
      updateSlots();
      // Notice: No auto-unlock here! Lock only opens when user clicks the unlock button below.
    }

    function deleteDigit() {
      if (enteredPin.length === 0) return;
      enteredPin = enteredPin.slice(0, -1);
      soundEngine.playTick();
      updateSlots();
    }

    function clearAll() {
      if (enteredPin.length === 0) return;
      enteredPin = '';
      soundEngine.playTick();
      updateSlots();
    }

    // Keypad Grid
    const grid = doc.createElement('div');
    grid.className = 'keypad-grid';

    const keys = [
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      'C', '0', '⌫'
    ];

    keys.forEach((key) => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'keypad-btn';
      btn.style.background = theme.buttonBg;
      btn.style.border = '1.5px solid ' + theme.buttonBorder;
      btn.style.color = theme.buttonText;

      if (key === 'C' || key === '⌫') {
        btn.classList.add('action-btn');
      }

      if (key === '⌫') {
        btn.setAttribute('aria-label', 'Delete');
        btn.innerHTML = '<i class="fas fa-backspace"></i>';
        btn.onclick = (e) => { e.preventDefault(); deleteDigit(); };
      } else if (key === 'C') {
        btn.setAttribute('aria-label', 'Clear');
        btn.textContent = 'C';
        btn.onclick = (e) => { e.preventDefault(); clearAll(); };
      } else {
        btn.setAttribute('aria-label', key);
        btn.textContent = key;
        btn.onclick = (e) => { e.preventDefault(); appendDigit(key); };
      }

      btn.addEventListener('pointerdown', () => {
        btn.style.background = theme.buttonActive;
      });
      btn.addEventListener('pointerup', () => {
        btn.style.background = theme.buttonBg;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.background = theme.buttonBg;
      });

      grid.appendChild(btn);
    });

    wrap.appendChild(grid);

    // Elevated Luxury Mechanical Unlock Button - Opens ONLY when user clicks this button
    const unlockBtn = doc.createElement('button');
    unlockBtn.type = 'button';
    unlockBtn.className = 'lock-cta-btn keypad-unlock-btn';
    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi') ||
      (doc && doc.defaultView && doc.defaultView.currentLang === 'hi') ||
      (typeof window !== 'undefined' && window.currentLang === 'hi');

    unlockBtn.style.setProperty('--btn-gradient', theme.btnGradient || theme.buttonActive);
    unlockBtn.style.setProperty('--btn-glow', theme.btnGlow || theme.accentGlow || 'rgba(123, 93, 246, 0.55)');
    unlockBtn.style.setProperty('--btn-glow-strong', theme.btnGlowStrong || 'rgba(123, 93, 246, 0.85)');
    unlockBtn.style.background = theme.btnGradient || 'linear-gradient(135deg, ' + theme.accent + ', #ff7a2f)';

    unlockBtn.innerHTML = `
      <span class="lock-btn-sheen"></span>
      <span class="lock-btn-icon-wrap"><i class="fas fa-lock"></i></span>
      <span class="lock-btn-text">${isHi ? 'सरप्राइज अनलॉक करें' : 'Open Lock'}</span>
      <span class="lock-btn-sparkle">✦</span>
    `;

    function attemptUnlock() {
      if (enteredPin.length === 0) {
        onWrong(slotsRow, isHi ? 'कृपया अपना पिन दर्ज करें!' : 'Please enter your secret PIN!');
        return;
      }
      if (enteredPin.length < count) {
        onWrong(slotsRow, isHi ? 'कृपया पूरा पिन दर्ज करें!' : 'Please enter all digits of the PIN!');
        return;
      }

      if (enteredPin === targetPin) {
        slotElements.forEach(s => {
          s.style.borderColor = '#22c55e';
          s.style.boxShadow = '0 0 18px rgba(34, 197, 94, 0.8)';
        });
        const iconEl = unlockBtn.querySelector('.lock-btn-icon-wrap');
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-lock-open"></i>';
        unlockBtn.style.borderColor = '#22c55e';
        unlockBtn.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.8)';
        setTimeout(onSuccess, 180);
      } else {
        slotElements.forEach(s => {
          s.style.borderColor = '#ef4444';
          s.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.8)';
        });
        onWrong(slotsRow, isHi ? 'पिन गलत है, पुनः प्रयास करें!' : 'Incorrect PIN, please try again!');
        setTimeout(() => {
          enteredPin = '';
          updateSlots();
        }, 450);
      }
    }

    unlockBtn.onclick = (e) => {
      if (e) e.preventDefault();
      attemptUnlock();
    };

    wrap.appendChild(unlockBtn);

    // Keyboard support
    const handleKeydown = (e) => {
      if (!doc.getElementById('lock-overlay')) {
        doc.removeEventListener('keydown', handleKeydown);
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.stopPropagation();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.stopPropagation();
        deleteDigit();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.stopPropagation();
        clearAll();
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        attemptUnlock();
      }
    };
    doc.addEventListener('keydown', handleKeydown);

    card.appendChild(wrap);
  }

  // --- Sub-builder 3: Classic Password Lock ---
  function buildClassicLock(card, parsed, theme, soundEngine, onSuccess, onWrong, doc) {
    const wrap = doc.createElement('div');
    wrap.className = 'classic-container';

    const inputWrap = doc.createElement('div');
    inputWrap.className = 'classic-input-wrap';

    const input = doc.createElement('input');
    input.type = 'password';
    input.className = 'classic-input';
    input.placeholder = '✨ Enter Secret Password ✨';
    input.style.borderColor = theme.cardBorder;
    input.style.background = 'rgba(255,255,255,0.08)';

    inputWrap.appendChild(input);
    wrap.appendChild(inputWrap);

    const btn = doc.createElement('button');
    btn.className = 'lock-cta-btn classic-unlock-btn';
    btn.style.setProperty('--btn-gradient', theme.btnGradient || theme.buttonActive);
    btn.style.setProperty('--btn-glow', theme.btnGlow || theme.accentGlow || 'rgba(123, 93, 246, 0.55)');
    btn.style.setProperty('--btn-glow-strong', theme.btnGlowStrong || 'rgba(123, 93, 246, 0.85)');
    btn.style.background = theme.btnGradient || 'linear-gradient(135deg, ' + theme.accent + ', #ff7a2f)';
    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi') ||
      (doc && doc.defaultView && doc.defaultView.currentLang === 'hi') ||
      (typeof window !== 'undefined' && window.currentLang === 'hi');
    btn.innerHTML = `
      <span class="lock-btn-sheen"></span>
      <span class="lock-btn-icon-wrap"><i class="fas fa-key"></i></span>
      <span class="lock-btn-text">${isHi ? 'सरप्राइज खोलें' : 'Unlock Surprise'}</span>
      <span class="lock-btn-sparkle">✦</span>
    `;

    function checkPassword() {
      const target = parsed.rawText.trim().toLowerCase();
      const entered = input.value.trim().toLowerCase();
      if (entered === target) {
        onSuccess();
      } else {
        onWrong(input, 'Password does not match!');
      }
    }

    btn.onclick = checkPassword;
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') checkPassword();
    });

    wrap.appendChild(btn);
    card.appendChild(wrap);

    setTimeout(() => input.focus(), 150);
  }

  return {
    LOCK_THEMES,
    createSoundEngine,
    renderGreeterLock,
    removeGreeterLock
  };
}));
