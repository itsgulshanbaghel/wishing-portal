(function () {
    // Helper to safely insert feature section before Final Surprise or CTA
    function insertSectionBeforeFinal(doc, sectionElement) {
        if (!doc || !sectionElement) return;
        if (typeof window !== 'undefined' && typeof window.insertSectionBeforeFinal === 'function' && window.insertSectionBeforeFinal !== insertSectionBeforeFinal) {
            try { window.insertSectionBeforeFinal(doc, sectionElement); return; } catch (e) { }
        }
        const sectionsCont = doc.getElementById('sections-container');
        if (sectionsCont) {
            sectionsCont.style.cssText = "width: 100%; max-width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; margin: 0 auto;";
        }
        if (sectionElement && sectionElement.style) {
            sectionElement.style.marginLeft = 'auto';
            sectionElement.style.marginRight = 'auto';
            sectionElement.style.alignSelf = 'center';
            sectionElement.style.boxSizing = 'border-box';
        }

        const container = sectionsCont || doc.body;
        if (!container) return;
        const finalMessage = doc.getElementById('magic-final-surprise-section');
        const cta = doc.getElementById('magic-cta-section') || doc.querySelector('.greeter-cta-section, .festival-cta-section');

        if (sectionElement.id === 'magic-final-surprise-section') {
            if (cta && cta.parentNode === container) {
                container.insertBefore(sectionElement, cta);
            } else {
                container.appendChild(sectionElement);
            }
        } else if (sectionElement.id === 'magic-virtual-hug-section') {
            const namedPoster = doc.getElementById('magic-named-birthday-card-section');
            const anchor = (namedPoster && namedPoster.parentNode === container) ? namedPoster : (finalMessage || cta);
            if (anchor && anchor.parentNode === container) {
                container.insertBefore(sectionElement, anchor);
            } else {
                container.appendChild(sectionElement);
            }
        } else {
            const anchor = finalMessage || cta;
            if (anchor && anchor.parentNode === container) {
                container.insertBefore(sectionElement, anchor);
            } else {
                container.appendChild(sectionElement);
            }
        }
    }

    // Helper to safely scroll to element or no-op in standalone view
    function scrollToElement(doc, element) {
        if (!doc || !element) return;
        if (typeof window !== 'undefined' && typeof window.scrollToElement === 'function' && window.scrollToElement !== scrollToElement) {
            try { window.scrollToElement(doc, element); return; } catch (e) { }
        }
    }

    // Helper to inject Google Fonts if needed
    function injectFontsIfNeeded(doc) {
        if (!doc) return;
        if (!doc.getElementById('magic-custom-fonts')) {
            const link = doc.createElement('link');
            link.id = 'magic-custom-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@700&family=Caveat:wght@700&family=Poppins:wght@400;600;700&family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap';
            (doc.head || doc.body)?.appendChild(link);
        }
    }

    // Helper to safely escape HTML strings
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m] || m));
    }

    // Curated local PNG media pool for random fallback memories & reveals (excludes final surprise cards)
    const FALLBACK_PNG_MEDIA_POOL = [
        "/assets/media/1000009474.png",
        "/assets/media/1000009475.png",
        "/assets/media/1000009484.png",
        "/assets/media/1000009493.png",
        "/assets/media/1000009498.png",
        "/assets/media/1000009499.png",
        "/assets/media/1000009500.png",
        "/assets/media/1000009501.png",
        "/assets/media/1000009502.png",
        "/assets/media/1000009504.png",
        "/assets/media/1000009505.png",
        "/assets/media/1000009506.png",
        "/assets/media/1000009507.png",
        "/assets/media/1000009511.png",
        "/assets/media/1000009513.png",
        "/assets/media/1000009515.png",
        "/assets/media/1000009545.png",
        "/assets/media/1000009546.png",
        "/assets/media/1000009547.png",
        "/assets/media/1000009618.png",
        "/assets/media/1000009619.png",
        "/assets/media/1000009621.png",
        "/assets/media/1000009622.png",
        "/assets/media/1000009623.png",
        "/assets/media/1000009825.png"
    ];

    function getRandomFallbackPngs(count = 4) {
        const cleanPool = FALLBACK_PNG_MEDIA_POOL.filter(src => !src.toLowerCase().includes('final'));
        const shuffled = [...cleanPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Expose helpers globally if not already present
    if (typeof window !== 'undefined') {
        if (!window.escapeHtml) window.escapeHtml = escapeHtml;
        if (!window.insertSectionBeforeFinal) window.insertSectionBeforeFinal = insertSectionBeforeFinal;
        if (!window.scrollToElement) window.scrollToElement = scrollToElement;
        if (!window.injectFontsIfNeeded) window.injectFontsIfNeeded = injectFontsIfNeeded;
        if (!window.FALLBACK_PNG_MEDIA_POOL) window.FALLBACK_PNG_MEDIA_POOL = FALLBACK_PNG_MEDIA_POOL;
        if (!window.getRandomFallbackPngs) window.getRandomFallbackPngs = getRandomFallbackPngs;
    }

    // Helper to ensure confetti library is loaded
    function ensureConfetti(cb) {
        const cfn = (typeof window !== 'undefined' && (window.confetti || window.canvasConfetti));
        if (cfn) {
            if (cb) cb(cfn);
            return;
        }
        if (typeof document !== 'undefined') {
            let sc = document.getElementById('greeter-canvas-confetti');
            if (!sc) {
                sc = document.createElement('script');
                sc.id = 'greeter-canvas-confetti';
                sc.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
                sc.onload = () => {
                    const c = window.confetti || window.canvasConfetti;
                    if (cb && c) cb(c);
                };
                (document.head || document.body)?.appendChild(sc);
            } else if (cb) {
                sc.addEventListener('load', () => {
                    const c = window.confetti || window.canvasConfetti;
                    if (c) cb(c);
                });
            }
        }
    }

    // Helper to smoothly stop 360 Earth rotation and align front-facing
    function smoothStopAndAlignRotator(rotator, win) {
        if (!rotator) return;
        const w = win || (typeof window !== 'undefined' ? window : null);
        let curAngle = 0;
        try {
            const st = (w && w.getComputedStyle) ? w.getComputedStyle(rotator) : null;
            const tf = st ? st.transform : '';
            if (tf && tf !== 'none') {
                const m3d = tf.match(/^matrix3d\((.+)\)$/);
                if (m3d) {
                    const vals = m3d[1].split(',').map(Number);
                    const cos = vals[0];
                    const sin = -vals[2];
                    let deg = Math.atan2(sin, cos) * (180 / Math.PI);
                    if (deg < 0) deg += 360;
                    curAngle = Math.round(deg);
                } else {
                    const m2d = tf.match(/^matrix\((.+)\)$/);
                    if (m2d) {
                        const vals = m2d[1].split(',').map(Number);
                        const cos = vals[0];
                        let deg = Math.acos(Math.min(1, Math.max(-1, cos))) * (180 / Math.PI);
                        curAngle = Math.round(deg);
                    }
                }
            }
        } catch (e) { }

        rotator.classList.add('is-stopped');
        rotator.style.animation = 'none';
        rotator.style.transform = 'rotateY(' + curAngle + 'deg)';

        setTimeout(() => {
            rotator.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.25, 1)';
            rotator.style.transform = (curAngle > 180) ? 'rotateY(360deg)' : 'rotateY(0deg)';
        }, 20);
    }

    // Global runner for Virtual Cake blowout and cutting
    function triggerBlowAndCutCake(sectionEl) {
        const d = typeof document !== 'undefined' ? document : null;
        const w = typeof window !== 'undefined' ? window : null;
        if (!d) return;
        const section = sectionEl || d.getElementById('magic-virtual-cake-section');
        if (!section) return;

        const btn = section.querySelector('#vc-blow-btn');
        const stage = section.querySelector('#vc-cake-stage');
        if (stage) {
            stage.classList.remove('rolling-in');
            stage.classList.remove('is-swaying');
        }
        const rotator = section.querySelector('#vc-cake-rotator');
        const knife = section.querySelector('#vc-knife-wrap');
        const cutLine = section.querySelector('#vc-cut-line');
        const card = section.querySelector('#vc-wish-card');
        const slicesWrap = section.querySelector('#vc-slices-wrapper');
        const audio = section.querySelector('#vc-audio');

        if (section.getAttribute('data-cake-done') === 'true' || (btn && btn.classList.contains('done'))) return;
        section.setAttribute('data-cake-done', 'true');

        /* Smoothly glide back to exact center (0° yaw, 0px float) in 0.35s for clean symmetrical knife cut */
        if (rotator) {
            rotator.classList.remove('is-idle-swaying');
            rotator.classList.add('is-stopped');
            rotator.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.25, 1)';
            rotator.style.transform = 'translateY(0px) rotateY(0deg) rotateZ(0deg)';
        }

        ensureConfetti();

        /* PHASE 1: Light off / blow out ALL 5 candles FIRST (0ms - 450ms) */
        [0, 1, 2, 3, 4].forEach((i, idx) => {
            setTimeout(() => {
                const flame = section.querySelector('#vc-flame-' + i);
                const smoke = section.querySelector('#vc-smoke-' + i);
                if (flame) flame.classList.add('out');
                if (smoke) { smoke.style.display = 'block'; smoke.classList.add('puffing'); }
            }, idx * 90);
        });

        /* PHASE 2: Knife Slicing (at 600ms) */
        setTimeout(() => {
            if (knife) knife.classList.add('slicing');
            if (cutLine) cutLine.classList.add('slicing');
        }, 600);

        /* PHASE 3: Knife reaches bottom -> Split cake halves & play sound (at 1250ms) */
        setTimeout(() => {
            const midCandle = section.querySelector('#vc-candle-2');
            if (midCandle) {
                midCandle.style.opacity = '0';
                midCandle.style.transform = 'scale(0) translateY(-20px)';
            }
            if (stage) stage.classList.add('is-cut');
            if (cutLine) cutLine.classList.add('flash');
            if (knife) knife.style.opacity = '0';

            if (audio) { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(() => { }); }
        }, 1250);

        /* PHASE 4: Confetti bursts, Wish Card & Slices Showcase reveal (1350ms - 1700ms) */
        ensureConfetti((cfn) => {
            if (!cfn) return;
            const burst = (opts) => cfn({ zIndex: 99999, ...opts });
            setTimeout(() => burst({ particleCount: 160, spread: 100, origin: { x: 0.5, y: 0.55 } }), 1350);
            setTimeout(() => burst({ particleCount: 110, spread: 85, origin: { x: 0.25, y: 0.5 }, angle: 60 }), 1550);
            setTimeout(() => burst({ particleCount: 110, spread: 85, origin: { x: 0.75, y: 0.5 }, angle: 120 }), 1700);
            setTimeout(() => burst({
                particleCount: 220, spread: 130, origin: { x: 0.5, y: 0.4 },
                colors: ['#FFD700', '#FF9100', '#FF4D8F', '#7B5DF6', '#ffffff']
            }), 1900);
        });

        setTimeout(() => {
            if (card) card.style.display = 'block';
            if (slicesWrap) slicesWrap.style.display = 'block';
            if (btn) {
                btn.classList.add('done');
                btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Wish Granted &amp; Cake Cut!</span>';
            }
        }, 1600);
    }

    // Global runner for Cake Slice Tapping
    function triggerCakeSliceTap(cardEl) {
        if (!cardEl) return;
        const toast = cardEl.querySelector('.vc-slice-toast');
        if (toast) {
            toast.classList.remove('pop');
            void toast.offsetWidth;
            toast.classList.add('pop');
        }
        ensureConfetti((cfn) => {
            if (!cfn) return;
            const rect = cardEl.getBoundingClientRect();
            const winW = (typeof window !== 'undefined' ? window.innerWidth : 360) || 360;
            const winH = (typeof window !== 'undefined' ? window.innerHeight : 640) || 640;
            const x = (rect.left + rect.width / 2) / winW;
            const y = (rect.top + rect.height / 2) / winH;
            cfn({ particleCount: 35, spread: 60, origin: { x, y: Math.max(0.2, y) }, zIndex: 99999 });
        });
    }

    // Global runner for Virtual Hug Animation
    function triggerVirtualHug(sectionEl) {
        const section = (sectionEl && sectionEl.nodeType === 1) ? sectionEl : (typeof document !== 'undefined' ? document.getElementById('magic-virtual-hug-section') : null);
        const d = (section && section.ownerDocument) || (sectionEl && sectionEl.nodeType === 9 ? sectionEl : (typeof document !== 'undefined' ? document : null));
        const w = (d && d.defaultView) || (typeof window !== 'undefined' ? window : null);
        if (!d || !d.body) return;

        if (!d.getElementById('magic-virtual-hug-styles')) {
            const s = d.createElement('style');
            s.id = 'magic-virtual-hug-styles';
            s.textContent = `
                .vh-heart-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    z-index: 100000;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.5s ease;
                }
                .vh-heart-overlay.show {
                    opacity: 1;
                    pointer-events: auto;
                }
                @keyframes vhHugPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
            `;
            (d.head || d.body)?.appendChild(s);
        }

        let overlay = d.getElementById('magic-vh-overlay');
        if (!overlay) {
            overlay = d.createElement('div');
            overlay.id = 'magic-vh-overlay';
            overlay.className = 'vh-heart-overlay';
            d.body.appendChild(overlay);
        }

        const btn = section ? section.querySelector('#vhBtn') : d.getElementById('vhBtn');
        if (section && section.dataset.hugAnimating === 'true') return;
        if (section) section.dataset.hugAnimating = 'true';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-heart" style="color: #fff; animation: vhHugPulse 1s infinite;"></i> <span id="vhBtnText">Hug Received with Love! 💖</span>';
        }

        const petalCount = 50;
        const heartPath = [];
        const winWidth = (w && w.innerWidth) || (d.documentElement && d.documentElement.clientWidth) || 360;
        const winHeight = (w && w.innerHeight) || (d.documentElement && d.documentElement.clientHeight) || 640;
        const centerX = winWidth / 2;
        const centerY = winHeight / 2;
        const scale = Math.min(centerX, centerY) * 0.75;

        overlay.classList.add('show');

        const hugEmoji = d.createElement('div');
        hugEmoji.innerHTML = '&#129303;';
        const isMobile = winWidth <= 480;
        const emojiSize = isMobile ? '90px' : '120px';
        hugEmoji.style.cssText = `
            position: fixed;
            font-size: ${emojiSize};
            z-index: 100006;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
            transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none;
            filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35));
            left: ${centerX}px;
            top: ${centerY}px;
        `;
        d.body.appendChild(hugEmoji);

        for (let i = 0; i < petalCount; i++) {
            const t = (i / petalCount) * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

            heartPath.push({
                x: centerX + (x / 16) * scale,
                y: centerY + (y / 16) * scale,
                delay: i * 30
            });
        }

        heartPath.forEach((point, index) => {
            const petal = d.createElement('div');
            petal.style.cssText = `
                position: fixed;
                width: 22px;
                height: 22px;
                background-image: url('/assets/rose%20petal.png'), url('/assets/rose petal.png'), url('../assets/rose%20petal.png'), url('../assets/rose petal.png');
                background-size: contain;
                background-repeat: no-repeat;
                pointer-events: none;
                z-index: 100005;
                opacity: 0;
                transform: translate(-50%, -50%) scale(0) rotate(${Math.random() * 360}deg);
                transition: all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                left: ${Math.random() < 0.5 ? -50 : winWidth + 50}px;
                top: ${Math.random() * winHeight}px;
            `;

            d.body.appendChild(petal);

            setTimeout(() => {
                petal.style.opacity = '1';
                petal.style.left = point.x + 'px';
                petal.style.top = point.y + 'px';
                petal.style.transform = `translate(-50%, -50%) scale(1) rotate(${Math.random() * 360}deg)`;
            }, point.delay);

            setTimeout(() => {
                petal.style.opacity = '0';
                petal.style.transform = `translate(-50%, -50%) scale(0) rotate(${Math.random() * 360}deg)`;
            }, (petalCount * 30) + 3000);

            setTimeout(() => {
                petal.remove();
            }, (petalCount * 30) + 4000);
        });

        setTimeout(() => {
            hugEmoji.style.opacity = '1';
            hugEmoji.style.transform = 'translate(-50%, -50%) scale(1)';
        }, (petalCount * 30) + 200);

        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            if (pulseCount < 6) {
                hugEmoji.style.transform = `translate(-50%, -50%) scale(${1.1 + (pulseCount % 2) * 0.1})`;
                pulseCount++;
            } else {
                clearInterval(pulseInterval);
            }
        }, 500);

        ensureConfetti((cfn) => {
            if (!cfn) return;
            setTimeout(() => {
                cfn({ particleCount: 80, spread: 80, origin: { x: 0.5, y: 0.5 }, colors: ['#ff69b4', '#ff1493', '#ff85a2', '#ffffff'] });
            }, (petalCount * 30) + 400);
        });

        setTimeout(() => {
            hugEmoji.style.opacity = '0';
            hugEmoji.style.transform = 'translate(-50%, -50%) scale(0)';
        }, (petalCount * 30) + 2800);

        setTimeout(() => {
            hugEmoji.remove();
            overlay.classList.remove('show');
            if (section) section.dataset.hugAnimating = 'false';
        }, (petalCount * 30) + 3800);
    }

    // Global runner for Cute Birthday Poster Celebration
    function triggerNamedCardCelebration(sectionEl, e) {
        const section = (sectionEl && sectionEl.nodeType === 1) ? sectionEl : (typeof document !== 'undefined' ? document.getElementById('magic-named-birthday-card-section') : null);
        const d = (section && section.ownerDocument) || (typeof document !== 'undefined' ? document : null);
        const w = (d && d.defaultView) || (typeof window !== 'undefined' ? window : null);
        if (!d || !section) return;

        const cardWrap = section.querySelector('.magic-named-card-wrap') || d.getElementById('magic-named-card-wrap');
        const badge = section.querySelector('.magic-named-card-badge');

        if (cardWrap) {
            cardWrap.classList.remove('bounce');
            void cardWrap.offsetWidth;
            cardWrap.classList.add('bounce');
        }
        if (badge) {
            badge.classList.remove('bouncing');
            void badge.offsetWidth;
            badge.classList.add('bouncing');
        }

        // Play celebration audio
        let audioEl = d.getElementById('magic-named-card-audio');
        if (!audioEl) {
            audioEl = d.createElement('audio');
            audioEl.id = 'magic-named-card-audio';
            audioEl.src = '/assets/sounds/final-revel.mp3';
            audioEl.preload = 'auto';
            audioEl.volume = 0.6;
            audioEl.style.display = 'none';
            (d.body || d.head)?.appendChild(audioEl);
        }
        if (audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch(() => { });
        }

        // Calculate celebration center origin (from badge or card center)
        let originX = 0.5;
        let originY = 0.6;
        const originTarget = badge || cardWrap || section;
        if (originTarget && typeof originTarget.getBoundingClientRect === 'function') {
            const rect = originTarget.getBoundingClientRect();
            const winW = (w ? w.innerWidth : 360) || 360;
            const winH = (w ? w.innerHeight : 640) || 640;
            originX = Math.max(0.1, Math.min(0.9, (rect.left + rect.width / 2) / winW));
            originY = Math.max(0.1, Math.min(0.9, (rect.top + rect.height / 2) / winH));
        }

        // Multi-stage confetti cannon burst
        ensureConfetti((cfn) => {
            if (!cfn) return;
            const festiveColors = ['#ff4b72', '#ffd700', '#00b4d8', '#ff8c00', '#ff69b4', '#a0e7e5', '#b4f8c8', '#fbe7c6', '#9c88ff'];
            // 1. Center fountain explosion
            cfn({
                particleCount: 85,
                spread: 90,
                startVelocity: 42,
                origin: { x: originX, y: originY },
                colors: festiveColors,
                zIndex: 999999
            });
            // 2. Left side cannon
            setTimeout(() => {
                cfn({
                    particleCount: 55,
                    angle: 60,
                    spread: 75,
                    startVelocity: 48,
                    origin: { x: Math.max(0.05, originX - 0.22), y: Math.min(0.85, originY + 0.05) },
                    colors: festiveColors,
                    zIndex: 999999
                });
            }, 120);
            // 3. Right side cannon
            setTimeout(() => {
                cfn({
                    particleCount: 55,
                    angle: 120,
                    spread: 75,
                    startVelocity: 48,
                    origin: { x: Math.min(0.95, originX + 0.22), y: Math.min(0.85, originY + 0.05) },
                    colors: festiveColors,
                    zIndex: 999999
                });
            }, 240);
            // 4. Star & sparkle pop
            setTimeout(() => {
                cfn({
                    particleCount: 45,
                    spread: 120,
                    startVelocity: 35,
                    shapes: ['star', 'circle'],
                    scalar: 1.25,
                    origin: { x: originX, y: Math.max(0.2, originY - 0.1) },
                    colors: ['#ffd700', '#ff69b4', '#ffffff', '#ff9f43', '#00d2d3'],
                    zIndex: 999999
                });
            }, 360);
        });

        // Glowing shockwave ripple expanding from the button
        if (section) {
            const shockwave = d.createElement('div');
            shockwave.style.cssText = `
                position: absolute;
                top: ${badge ? (badge.offsetTop + badge.offsetHeight / 2) : (section.offsetHeight * 0.85)}px;
                left: 50%;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                border: 3px solid rgba(255, 215, 0, 0.85);
                box-shadow: 0 0 25px rgba(255, 105, 180, 0.7), inset 0 0 15px rgba(255, 215, 0, 0.6);
                pointer-events: none;
                z-index: 20;
                animation: namedShockwaveExpand 0.9s ease-out forwards;
            `;
            section.appendChild(shockwave);
            setTimeout(() => shockwave.remove(), 950);
        }

        // Scatter 22 cute floating celebratory particles & emojis across 360 degrees
        const emojis = ['🎉', '✨', '🎈', '💖', '🍰', '🍓', '⭐', '🐼', '🐻', '🎊', '🎀', '💫', '🧁', '🌟', '🥳', '🎂'];
        const hostContainer = section || d.body;
        const spawnX = badge ? (badge.offsetLeft + badge.offsetWidth / 2) : (section.offsetWidth / 2);
        const spawnY = badge ? (badge.offsetTop + badge.offsetHeight / 2) : (section.offsetHeight * 0.82);

        for (let i = 0; i < 22; i++) {
            const particle = d.createElement('div');
            const emoji = emojis[i % emojis.length];
            const angle = (i / 22) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const distance = 80 + Math.random() * 140;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance - (40 + Math.random() * 50); // Biased upwards
            const rot = (Math.random() * 360 - 180) + 'deg';
            const size = 18 + Math.random() * 16;
            const duration = 1.3 + Math.random() * 0.6;
            const delay = Math.random() * 0.12;

            particle.innerText = emoji;
            particle.style.cssText = `
                position: absolute;
                left: ${spawnX}px;
                top: ${spawnY}px;
                font-size: ${size}px;
                pointer-events: none;
                z-index: 25;
                user-select: none;
                -webkit-user-select: none;
                --tx: ${tx}px;
                --ty: ${ty}px;
                --rot: ${rot};
                animation: namedCelebrationScatter ${duration}s cubic-bezier(0.12, 0.85, 0.32, 1) ${delay}s forwards;
            `;
            hostContainer.appendChild(particle);
            setTimeout(() => particle.remove(), (duration + delay) * 1000 + 200);
        }

        // Glowing light spark particle dots
        for (let j = 0; j < 14; j++) {
            const spark = d.createElement('div');
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkDist = 60 + Math.random() * 110;
            const stx = Math.cos(sparkAngle) * sparkDist + 'px';
            const sty = (Math.sin(sparkAngle) * sparkDist - 30) + 'px';
            const sparkColor = ['#ffd700', '#ff69b4', '#00f2fe', '#ff9ff3', '#feca57'][j % 5];
            const sparkSize = 6 + Math.random() * 8;

            spark.style.cssText = `
                position: absolute;
                left: ${spawnX}px;
                top: ${spawnY}px;
                width: ${sparkSize}px;
                height: ${sparkSize}px;
                background: ${sparkColor};
                border-radius: 50%;
                box-shadow: 0 0 10px ${sparkColor}, 0 0 20px #fff;
                pointer-events: none;
                z-index: 24;
                --stx: ${stx};
                --sty: ${sty};
                animation: namedSparkleBurst ${0.9 + Math.random() * 0.4}s ease-out forwards;
            `;
            hostContainer.appendChild(spark);
            setTimeout(() => spark.remove(), 1400);
        }
    }

    if (typeof window !== 'undefined') {
        window.triggerBlowAndCutCake = triggerBlowAndCutCake;
        window.triggerCakeSliceTap = triggerCakeSliceTap;
        window.triggerVirtualHug = triggerVirtualHug;
        window.triggerNamedCardCelebration = triggerNamedCardCelebration;
    }

    const featureMap = {
        lock: {
            enable(d, w, userName, customText) {
                if (d.getElementById("lock-overlay")) return {};
                if (w?.lockUnlocked || window.lockUnlocked) return {};

                // If countdown is active, defer lock screen until countdown finishes
                if (d.getElementById("magic-countdown-overlay") || (w && w.countdownFinished === false) || (typeof window !== 'undefined' && window.countdownFinished === false)) {
                    const onCountdownDone = () => {
                        window.removeEventListener('countdownFinished', onCountdownDone);
                        if (w && w !== window) w.removeEventListener('countdownFinished', onCountdownDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('countdownFinished', onCountdownDone);
                        featureMap.lock.enable(d, w, userName, customText);
                    };
                    window.addEventListener('countdownFinished', onCountdownDone);
                    if (w && w !== window) w.addEventListener('countdownFinished', onCountdownDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('countdownFinished', onCountdownDone);
                    return {};
                }

                // Ensure curtains or welcome message are removed if lock screen appears
                const existingCurtain = d.getElementById("magic-curtain-reveal-root");
                if (existingCurtain) {
                    if (d.body && existingCurtain._prevOverflow !== undefined) d.body.style.overflow = existingCurtain._prevOverflow || "";
                    existingCurtain.remove();
                }
                const existingWelcome = d.getElementById("magic-welcome-typing-root");
                if (existingWelcome) {
                    existingWelcome.remove();
                    if (d.body) d.body.classList.remove('magic-noscroll');
                }

                // Ensure Font Awesome is loaded
                if (!d.getElementById('greeter-font-awesome')) {
                    const faLink = d.createElement('link');
                    faLink.id = 'greeter-font-awesome';
                    faLink.rel = 'stylesheet';
                    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
                    (d.head || d.body)?.appendChild(faLink);
                }
                const password = (customText && customText.trim()) ? customText.trim() : '1234';
                const overlay = d.createElement("div");
                overlay.id = "lock-overlay";
                overlay.style.cssText = "position:fixed; inset:0; background:linear-gradient(135deg, rgba(26, 16, 37, 0.95) 0%, rgba(123, 93, 246, 0.8) 50%, rgba(255, 122, 47, 0.8) 100%); z-index:2147483649; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Inter', sans-serif; color:white; backdrop-filter:blur(15px); opacity:0; transition:opacity 0.8s ease-in-out;";
                // Preload unlock audio
                const unlockAudio = d.createElement('audio');
                unlockAudio.src = '/assets/sounds/unlocked.mp3';
                unlockAudio.volume = 0.5;
                unlockAudio.preload = 'auto';
                overlay.appendChild(unlockAudio);
                // Animated particles
                const particlesContainer = d.createElement('div');
                particlesContainer.style.cssText = "position:absolute; inset:0; pointer-events:none; overflow:hidden;";
                overlay.appendChild(particlesContainer);
                // Create floating particles
                for (let i = 0; i < 20; i++) {
                    const particle = d.createElement('div');
                    particle.style.cssText = `position:absolute; left:${Math.random() * 100}%; top:${Math.random() * 100}%; width:4px; height:4px; background:#fff; border-radius:50%; opacity:0.6; animation:floatParticle ${2 + Math.random() * 2}s infinite ease-in-out;`;
                    particlesContainer.appendChild(particle);
                }
                if (!d.getElementById('lock-styles')) {
                    const style = d.createElement('style');
                    style.id = 'lock-styles';
                    style.textContent = `@keyframes floatParticle{0%,100%{transform:translateY(0px) rotate(0deg); opacity:0.6;} 50%{transform:translateY(-20px) rotate(180deg); opacity:1;}} @keyframes pulse{0%,100%{transform:scale(1); opacity:0.8;} 50%{transform:scale(1.1); opacity:1;}} @keyframes shake{0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);}} #lock-overlay input::placeholder{color:rgba(255,255,255,0.7);}`;
                    (d.head || d.body)?.appendChild(style);
                }
                const icon = d.createElement('div');
                icon.innerHTML = '<i class="fas fa-lock" style="font-size:120px; color:#ffffff; margin-bottom:20px; text-shadow:0 0 30px rgba(255,255,255,0.5); animation:pulse 2s infinite;"></i>';
                overlay.appendChild(icon);
                const title = d.createElement('div');
                title.style.cssText = "font-size:2rem; font-weight:700; margin-bottom:10px; text-align:center;";
                title.innerHTML = '<i class="fas fa-lock" style="color:#ffffff; margin-right:10px;"></i> This Website Is Locked <i class="fas fa-lock" style="color:#ffffff; margin-left:10px;"></i>';
                overlay.appendChild(title);
                const msg = d.createElement('div');
                msg.style.cssText = "font-size:1.1rem; margin-bottom:30px; text-align:center; opacity:0.9;";
                msg.innerText = 'Enter the secret password to unlock your surprise!';
                overlay.appendChild(msg);
                const input = d.createElement('input');
                input.type = 'password';
                input.placeholder = 'Enter password...';
                input.style.cssText = "width:280px; padding:15px 20px; border-radius:30px; border:2px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); color:white; font-size:1rem; text-align:center; outline:none; margin-bottom:20px; transition:all 0.3s;";
                input.onfocus = () => input.style.borderColor = '#7b5df6';
                input.onblur = () => input.style.borderColor = 'rgba(255,255,255,0.3)';
                input.addEventListener('keydown', (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') btn.click();
                });
                overlay.appendChild(input);
                // Preload wrong password audio
                const wrongAudio = d.createElement('audio');
                wrongAudio.src = '/assets/sounds/wrong-input.mp3';
                wrongAudio.volume = 0.5;
                wrongAudio.preload = 'auto';
                overlay.appendChild(wrongAudio);

                const btn = d.createElement('button');
                btn.innerHTML = '<i class="fas fa-key" style="margin-right:8px;"></i> Unlock Surprise <i class="fas fa-key" style="margin-left:8px;"></i>';
                btn.style.cssText = "background:linear-gradient(135deg, #7b5df6, #ff7a2f); border:none; color:white; padding:15px 30px; border-radius:40px; font-size:1.1rem; font-weight:700; cursor:pointer; box-shadow:0 8px 25px rgba(123, 93, 246, 0.4); transition:all 0.3s;";
                btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
                btn.onmouseout = () => btn.style.transform = 'translateY(0)';
                btn.onclick = () => {
                    if (input.value.trim().toLowerCase() === password.trim().toLowerCase()) {
                        // Play unlock sound
                        unlockAudio.currentTime = 0;
                        unlockAudio.play().catch(e => console.log('Unlock audio failed:', e));
                        // Background music will resume cleanly once unlock sound finishes and lockUnlocked event fires
                        overlay.style.opacity = '0';
                        setTimeout(() => {
                            overlay.remove();
                            if (w) w.lockUnlocked = true;
                            window.lockUnlocked = true;
                            try { if (w && typeof w.dispatchEvent === 'function') w.dispatchEvent(new CustomEvent('lockUnlocked')); } catch (e) { }
                            try { if (typeof window !== 'undefined' && window !== w) window.dispatchEvent(new CustomEvent('lockUnlocked')); } catch (e) { }
                            try { if (d && typeof d.dispatchEvent === 'function') d.dispatchEvent(new CustomEvent('lockUnlocked')); } catch (e) { }
                        }, 800);
                    } else {
                        // Play wrong password sound
                        wrongAudio.currentTime = 0;
                        wrongAudio.play().catch(e => console.log('Wrong password audio failed:', e));
                        input.style.borderColor = '#ff4da6';
                        input.style.animation = 'shake 0.5s';
                        setTimeout(() => {
                            input.style.borderColor = 'rgba(255,255,255,0.3)';
                            input.style.animation = '';
                        }, 500);
                    }
                };
                overlay.appendChild(btn);
                d.body.appendChild(overlay);
                // Animate in
                setTimeout(() => overlay.style.opacity = '1', 100);
                return { cleanup: () => overlay.remove() };
            },
            disable(d) { d?.getElementById("lock-overlay")?.remove(); }
        }, curtainReveal: {
            enable(d, w, userName, customText, images, customEmoji, audio) {
                if (d.getElementById("magic-curtain-reveal-root")) return;

                // If countdown is active, defer curtains until countdown finishes
                if (d.getElementById("magic-countdown-overlay") || (w && w.countdownFinished === false) || (typeof window !== 'undefined' && window.countdownFinished === false)) {
                    const onCountdownDone = () => {
                        window.removeEventListener('countdownFinished', onCountdownDone);
                        if (w && w !== window) w.removeEventListener('countdownFinished', onCountdownDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('countdownFinished', onCountdownDone);
                        featureMap.curtainReveal.enable(d, w, userName, customText, images, customEmoji, audio);
                    };
                    window.addEventListener('countdownFinished', onCountdownDone);
                    if (w && w !== window) w.addEventListener('countdownFinished', onCountdownDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('countdownFinished', onCountdownDone);
                    return;
                }

                // If lock screen is currently active and not unlocked, defer curtains until lock is unlocked
                if (d.getElementById("lock-overlay") || (w && w.lockUnlocked === false) || (typeof window !== 'undefined' && window.lockUnlocked === false)) {
                    const onLockDone = () => {
                        window.removeEventListener('lockUnlocked', onLockDone);
                        if (w && w !== window) w.removeEventListener('lockUnlocked', onLockDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('lockUnlocked', onLockDone);
                        featureMap.curtainReveal.enable(d, w, userName, customText, images, customEmoji, audio);
                    };
                    window.addEventListener('lockUnlocked', onLockDone);
                    if (w && w !== window) w.addEventListener('lockUnlocked', onLockDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('lockUnlocked', onLockDone);
                    return;
                }

                // Ensure welcome typing overlay is removed if curtains are being shown
                const existingWelcome = d.getElementById("magic-welcome-typing-root");
                if (existingWelcome) {
                    existingWelcome.remove();
                    if (d.body) d.body.classList.remove('magic-noscroll');
                }
                const cd = d.createElement("div");
                cd.id = "magic-curtain-reveal-root";
                cd.style.cssText = "position:fixed; inset:0; z-index:2147483647; display:flex; pointer-events:auto; overflow:hidden; visibility:visible !important; opacity:1 !important;";

                // Inject pulse animation for button if not present
                if (!d.getElementById("magic-curtain-style")) {
                    const cs = d.createElement("style");
                    cs.id = "magic-curtain-style";
                    cs.textContent = `
                    @keyframes magicCurtainPulse {
                        0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 8px 25px rgba(123, 93, 246, 0.5), 0 0 15px rgba(255, 122, 47, 0.3); }
                        50% { transform: translate(-50%, -50%) scale(1.06); box-shadow: 0 14px 35px rgba(255, 122, 47, 0.7), 0 0 25px rgba(123, 93, 246, 0.6); }
                    }
                `;
                    (d.head || d.body)?.appendChild(cs);
                }

                cd.innerHTML = `
                <div class="left" style="flex:1; background:repeating-linear-gradient(90deg,#5a0000 0,#8a0000 40px,#5a0000 80px); transition:transform 3.2s cubic-bezier(0.4, 0, 0.2, 1); transform-origin:left; box-shadow: 10px 0 30px rgba(0,0,0,0.5); border-right: 2px solid gold;"></div>
                <div class="right" style="flex:1; background:repeating-linear-gradient(90deg,#5a0000 0,#8a0000 40px,#5a0000 80px); transition:transform 3.2s cubic-bezier(0.4, 0, 0.2, 1); transform-origin:right; box-shadow: -10px 0 30px rgba(0,0,0,0.5); border-left: 2px solid gold;"></div>
                <button id="curtain-open-btn" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:linear-gradient(145deg, #7b5df6 0%, #ff7a2f 100%); color:white; border:none; padding:16px 34px; border-radius:50px; font-size:19px; font-weight:800; cursor:pointer; box-shadow:0 8px 20px rgba(123, 93, 246, 0.4); pointer-events:auto; z-index:2147483648; animation:magicCurtainPulse 2s infinite ease-in-out; letter-spacing:0.5px;">✨ Open Curtains ✨</button>
            `;

                if (d.body) {
                    cd._prevOverflow = d.body.style.overflow;
                    d.body.style.overflow = "hidden";
                    d.body.appendChild(cd);
                } else {
                    d.documentElement.appendChild(cd);
                }

                // Ensure secret letter envelope is hidden while curtains are closed
                const existingEnv = d.getElementById("magic-old-letter-envelope");
                if (existingEnv) {
                    existingEnv.style.opacity = "0";
                    existingEnv.style.visibility = "hidden";
                    existingEnv.style.pointerEvents = "none";
                }

                const btn = cd.querySelector("#curtain-open-btn");
                let opened = false;
                const openCurtains = () => {
                    if (opened) return;
                    opened = true;
                    cd._isOpening = true;
                    if (w) w.curtainsOpening = true;
                    if (typeof window !== 'undefined') window.curtainsOpening = true;
                    cd.style.pointerEvents = "none";
                    if (d.body) d.body.style.overflow = cd._prevOverflow || "";
                    const l = cd.querySelector(".left");
                    const r = cd.querySelector(".right");
                    if (l) l.style.transform = "translateX(-100%)";
                    if (r) r.style.transform = "translateX(100%)";
                    if (btn) btn.remove();
                    try {
                        if (w && typeof w.scrollTo === 'function') {
                            w.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    } catch (err) { }

                    // Reveal secret letter 1.5s after curtain starts opening
                    setTimeout(() => {
                        const envEl = d.getElementById("magic-old-letter-envelope");
                        if (envEl) {
                            envEl.style.opacity = "1";
                            envEl.style.visibility = "visible";
                            envEl.style.pointerEvents = "auto";
                        }
                    }, 1500);

                    // Dispatch curtainOpened immediately as the user opens curtains
                    // so the welcome screen appears right behind the opening curtains!
                    try { if (w && typeof w.dispatchEvent === 'function') w.dispatchEvent(new CustomEvent('curtainOpened')); } catch (e) { }
                    try { if (typeof window !== 'undefined' && window !== w) window.dispatchEvent(new CustomEvent('curtainOpened')); } catch (e) { }
                    try { if (d && typeof d.dispatchEvent === 'function') d.dispatchEvent(new CustomEvent('curtainOpened')); } catch (e) { }

                    // Clean up curtain element after 3.2s animation finishes
                    setTimeout(() => {
                        cd._isOpening = false;
                        cd?.remove();
                    }, 3500);
                };

                if (btn) btn.onclick = openCurtains;
                // Fail-safe: Auto open curtains after 25s if user doesn't tap
                const autoTimer = setTimeout(() => { if (!opened) openCurtains(); }, 25000);
                return {
                    cleanups: [() => { clearTimeout(autoTimer); if (d.body) d.body.style.overflow = cd._prevOverflow || ""; }]
                };
            },
            disable(d) {
                const el = d?.getElementById("magic-curtain-reveal-root");
                if (el) {
                    if (el._isOpening) return; // Don't remove while opening animation is actively playing
                    if (d.body && el._prevOverflow !== undefined) d.body.style.overflow = el._prevOverflow || "";
                    el.remove();
                }
            }
        },

        welcomeTyping: {
            enable(d, w, userName, customText, images, customEmoji, audio, mediaUrl) {
                if (d.getElementById("magic-welcome-typing-root")) return;

                // Defer welcome typing if countdown, lock, or unopened curtains are active
                if (d.getElementById("magic-countdown-overlay") || (w && w.countdownFinished === false) || (typeof window !== 'undefined' && window.countdownFinished === false)) {
                    const onCountdownDone = () => {
                        window.removeEventListener('countdownFinished', onCountdownDone);
                        if (w && w !== window) w.removeEventListener('countdownFinished', onCountdownDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('countdownFinished', onCountdownDone);
                        featureMap.welcomeTyping.enable(d, w, userName, customText);
                    };
                    window.addEventListener('countdownFinished', onCountdownDone);
                    if (w && w !== window) w.addEventListener('countdownFinished', onCountdownDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('countdownFinished', onCountdownDone);
                    return {};
                }
                if (d.getElementById("lock-overlay") || (w && w.lockUnlocked === false) || (typeof window !== 'undefined' && window.lockUnlocked === false)) {
                    const onLockDone = () => {
                        window.removeEventListener('lockUnlocked', onLockDone);
                        if (w && w !== window) w.removeEventListener('lockUnlocked', onLockDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('lockUnlocked', onLockDone);
                        featureMap.welcomeTyping.enable(d, w, userName, customText);
                    };
                    window.addEventListener('lockUnlocked', onLockDone);
                    if (w && w !== window) w.addEventListener('lockUnlocked', onLockDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('lockUnlocked', onLockDone);
                    return {};
                }

                const curtainEl = d.getElementById("magic-curtain-reveal-root");
                const isCurtainOpening = (curtainEl && curtainEl._isOpening) || (w && w.curtainsOpening) || (typeof window !== 'undefined' && window.curtainsOpening);
                const isCurtainClosed = curtainEl && !isCurtainOpening;

                if (isCurtainClosed || (!isCurtainOpening && ((w && w.curtainOpened === false) || (typeof window !== 'undefined' && window.curtainOpened === false)))) {
                    const onCurtainDone = () => {
                        window.removeEventListener('curtainOpened', onCurtainDone);
                        if (w && w !== window) w.removeEventListener('curtainOpened', onCurtainDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('curtainOpened', onCurtainDone);
                        featureMap.welcomeTyping.enable(d, w, userName, customText);
                    };
                    window.addEventListener('curtainOpened', onCurtainDone);
                    if (w && w !== window) w.addEventListener('curtainOpened', onCurtainDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('curtainOpened', onCurtainDone);
                    return {};
                }

                if (typeof injectFontsIfNeeded === 'function') injectFontsIfNeeded(d);

                const lang = window.currentLang || 'en';
                const trans = window.translations?.[lang] || {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };

                if (!d.getElementById('magic-welcome-styles')) {
                    const style = d.createElement('style');
                    style.id = 'magic-welcome-styles';
                    style.textContent = `
                    body.magic-noscroll { overflow: hidden !important; position: fixed !important; width: 100% !important; height: 100% !important; } 
                    .magic-emoji { display: inline-block; -webkit-text-fill-color: initial !important; background: none !important; color: initial !important; animation: magicHeartBeat 2s infinite; } 
                    @keyframes magicHeartBeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }

                    /* Global Responsive Styles for Magic Features */
                    [id^="magic-"][id$="-section"] {
                        margin-left: auto !important;
                        margin-right: auto !important;
                        align-self: center !important;
                        transition: all 0.3s ease;
                    }

                    @media (max-width: 768px) {
                        [id^="magic-"][id$="-section"] {
                            margin-top: 1.2rem !important;
                            margin-bottom: 1.2rem !important;
                            margin-left: auto !important;
                            margin-right: auto !important;
                        }
                        #magic-fireworks-canvas { height: 300px !important; }
                        #gift-box-emoji { font-size: 5rem !important; }
                        .magic-scratch-card { width: 220px !important; height: 220px !important; }
                    }

                    @media (max-width: 480px) {
                        [id^="magic-"][id$="-section"] {
                            margin-top: 0.8rem !important;
                            margin-bottom: 0.8rem !important;
                            margin-left: auto !important;
                            margin-right: auto !important;
                        }
                        #magic-fireworks-canvas { height: 250px !important; }
                        #gift-box-emoji { font-size: 4rem !important; }
                        #gift-container p { font-size: 0.9rem !important; }
                        #magic-scratch-section h2 { font-size: 1.8rem !important; }
                        .magic-timeline-card { min-width: 200px !important; padding: 15px !important; }
                        .magic-timeline-card img { height: 120px !important; }
                        .magic-letter-card { padding: 25px !important; font-size: 1.4rem !important; }
                        .magic-hug-avatar { font-size: 60px !important; }
                        .magic-timeline-wrap {
                            display: flex !important;
                            gap: 15px !important;
                            overflow-x: scroll !important;
                            -webkit-overflow-scrolling: touch !important;
                            scroll-snap-type: x mandatory !important;
                            padding: 20px 10px !important;
                            margin: 0 -10px !important;
                        }
                    }
                `;
                    d.head.appendChild(style);
                }
                d.body.classList.add('magic-noscroll');

                const startTyping = () => {
                    const overlay = d.createElement("div");
                    overlay.id = "magic-welcome-typing-root";
                    overlay.style.cssText = "position: fixed; inset: 0; background: radial-gradient(circle at center, #6a0000, #2a0000); z-index: 2147483646; pointer-events: none; transition: opacity 1.5s ease; opacity: 1;";
                    const container = d.createElement("div");
                    container.style.cssText = "position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; transform: scale(0.5); opacity: 0; transition: transform 4s ease, opacity 4s ease;";

                    let msgText = customText;
                    if (!msgText) {
                        const def = trans.defaultWelcomeTyping;
                        msgText = typeof def === 'function' ? def(evData.event, evData.festival) : (def || "Welcome");
                    }

                    const DEFAULT_WELCOME_MEDIA = '/assets/media/1000009888.webm';
                    let mediaSource = (mediaUrl !== undefined && mediaUrl !== '') ? mediaUrl : ((typeof images === 'string' && images) ? images : (images && images.length ? images[0] : '')) || (typeof customEmoji === 'string' && customEmoji.startsWith('/assets/media') ? customEmoji : '') || DEFAULT_WELCOME_MEDIA;
                    if (mediaSource === 'none' || mediaSource === 'null' || mediaSource === false) {
                        mediaSource = '';
                    }
                    let mediaHtml = '';
                    if (mediaSource) {
                        if (mediaSource.match(/\.(webm|mp4|mov)$/i)) {
                            mediaHtml = `<div class="magic-welcome-media-wrap" style="margin-bottom: clamp(12px, 2.5vh, 20px); display: flex; justify-content: center; align-items: center; width: 100%;"><video class="magic-welcome-media" src="${escapeHtml(mediaSource)}" autoplay loop muted playsinline webkit-playsinline preload="auto" style="width: min(94vw, 560px); height: auto; max-height: clamp(200px, 35vh, 400px); object-fit: contain; filter: drop-shadow(0 0 40px rgba(255,122,47,0.55)); pointer-events: none; will-change: transform; transform: translateZ(0); backface-visibility: hidden; animation: magicHeartBeat 3s infinite ease-in-out;"></video></div>`;
                        } else {
                            mediaHtml = `<div class="magic-welcome-media-wrap" style="margin-bottom: clamp(12px, 2.5vh, 20px); display: flex; justify-content: center; align-items: center; width: 100%;"><img class="magic-welcome-media" src="${escapeHtml(mediaSource)}" alt="Welcome animation" style="width: min(94vw, 520px); height: auto; max-height: clamp(190px, 33vh, 360px); object-fit: contain; filter: drop-shadow(0 0 40px rgba(255,122,47,0.55)); pointer-events: none; animation: magicHeartBeat 3s infinite ease-in-out;" /></div>`;
                        }
                    }
                    container.innerHTML = mediaHtml + `<h1 style="font-family: 'Great Vibes', cursive; font-size: clamp(2.4rem, 8vw, 4.8rem); color: #fff !important; text-shadow: 0 0 20px rgba(255,255,255,0.5); margin-bottom: 15px;">Welcome ${escapeHtml(userName)} <span class="magic-emoji">\uD83D\uDC96</span></h1><p id="magic-typing-welcome-msg" style="margin-top: 15px; font-size: clamp(1.3rem, 4.5vw, 2rem); color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.3); font-family: 'Poppins', sans-serif;"></p>`;
                    overlay.appendChild(container);
                    overlay.style.cursor = "pointer";
                    overlay.title = (window.currentLang === 'hi') ? "आगे बढ़ने के लिए टैप करें" : "Tap anywhere to continue";
                    overlay.addEventListener('click', () => { finishWelcome(); });
                    d.body.appendChild(overlay);
                    const msgPara = container.querySelector("#magic-typing-welcome-msg");

                    let finished = false;
                    const finishWelcome = () => {
                        if (finished) return;
                        finished = true;
                        const audio = d.getElementById('magic-welcome-audio');
                        if (audio) { audio.pause(); audio.remove(); }
                        overlay.style.opacity = "0";
                        setTimeout(() => {
                            overlay?.remove();
                            d.body.classList.remove('magic-noscroll');
                            if (w) w.welcomeFinished = true;
                            window.welcomeFinished = true;
                            try { if (w && typeof w.dispatchEvent === 'function') w.dispatchEvent(new CustomEvent('welcomeTypingFinished')); } catch (e) { }
                            try { if (typeof window !== 'undefined' && window !== w) window.dispatchEvent(new CustomEvent('welcomeTypingFinished')); } catch (e) { }
                            try { if (d && typeof d.dispatchEvent === 'function') d.dispatchEvent(new CustomEvent('welcomeTypingFinished')); } catch (e) { }
                        }, 1200);
                    };

                    setTimeout(() => {
                        container.style.transform = "scale(1.2)";
                        container.style.opacity = "1";

                        // Attempt audio playback gracefully
                        try {
                            const audio = d.createElement('audio');
                            audio.id = 'magic-welcome-audio';
                            audio.src = '/assets/sounds/typing.mp3';
                            audio.loop = true; audio.volume = 0.5; audio.preload = 'auto';
                            d.body.appendChild(audio);
                            audio.play().catch(() => { });
                        } catch (e) { }

                        // Start typing text independently of audio canplay event
                        let idx = 0;
                        const iv = setInterval(() => {
                            if (msgPara && idx < msgText.length) {
                                msgPara.innerHTML += msgText[idx];
                                idx++;
                            } else {
                                clearInterval(iv);
                                setTimeout(finishWelcome, 4500); // Generous 4.5s post-typing screen time
                            }
                        }, 65);
                        overlay._typingIv = iv;

                        // Fail-safe: Guarantee welcome message unfreezes after ample reading duration
                        const maxWelcomeDuration = Math.max(9500, (msgText.length * 65) + 5000);
                        setTimeout(finishWelcome, maxWelcomeDuration);
                    }, 100);

                    return { intervals: [] };
                };

                return startTyping();
            },
            disable(d) {
                const overlay = d?.getElementById("magic-welcome-typing-root");
                if (overlay && overlay._typingIv) clearInterval(overlay._typingIv);
                if (overlay) { overlay.remove(); d?.body?.classList?.remove('magic-noscroll'); }
                const audio = d?.getElementById('magic-welcome-audio');
                if (audio) { audio.pause(); audio.remove(); }
            }
        },

        fireworksText: {
            enable(d, w, userName, customText) {
                if (d.getElementById("magic-fireworks-section")) return;
                if (typeof injectFontsIfNeeded === 'function') injectFontsIfNeeded(d);
                const section = d.createElement("section");
                section.id = "magic-fireworks-section";
                section.style.cssText = "padding: clamp(24px, 3vw, 36px) clamp(16px, 2.5vw, 24px); text-align: center; background: rgba(0,0,0,0.08); border-radius: clamp(24px, 3vw, 36px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 680px; box-sizing: border-box; align-self: center; min-height: 400px; border: 1px solid rgba(255,255,255,0.1);";
                const title = d.createElement("h2");
                const lang = window.currentLang || 'en';
                const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
                title.innerText = (lang === 'hi' ? "\u0906\u0924\u093f\u0936\u092c\u093e\u091c\u0940 \u091f\u0947\u0915\u094d\u0938\u094d\u091f" : "Fireworks Text");
                title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "clamp(2.2rem, 4vw, 3.2rem)"; title.style.color = "#ff7a2f";
                section.appendChild(title);
                const canvas = d.createElement("canvas");
                canvas.id = "magic-fireworks-canvas";
                canvas.style.cssText = "width:100%; height:clamp(350px, 45vh, 500px); display:block; margin-top:20px; border-radius:24px; background:#000;";
                canvas.width = 1000; canvas.height = 350;
                section.appendChild(canvas);
                insertSectionBeforeFinal(d, section);
                scrollToElement(d, section);

                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                const getMsg = () => {
                    if (customText) return customText;
                    const def = trans.defaultFireworksText;
                    if (typeof def === 'function') return def(userName, evData.event);

                    const ev = (evData.event || 'birthday').toLowerCase();
                    if (lang === 'hi') {
                        if (ev === 'anniversary') return `\u0938\u093e\u0932\u0917\u093f\u0930\u093e\u0939 \u092e\u0941\u092c\u093e\u0930\u0915 ${userName}!`;
                        if (ev === 'festival') return `\u0924\u094d\u092f\u094b\u0939\u093e\u0930 \u0915\u0940 \u0936\u0941\u092d\u0915\u093e\u092e\u0928\u093e\u0901!`;
                        if (ev === 'wedding') return `\u0936\u093e\u0926\u0940 \u0915\u0940 \u0938\u093e\u0932\u0917\u093f\u0930\u0939 \u092e\u0941\u092c\u093e\u0930\u0915!`;
                        return `\u091c\u0928\u094d\u092e\u0926\u093f\u0928 \u092e\u0941\u092c\u093e\u0930\u0915 ${userName}!`;
                    } else {
                        if (ev === 'anniversary') return `Happy Anniversary ${userName}!`;
                        if (ev === 'festival') return `Happy ${evData.festival || 'Festival'}!`;
                        if (ev === 'wedding') return `Happy Wedding Anniversary!`;
                        return `Happy Birthday ${userName}!`;
                    }
                };
                const msg = getMsg();
                let animationFrame = null, particles = [], targets = {}, formed = false;
                const ctx = canvas.getContext("2d");
                let canvasWidth = canvas.width, canvasHeight = canvas.height;
                const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF])/gu;
                const generateTargets = () => {
                    if (canvasWidth < 50 || canvasHeight < 50) return;
                    const off = d.createElement("canvas"); off.width = canvasWidth; off.height = canvasHeight;
                    const octx = off.getContext("2d");

                    let fontSize = Math.min(65, canvasHeight / 2.2);
                    octx.font = `bold ${fontSize}px 'Poppins', sans-serif`;
                    let totalWidth = octx.measureText(msg).width;
                    if (totalWidth > canvasWidth * 0.95) {
                        fontSize = fontSize * (canvasWidth * 0.95 / totalWidth);
                        octx.font = `bold ${fontSize}px 'Poppins', sans-serif`;
                        totalWidth = octx.measureText(msg).width;
                    }

                    const parts = [];
                    let lastIdx = 0, match;
                    while ((match = emojiRegex.exec(msg)) !== null) {
                        if (match.index > lastIdx) parts.push({ type: 'text', content: msg.substring(lastIdx, match.index) });
                        parts.push({ type: 'emoji', content: match[0] });
                        lastIdx = emojiRegex.lastIndex;
                    }
                    if (lastIdx < msg.length) parts.push({ type: 'text', content: msg.substring(lastIdx) });

                    octx.textBaseline = "middle";
                    octx.textAlign = "left";
                    let currentX = canvasWidth / 2 - totalWidth / 2;
                    let centerY = canvasHeight / 2;
                    const textPoints = [], emojiPoints = [];

                    parts.forEach(p => {
                        const w = octx.measureText(p.content).width;
                        if (p.type === 'text') {
                            octx.fillStyle = "#000"; octx.fillRect(0, 0, canvasWidth, canvasHeight);
                            octx.fillStyle = "#fff"; octx.fillText(p.content, currentX, centerY);
                            const data = octx.getImageData(0, 0, canvasWidth, canvasHeight).data;
                            const step = 2.2; // Optimized for both readability and performance
                            for (let y = 0; y < canvasHeight; y += step) {
                                for (let x = 0; x < canvasWidth; x += step) {
                                    if (data[(Math.floor(y) * canvasWidth + Math.floor(x)) * 4] > 100) textPoints.push({ x, y });
                                }
                            }
                        } else {
                            emojiPoints.push({ x: currentX + w / 2, y: centerY, char: p.content, size: fontSize * 1.2 });
                        }
                        currentX += w;
                    });
                    targets = { text: textPoints.slice(0, 5000), emojis: emojiPoints };
                };













                const resizeCanvas = () => {
                    const rect = canvas.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) { canvas.width = rect.width; canvas.height = rect.height; canvasWidth = canvas.width; canvasHeight = canvas.height; generateTargets(); }
                };
                w.addEventListener('resize', resizeCanvas);

                section._cleanup = () => {
                    if (animationFrame) cancelAnimationFrame(animationFrame);
                    w.removeEventListener('resize', resizeCanvas);
                };

                const textEmojiPool = ["\u2728", "\u2B50", "\uD83C\uDF1F", "\uD83D\uDcab", "\u2721\uFE0F"];
                class Particle {
                    constructor(x, y, char = null, size = null) {
                        this.x = x; this.y = y;
                        this.vx = (Math.random() - 0.5) * 8;
                        this.vy = (Math.random() - 0.5) * 10 - 6;
                        this.target = null; this.locked = false;
                        this.char = char || (Math.random() < 0.1 ? textEmojiPool[Math.floor(Math.random() * textEmojiPool.length)] : null);
                        this.color = this.char ? "#fff" : `hsl(${Math.random() * 360}, 100%, 75%)`;
                        this.size = size || (this.char ? 6 + Math.random() * 4 : 2 + Math.random() * 2.5);
                        this.alpha = 1;
                    }
                    update() {
                        if (!formed) {
                            this.x += this.vx; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.95; this.vy += 0.08;
                            this.alpha = Math.max(0, this.alpha - 0.005);
                        } else if (this.target && !this.locked) {
                            this.alpha = 1;
                            const dx = this.target.x - this.x, dy = this.target.y - this.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < 1) { this.x = this.target.x; this.y = this.target.y; this.locked = true; }
                            else { const move = dist * 0.18; this.x += (dx / dist) * move; this.y += (dy / dist) * move; }
                        }
                    }
                }










                function explode(x, y) { for (let i = 0; i < 150; i++) particles.push(new Particle(x, y)); }
                function formText() {
                    if (!targets.text) generateTargets();
                    particles = [];
                    targets.text.forEach(t => {
                        const p = new Particle(Math.random() * canvasWidth, canvasHeight + 50);
                        p.target = t;
                        particles.push(p);
                    });
                    targets.emojis.forEach(t => {
                        const p = new Particle(Math.random() * canvasWidth, canvasHeight + 50);
                        p.target = t;
                        p.char = t.char;
                        p.size = t.size;
                        particles.push(p);
                    });
                    formed = true;
                }
                function draw() {
                    ctx.fillStyle = "rgba(0,0,0,0.25)";
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                    // Set text properties once for all particles
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    for (let p of particles) {
                        ctx.globalAlpha = p.alpha;
                        if (p.char) {
                            ctx.font = `${p.size}px sans-serif`;
                            ctx.fillStyle = "#fff";
                            ctx.fillText(p.char, p.x, p.y);
                        } else {
                            ctx.fillStyle = p.color;
                            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                        }
                    }
                    ctx.globalAlpha = 1;
                }
                function animate() { for (let p of particles) p.update(); draw(); animationFrame = requestAnimationFrame(animate); }
                let rocketInterval = null;
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        // Reset animation state
                        particles = [];
                        formed = false;
                        if (animationFrame) cancelAnimationFrame(animationFrame);
                        if (rocketInterval) clearInterval(rocketInterval);

                        setTimeout(() => {
                            resizeCanvas();
                            rocketInterval = setInterval(() => {
                                if (particles.length < 200) {
                                    explode(Math.random() * canvasWidth, canvasHeight);
                                    if (Math.random() < 0.5) explode(Math.random() * canvasWidth, canvasHeight);
                                }
                            }, 60);
                            setTimeout(() => {
                                if (rocketInterval) clearInterval(rocketInterval);
                                formText();
                            }, 6000);
                            animate();
                        }, 300);
                    }
                }, { threshold: 0.2 });
                observer.observe(section);

                const cleanup = () => {
                    if (animationFrame) cancelAnimationFrame(animationFrame);
                    if (rocketInterval) clearInterval(rocketInterval);
                    window.removeEventListener('resize', resizeCanvas);
                };
                section._cleanup = cleanup;
                return { cleanup };
            },
            disable(d) {
                const el = d?.getElementById("magic-fireworks-section");
                if (el && el._cleanup) el._cleanup();
                el?.remove();
            }
        },

        flowerRain: {
            enable(d, w, ce) {
                this.disable(d);
                const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
                const emojiStr = (ce && ce.length && isEmoji(ce)) ? ce : "\uD83C\uDF38\uD83C\uDF3B\uD83C\uDF3A\uD83D\uDC90";
                const emojis = Array.from(emojiStr);
                const c = d.createElement("div"); c.id = "magic-flower-rain"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483000;";
                d.body.appendChild(c);
                const iv = setInterval(() => {
                    const f = d.createElement("div"); const e = emojis.length ? emojis[Math.floor(Math.random() * emojis.length)] : "\uD83C\uDF38";
                    f.innerHTML = e; f.style.cssText = `position:absolute; left:${Math.random() * 100}%; top:-30px; font-size:${24 + Math.random() * 20}px; animation:magicFlowerFall 3s linear forwards;`;
                    c.appendChild(f); setTimeout(() => f.remove(), 3000);
                }, 400);
                c._interval = iv;
                if (!d.querySelector("#magic-flower-keyframes")) { const s = d.createElement("style"); s.id = "magic-flower-keyframes"; s.textContent = `@keyframes magicFlowerFall{to{transform:translateY(110vh) rotate(360deg); opacity:0;}}`; d.head.appendChild(s); }
                return { intervals: [iv] };
            },
            disable(d) {
                const el = d?.getElementById("magic-flower-rain");
                if (el && el._interval) clearInterval(el._interval);
                el?.remove();
            }
        },

        flyingSwans: {
            enable(d, w, ce) {
                this.disable(d);
                const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
                const emojis = (ce && ce.length && isEmoji(ce)) ? Array.from(ce) : ["\uD83D\uDD4A"];
                const c = d.createElement("div"); c.id = "magic-swan-container"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483900;";
                d.body.appendChild(c);
                const iv = setInterval(() => {
                    const swan = d.createElement("div"); const em = emojis[Math.floor(Math.random() * emojis.length)]; swan.innerHTML = em; swan.style.cssText = `position:absolute; right:-50px; bottom:${Math.random() * 60 + 10}%; font-size:48px; animation:magicSwanFly 10s linear forwards;`;
                    c.appendChild(swan); setTimeout(() => swan.remove(), 10000);
                }, 4000);
                c._interval = iv;
                if (!d.querySelector("#magic-swan-keyframes")) { const s = d.createElement("style"); s.id = "magic-swan-keyframes"; s.textContent = `@keyframes magicSwanFly{0%{transform:translateX(0); opacity:0;}10%{opacity:1;}100%{transform:translateX(-130vw); opacity:0;}}`; d.head.appendChild(s); }
                return { intervals: [iv] };
            },
            disable(d) {
                const el = d?.getElementById("magic-swan-container");
                if (el && el._interval) clearInterval(el._interval);
                el?.remove();
            }
        },

        balloonParty: {
            enable(d, w, ce) {
                this.disable(d);
                const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
                const em = (ce && ce.length && isEmoji(ce)) ? Array.from(ce)[0] : "\uD83C\uDF88";
                const c = d.createElement("div"); c.id = "magic-balloon-root"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483100;";
                d.body.appendChild(c);
                const popAudio = d.createElement('audio');
                popAudio.id = 'magic-balloon-pop-audio';
                popAudio.src = '/assets/sounds/balloon-pop.mp3';
                popAudio.volume = 0.5;
                popAudio.preload = 'auto';
                popAudio.style.display = 'none';
                d.body.appendChild(popAudio);
                const iv = setInterval(() => {
                    const b = d.createElement("div"); b.innerHTML = em; b.style.cssText = `position:absolute; left:${Math.random() * 90}%; bottom:-80px; font-size:45px; cursor:pointer; animation:magicFloatUp ${6 + Math.random() * 5}s linear forwards; pointer-events:auto;`;
                    b.onclick = (e) => { e.stopPropagation(); b.remove(); popAudio.currentTime = 0; popAudio.play().catch(e => console.log('Balloon pop audio failed:', e)); const pop = d.createElement("div"); pop.innerText = "\uD83D\uDCA5"; pop.style.cssText = `position:absolute; left:${b.style.left}; bottom:${b.style.bottom}; font-size:30px;`; c.appendChild(pop); setTimeout(() => pop.remove(), 500); };
                    c.appendChild(b); setTimeout(() => b.remove(), 10000);
                }, 1800);
                c._interval = iv;
                if (!d.querySelector("#magic-balloon-style")) { const s = d.createElement("style"); s.id = "magic-balloon-style"; s.textContent = `@keyframes magicFloatUp{to{transform:translateY(-120vh);}}`; d.head.appendChild(s); }
                return { intervals: [iv] };
            },
            disable(d) {
                const el = d?.getElementById("magic-balloon-root");
                if (el && el._interval) clearInterval(el._interval);
                el?.remove();
                const popAudio = d?.getElementById("magic-balloon-pop-audio");
                if (popAudio) {
                    try { popAudio.pause(); popAudio.currentTime = 0; popAudio.src = ""; popAudio.load(); } catch (e) { }
                    popAudio.remove();
                }
            }
        },

        floatingBalloonsNamed: {
            enable(d, w, userName, customText) {
                this.disable(d);
                const nameDisplay = customText || userName;
                const c = d.createElement("div"); c.id = "magic-named-balloons"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483100;";
                d.body.appendChild(c);
                const popAudio = d.createElement('audio');
                popAudio.id = 'magic-named-balloon-audio';
                popAudio.src = '/assets/sounds/balloon-pop.mp3';
                popAudio.volume = 0.5;
                popAudio.preload = 'auto';
                popAudio.style.display = 'none';
                d.body.appendChild(popAudio);
                const colors = ["#ff4d4d", "#ff944d", "#ffdb4d", "#6bff4d", "#4dd2ff", "#b84dff"];
                const iv = setInterval(() => {
                    const balloon = d.createElement("div"); const randColor = colors[Math.floor(Math.random() * colors.length)];
                    balloon.style.cssText = `position:absolute; left:${Math.random() * 80 + 10}%; bottom:-100px; background:radial-gradient(circle at 30% 30%, ${randColor}, ${randColor}cc); width:70px; height:90px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; text-align:center; font-size:13px; box-shadow:0 6px 12px rgba(0,0,0,0.2); cursor:pointer; pointer-events:auto; animation:magicFloatUp 6s linear forwards; text-shadow:1px 1px 0 black;`;
                    balloon.innerText = nameDisplay.length > 12 ? nameDisplay.slice(0, 10) + ".." : nameDisplay;
                    const string = d.createElement("div"); string.style.cssText = "position:absolute; bottom:-12px; left:50%; width:2px; height:20px; background:brown; transform:translateX(-50%);";
                    balloon.appendChild(string); c.appendChild(balloon);
                    balloon.onclick = () => { balloon.remove(); popAudio.currentTime = 0; popAudio.play().catch(e => console.log('Balloon pop audio failed:', e)); const pop = d.createElement("div"); pop.innerText = "\uD83D\uDCA5"; pop.style.cssText = `position:absolute; left:${balloon.style.left}; bottom:${balloon.style.bottom}; font-size:24px;`; c.appendChild(pop); setTimeout(() => pop.remove(), 400); };
                    setTimeout(() => balloon.remove(), 6500);
                }, 2000);
                c._interval = iv;
                if (!d.querySelector("#magicFloatUpKey")) { const s = d.createElement("style"); s.id = "magicFloatUpKey"; s.textContent = `@keyframes magicFloatUp{to{transform:translateY(-120vh);}}`; d.head.appendChild(s); }
                return { intervals: [iv] };
            },
            disable(d) {
                const el = d?.getElementById("magic-named-balloons");
                if (el && el._interval) clearInterval(el._interval);
                el?.remove();
                const popAudio = d?.getElementById("magic-named-balloon-audio");
                if (popAudio) {
                    try { popAudio.pause(); popAudio.currentTime = 0; popAudio.src = ""; popAudio.load(); } catch (e) { }
                    popAudio.remove();
                }
            }
        },

        fireworksClick: {
            enable(d, w) {
                this.disable(d, w);
                const can = d.createElement("canvas"); can.id = "magic-firework-canvas"; can.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483500;";
                d.body.appendChild(can); const ctx = can.getContext("2d"); let parts = []; let anim = null;
                const blastAudio = d.createElement('audio');
                blastAudio.id = 'magic-blast-audio';
                blastAudio.src = '/assets/sounds/click-blast.mp3';
                blastAudio.volume = 0.5;
                blastAudio.preload = 'auto';
                blastAudio.style.display = 'none';
                d.body.appendChild(blastAudio);
                const resize = () => { can.width = (w || window).innerWidth; can.height = (w || window).innerHeight; }; resize(); (w || window).addEventListener("resize", resize);
                const boom = (x, y) => { for (let i = 0; i < 80; i++) { const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 6 + 2; parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: `hsl(${Math.random() * 360},100%,60%)`, size: 3 }); } };
                const handler = (e) => { boom(e.clientX, e.clientY); blastAudio.currentTime = 0; blastAudio.play().catch(e => console.log('Blast audio failed:', e)); if (anim === null) animate(); };
                const animate = () => {
                    if (!can.isConnected || !d.getElementById("magic-firework-canvas")) {
                        (w || window).removeEventListener("resize", resize);
                        (w || window).document?.body?.removeEventListener("click", handler);
                        return;
                    }
                    ctx.clearRect(0, 0, can.width, can.height); let alive = false; for (let i = 0; i < parts.length; i++) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.02; if (p.life <= 0) { parts.splice(i, 1); i--; continue; } alive = true; ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); } if (alive) anim = requestAnimationFrame(animate); else anim = null;
                };
                (w || window).document?.body?.addEventListener("click", handler);
                can._cleanup = () => {
                    (w || window).removeEventListener("resize", resize);
                    (w || window).document?.body?.removeEventListener("click", handler);
                    if (anim) cancelAnimationFrame(anim);
                };
                return {
                    listeners: [{ target: (w || window).document?.body, type: "click", handler }],
                    cleanup: can._cleanup
                };
            },
            disable(d, w) {
                const can = d?.getElementById("magic-firework-canvas");
                if (can && can._cleanup) can._cleanup();
                can?.remove();
                const blastAudio = d?.getElementById("magic-blast-audio");
                if (blastAudio) {
                    try { blastAudio.pause(); blastAudio.currentTime = 0; blastAudio.src = ""; blastAudio.load(); } catch (e) { }
                    blastAudio.remove();
                }
            }
        },

        bombExplosion: {
            enable(d, w) {
                if (d.getElementById("magic-bomb-root")) return;
                const root = d.createElement("div"); root.id = "magic-bomb-root";
                root.style.cssText = "position:fixed; bottom:50px; left:50%; transform:translateX(-50%); z-index:2147483600; cursor:pointer;";
                root.innerHTML = `<div id="magic-bomb-body" style="font-size:80px; position:relative; animation: bombWobble 0.5s infinite alternate ease-in-out;">\uD83D\uDCA3<div id="magic-bomb-fuse" style="position:absolute; top:5px; right:15px; width:8px; height:8px; background:#ff4500; border-radius:50%; box-shadow:0 0 10px #ff0, 0 0 20px #ff4500; animation: fuseSpark 0.1s infinite;"></div></div>`;
                d.body.appendChild(root);
                const bombAudio = d.createElement('audio');
                bombAudio.src = '/assets/sounds/bomb-blast.mp3';
                bombAudio.volume = 0.5;
                bombAudio.preload = 'auto';
                bombAudio.style.display = 'none';
                d.body.appendChild(bombAudio);
                if (!d.getElementById('magic-bomb-styles')) {
                    const s = d.createElement('style'); s.id = 'magic-bomb-styles';
                    s.textContent = `@keyframes bombWobble{from{transform:rotate(-5deg) scale(1);}to{transform:rotate(5deg) scale(1.1);}} @keyframes fuseSpark{0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.5; transform:scale(1.5);}}`;
                    d.head.appendChild(s);
                }
                const explode = () => {
                    root.remove(); bombAudio.currentTime = 0; bombAudio.play().catch(e => console.log('Bomb audio failed:', e)); const flash = d.createElement("div"); flash.style.cssText = "position:fixed; inset:0; background:white; opacity:0.9; z-index:2147483700; pointer-events:none;";
                    d.body.appendChild(flash); setTimeout(() => flash.remove(), 200); d.body.classList.add("magic-shake"); setTimeout(() => d.body.classList.remove("magic-shake"), 500);
                    const canvas = d.createElement("canvas"); canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483690;";
                    d.body.appendChild(canvas); const ctx = canvas.getContext("2d"); canvas.width = w.innerWidth; canvas.height = w.innerHeight; let parts = [];
                    for (let i = 0; i < 400; i++) parts.push({ x: w.innerWidth / 2, y: w.innerHeight - 90, vx: (Math.random() - 0.5) * 25, vy: (Math.random() - 0.5) * 20 - 10, life: 1, color: `hsl(${Math.random() * 40 + 10},100%,${50 + Math.random() * 50}%)`, size: 5 });
                    const anim = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); let live = false; parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.01; if (p.life > 0) { live = true; ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); } }); if (live) requestAnimationFrame(anim); else { canvas.remove(); setTimeout(() => { const canvas2 = d.createElement("canvas"); canvas2.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483690;"; d.body.appendChild(canvas2); const ctx2 = canvas2.getContext("2d"); canvas2.width = w.innerWidth; canvas2.height = w.innerHeight; let parts2 = []; for (let i = 0; i < 400; i++) parts2.push({ x: canvas2.width + Math.random() * 100, y: Math.random() * canvas2.height / 2 + canvas2.height / 4, vx: -(Math.random() * 5 + 3), vy: (Math.random() - 0.5) * 4 - 2, life: 1, color: `hsl(${Math.random() * 60 + 20},100%,70%)`, size: 3 }); const anim2 = () => { ctx2.clearRect(0, 0, canvas2.width, canvas2.height); let live2 = false; parts2.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.002; if (p.life > 0) { live2 = true; ctx2.globalAlpha = p.life; ctx2.fillStyle = p.color; ctx2.beginPath(); ctx2.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx2.fill(); } }); if (live2) requestAnimationFrame(anim2); else canvas2.remove(); }; anim2(); }, 200); } };
                    anim();
                };
                root.addEventListener("click", explode); return { listeners: [{ target: root, type: "click", handler: explode }] };
            },
            disable(d) {
                d?.getElementById("magic-bomb-root")?.remove();
                const bombAudio = d?.getElementById("magic-bomb-audio");
                if (bombAudio) {
                    try { bombAudio.pause(); bombAudio.currentTime = 0; bombAudio.src = ""; bombAudio.load(); } catch (e) { }
                    bombAudio.remove();
                }
            }
        },

        giftBoxOpen: {
            enable(d, w, userName, customText, images) {
                if (d.getElementById("magic-gift-section")) return;
                const section = d.createElement("section"); section.id = "magic-gift-section"; section.style.cssText = "padding: clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px); text-align: center; background: linear-gradient(145deg, rgba(255,215,0,0.1), rgba(255,100,0,0.05)); border-radius: clamp(20px, 2.5vw, 32px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 560px; box-sizing: border-box; align-self: center;";
                const title = d.createElement("h2"); title.innerText = "\uD83C\uDF81 " + (window.currentLang === 'hi' ? "\u0916\u093e\u0938 \u0924\u094b\u0939\u092b\u093e" : "Special Gift"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "clamp(1.8rem, 3vw, 2.4rem)"; title.style.color = "#ffd700";
                section.appendChild(title);
                const giftContainer = d.createElement("div"); giftContainer.id = "gift-container"; giftContainer.style.cursor = "pointer";
                giftContainer.innerHTML = `<div id="gift-box-emoji" style="font-size: 7rem; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">\uD83C\uDF81</div><p style="margin-top: 15px; font-weight:bold; color:#ffd700;">\u2728 Click to unlock the magic \u2728</p>`;
                section.appendChild(giftContainer);
                const giftAudio = d.createElement('audio');
                giftAudio.src = '/assets/sounds/gift-box.mp3';
                giftAudio.volume = 0.5;
                giftAudio.preload = 'auto';
                giftAudio.style.display = 'none';
                d.body.appendChild(giftAudio);
                if (!d.getElementById('magic-gift-styles')) {
                    const s = d.createElement('style'); s.id = 'magic-gift-styles';
                    s.textContent = `#gift-box-emoji { animation: giftWobble 2s infinite ease-in-out; } @keyframes giftWobble { 0%,100%{transform:rotate(0) scale(1);} 25%{transform:rotate(-8deg) scale(1.1);} 75%{transform:rotate(8deg) scale(1.1);} }`;
                    d.head.appendChild(s);
                }
                const revealDiv = d.createElement("div"); revealDiv.id = "gift-reveal"; revealDiv.style.display = "none"; revealDiv.style.marginTop = "20px";
                section.appendChild(revealDiv); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
                const handleOpen = () => {
                    giftAudio.currentTime = 0; giftAudio.play().catch(e => console.log('Gift audio failed:', e)); setTimeout(() => { giftContainer.style.display = "none"; revealDiv.style.display = "block"; revealDiv.style.animation = "giftRevealPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"; }, 100);
                    if (!d.getElementById('gift-reveal-key')) { const s = d.createElement('style'); s.id = 'gift-reveal-key'; s.textContent = '@keyframes giftRevealPop{from{transform:scale(0.5);opacity:0;}to{transform:scale(1);opacity:1;}}'; d.head.appendChild(s); }
                    const fallbackGiftPhotos = getRandomFallbackPngs(2);
                    let validGiftImgs = [];
                    const isGeneratedGift = Boolean(
                        (typeof w !== 'undefined' && w.__IS_GENERATED_PAGE__) ||
                        (typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__)
                    );
                    if (images && Array.isArray(images) && images.length > 0) {
                        if (isGeneratedGift) {
                            const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                            validGiftImgs = cleaned.length > 0 ? cleaned : [];
                        } else {
                            validGiftImgs = images.filter(src => src && typeof src === 'string' && src.trim() !== '');
                        }
                        if (validGiftImgs.length === 0 && images.length > 0) {
                            validGiftImgs = fallbackGiftPhotos;
                        }
                    }

                    if (validGiftImgs && validGiftImgs.length > 0) {
                        const gallery = d.createElement("div"); gallery.style.cssText = "display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;";
                        validGiftImgs.forEach((src, gIdx) => {
                            const img = d.createElement("img");
                            img.src = src;
                            img.style.cssText = "max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 20px; border: 4px solid gold; box-shadow:0 10px 20px rgba(0,0,0,0.2);";
                            img.onerror = () => { img.onerror = null; img.src = fallbackGiftPhotos[gIdx % fallbackGiftPhotos.length]; };
                            gallery.appendChild(img);
                        });
                        revealDiv.appendChild(gallery);
                    } else {
                        const msg = d.createElement("p"); msg.innerText = customText || (window.currentLang === 'hi' ? window.translations.hi.defaultGiftBoxOpen : window.translations.en.defaultGiftBoxOpen); msg.style.fontSize = "1.8rem"; msg.style.color = "#ffb347"; msg.style.fontFamily = "'Great Vibes', cursive"; revealDiv.appendChild(msg);
                    }
                    if (window.canvasConfetti) window.canvasConfetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });
                };
                giftContainer.addEventListener("click", handleOpen); return {};
            },
            disable(d) { d?.getElementById("magic-gift-section")?.remove(); }
        },

        textFormation: {
            enable(d, w, userName, customText) {
                this.disable(d);
                if (d.getElementById("magic-typing-card")) return;
                const card = d.createElement("div");
                card.id = "magic-typing-card";
                card.style.cssText = "position:fixed; bottom:20px; left:20px; right:20px; background:rgba(255,255,255,0.15); backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); color:white; text-align:center; padding:20px; font-size:1.4rem; font-weight:bold; z-index:2147483800; border-radius:24px; border:1px solid rgba(255,255,255,0.2); box-shadow:0 15px 35px rgba(0,0,0,0.4); font-family:'Poppins', sans-serif; opacity:0; transition:opacity 1s;";
                d.body.appendChild(card);

                const lang = window.currentLang || 'en';
                const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                const getDef = () => {
                    const def = trans.defaultTextFormation;
                    return typeof def === 'function' ? def(evData.event) : (def || "You are magic!");
                };
                const msg = customText || getDef();
                let idx = 0;

                // Trigger sequence after welcome screen completes (or after short delay if no welcome screen)
                const startSequence = () => {
                    if (!card.isConnected) return;
                    card.style.opacity = "1";
                    const audio = d.createElement('audio');
                    audio.id = 'magic-text-formation-audio';
                    audio.src = '/assets/sounds/typing.mp3';
                    audio.loop = true;
                    audio.volume = 0.5;
                    audio.preload = 'auto';
                    d.body.appendChild(audio);
                    audio.addEventListener('canplay', () => {
                        audio.play().catch(e => console.log('Audio play failed', e));
                        const iv = setInterval(() => {
                            if (!card.isConnected) {
                                clearInterval(iv);
                                return;
                            }
                            if (idx <= msg.length) {
                                card.innerHTML = msg.substring(0, idx) + (idx % 2 === 0 ? "█" : " ");
                                idx++;
                            } else {
                                clearInterval(iv);
                                const a = d.getElementById('magic-text-formation-audio');
                                if (a) { a.pause(); a.remove(); }
                                setTimeout(() => {
                                    if (card.parentNode) {
                                        card.style.opacity = "0";
                                        setTimeout(() => card.remove(), 1000);
                                    }
                                }, 6000);
                            }
                        }, 70);
                        card._typingInterval = iv;
                    });
                };

                const welcomeEl = d.getElementById("magic-welcome-typing-root");
                if (welcomeEl) {
                    const onWelcomeDone = () => {
                        window.removeEventListener('welcomeTypingFinished', onWelcomeDone);
                        if (w && w !== window) w.removeEventListener('welcomeTypingFinished', onWelcomeDone);
                        if (d && typeof d.removeEventListener === 'function') d.removeEventListener('welcomeTypingFinished', onWelcomeDone);
                        card._delayTimeout = setTimeout(startSequence, 1200);
                    };
                    window.addEventListener('welcomeTypingFinished', onWelcomeDone);
                    if (w && w !== window) w.addEventListener('welcomeTypingFinished', onWelcomeDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('welcomeTypingFinished', onWelcomeDone);
                    // Fallback in case event is missed
                    card._delayTimeout = setTimeout(startSequence, 11000);
                } else {
                    card._delayTimeout = setTimeout(startSequence, 3500);
                }

                return { cleanup: () => this.disable(d) };
            },
            disable(d) {
                const card = d?.getElementById("magic-typing-card");
                if (card) {
                    if (card._typingInterval) clearInterval(card._typingInterval);
                    if (card._delayTimeout) clearTimeout(card._delayTimeout);
                    card.remove();
                }
                const audio = d?.getElementById('magic-text-formation-audio');
                if (audio) {
                    audio.pause();
                    audio.remove();
                }
            }
        },

        scratchReveal: {
            enable(d, w, userName, customText, images) {
                if (d.getElementById("magic-scratch-section")) return;
                const section = d.createElement("section"); section.id = "magic-scratch-section"; section.style.cssText = "padding: clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px); background: rgba(0,0,0,0.05); border-radius: clamp(20px, 2.5vw, 32px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 560px; box-sizing: border-box; align-self: center;";
                const title = d.createElement("h2"); title.innerText = "\uD83C\uDFAB " + (window.currentLang === 'hi' ? "\u0938\u094d\u0915\u094d\u0930\u0948\u091a \u0915\u093e\u0930\u094d\u0921" : "Scratch Cards"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "clamp(1.8rem, 3vw, 2.4rem)"; title.style.textAlign = "center"; title.style.color = "#ffa500";
                const lang = window.currentLang || 'en';
                const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                section.appendChild(title); const grid = d.createElement("div"); grid.style.cssText = "display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; margin-top: 20px;";
                section.appendChild(grid); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
                const fallbackScratchPhotos = getRandomFallbackPngs(2);
                let validScratchImages = [];
                const isGeneratedScratch = Boolean(
                    (typeof w !== 'undefined' && w.__IS_GENERATED_PAGE__) ||
                    (typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__)
                );
                if (images && Array.isArray(images) && images.length > 0) {
                    if (isGeneratedScratch) {
                        const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                        validScratchImages = cleaned.length > 0 ? cleaned : [];
                    } else {
                        validScratchImages = images.filter(src => src && typeof src === 'string' && src.trim() !== '');
                    }
                    if (validScratchImages.length === 0 && images.length > 0) {
                        validScratchImages = fallbackScratchPhotos;
                    }
                }

                const hasImages = validScratchImages && validScratchImages.length > 0;
                const getDef = () => {
                    const def = trans.defaultScratchReveal;
                    return typeof def === 'function' ? def(evData.event) : (def || "You're a Star!");
                };
                const contentItems = hasImages ? validScratchImages : [customText || getDef()];
                contentItems.forEach((item, idx) => {
                    const cardDiv = d.createElement("div");
                    cardDiv.className = "magic-scratch-card";
                    cardDiv.style.cssText = "width: clamp(240px, 26vw, 300px); height: clamp(240px, 26vw, 300px); background: #1a1025; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); position: relative; overflow: hidden; transition: width 0.3s, height 0.3s;";
                    const canvas = d.createElement("canvas"); canvas.width = 500; canvas.height = 500; canvas.style.cssText = "width:100%; height:100%; cursor: pointer; display: block; position:absolute; top:0; left:0; z-index:2;";
                    const bgContent = d.createElement("div"); bgContent.style.cssText = "position:absolute; inset:0; z-index:1; display:flex; align-items:center; justify-content:center; background:#1a1025; padding:15px; text-align:center; overflow:hidden;";
                    if (hasImages) {
                        const img = d.createElement("img");
                        img.src = item;
                        img.onerror = () => { img.onerror = null; img.src = fallbackScratchPhotos[idx % fallbackScratchPhotos.length]; };
                        img.style.cssText = "width:100%; height:100%; object-fit:cover; border-radius:10px;";
                        bgContent.appendChild(img);
                    }
                    else { const p = d.createElement("p"); p.innerText = item; p.style.cssText = "color:#fff; font-size:18px; font-weight:bold; font-family:'Poppins', sans-serif;"; bgContent.appendChild(p); }
                    cardDiv.appendChild(bgContent); cardDiv.appendChild(canvas);
                    const audio = d.createElement('audio'); audio.src = '/assets/sounds/scratch.mp3'; audio.preload = 'auto'; audio.loop = true; audio.volume = 0.3; cardDiv.appendChild(audio);
                    const ctx = canvas.getContext("2d", { willReadFrequently: true });
                    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); grad.addColorStop(0, "#ff6ec7"); grad.addColorStop(0.5, "#ff9a44"); grad.addColorStop(1, "#7873f5");
                    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#ffffff20";
                    for (let i = 0; i < 50; i++) { ctx.beginPath(); ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 20, 0, 2 * Math.PI); ctx.fill(); }
                    ctx.fillStyle = "#fff"; ctx.font = "bold 40px Poppins"; ctx.textAlign = "center"; ctx.fillText("SCRATCH ME!", canvas.width / 2, canvas.height / 2 + 15);
                    let scratched = false, drawing = false, lastX = 0, lastY = 0, audioPlaying = false;
                    const scratch = (x, y) => {
                        ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 80; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke(); lastX = x; lastY = y;
                        if (!scratched) {
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let transparent = 0; for (let i = 3; i < imgData.length; i += 4) if (imgData[i] === 0) transparent++;
                            if (transparent / (canvas.width * canvas.height) > 0.6) { scratched = true; audio.pause(); audioPlaying = false; canvas.style.transition = "opacity 0.6s"; canvas.style.opacity = "0"; setTimeout(() => canvas.remove(), 600); }
                        }
                    };
                    const onStart = (e) => {
                        e.preventDefault(); drawing = true; const rect = canvas.getBoundingClientRect(); const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
                        if (e.touches) { lastX = (e.touches[0].clientX - rect.left) * sx; lastY = (e.touches[0].clientY - rect.top) * sy; } else { lastX = (e.clientX - rect.left) * sx; lastY = (e.clientY - rect.top) * sy; }
                        audioPlaying = false;
                    };
                    const onMove = (e) => {
                        if (!drawing || scratched) return; const rect = canvas.getBoundingClientRect(); const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
                        let cx, cy; if (e.touches) { cx = (e.touches[0].clientX - rect.left) * sx; cy = (e.touches[0].clientY - rect.top) * sy; } else { cx = (e.clientX - rect.left) * sx; cy = (e.clientY - rect.top) * sy; }
                        if (!audioPlaying) { audio.play().catch(e => { }); audioPlaying = true; }
                        scratch(cx, cy);
                    };
                    canvas.addEventListener("mousedown", onStart); w.addEventListener("mouseup", () => { drawing = false; audio.pause(); audioPlaying = false; }); canvas.addEventListener("mousemove", onMove);
                    canvas.addEventListener("touchstart", onStart); canvas.addEventListener("touchend", () => { drawing = false; audio.pause(); audioPlaying = false; }); canvas.addEventListener("touchmove", onMove);
                    grid.appendChild(cardDiv);
                }); return {};
            },
            disable(d) { d?.getElementById("magic-scratch-section")?.remove(); }
        },

        memoryTimeline: {
            enable(d, w, userName, customText, images) {
                if (d.getElementById("magic-timeline-section")) return;
                const section = d.createElement("section");
                section.id = "magic-timeline-section";
                section.className = "magic-timeline-section";
                section.style.cssText = "padding: clamp(2rem, 3.5vw, 3rem) 0; background: rgba(0,0,0,0.03); border-radius: clamp(24px, 3vw, 36px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 680px; box-sizing: border-box; align-self: center; overflow: visible; position: relative;";
                const title = d.createElement("h2"); title.innerText = "\uD83D\uDCDC " + (window.currentLang === 'hi' ? "\u092f\u093e\u0926\u094b\u0902 \u0915\u0940 \u091f\u093e\u0907\u092e\u0932\u093e\u0907\u0928" : "Memory Timeline"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "clamp(1.8rem, 3vw, 2.5rem)"; title.style.textAlign = "center"; title.style.color = "#c0a080";
                const lang = window.currentLang || 'en';
                const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                const wrap = d.createElement("div");
                wrap.className = "magic-timeline-wrap";
                wrap.style.cssText = "overflow-x: auto; display: flex; gap: 25px; padding: 25px 20px; width: 100%; box-sizing: border-box; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #7b5df6 rgba(0,0,0,0.1);";
                // Add custom scrollbar styles for webkit browsers
                if (!d.getElementById('magic-timeline-scrollbar-styles')) {
                    const scrollbarStyle = d.createElement('style');
                    scrollbarStyle.id = 'magic-timeline-scrollbar-styles';
                    scrollbarStyle.textContent = `
                    .magic-timeline-wrap::-webkit-scrollbar {
                        height: 12px;
                        display: block !important;
                    }
                    .magic-timeline-wrap::-webkit-scrollbar-track {
                        background: rgba(0,0,0,0.08);
                        border-radius: 10px;
                        margin: 0 20px;
                    }
                    .magic-timeline-wrap::-webkit-scrollbar-thumb {
                        background: linear-gradient(90deg, #7b5df6, #ff7a2f);
                        border-radius: 10px;
                        border: 3px solid rgba(255,255,255,0.8);
                        background-clip: padding-box;
                    }
                    @media (max-width: 640px) {
                        .magic-timeline-section {
                            margin: 2rem 0 !important;
                            border-radius: 0 !important;
                            padding: 2rem 0.5rem !important;
                        }
                        .magic-timeline-wrap {
                            gap: 15px !important;
                            padding: 20px 10px !important;
                        }
                        .magic-timeline-card {
                            min-width: 200px !important;
                            padding: 15px !important;
                        }
                    }
                `;
                    (d.head || d.body)?.appendChild(scrollbarStyle);
                }
                section.appendChild(title); section.appendChild(wrap); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
                const getDef = () => {
                    const def = trans.defaultMemoryTimeline;
                    return typeof def === 'function' ? def(evData.event) : (def || "Memories");
                };
                const milestones = customText ? customText.split(',') : getDef().split(',');
                const fallbackTimelinePhotos = getRandomFallbackPngs(milestones.length || 4);
                milestones.forEach((m, i) => {
                    const card = d.createElement("div");
                    card.className = "magic-timeline-card";
                    card.style.cssText = "min-width: clamp(240px, 24vw, 320px); flex-shrink: 0; background: linear-gradient(145deg,#fffbf0,#ffe0c0); border-radius: 32px; padding: clamp(20px, 2.5vw, 32px); text-align: center; scroll-snap-align: center; color: #5a2e1e; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.05); transition: all 0.3s;";
                    card.innerHTML = `<strong style="font-size:1.3rem; display:block; margin-bottom:8px;">✨ ${escapeHtml(m)} ✨</strong><span style="font-size:0.95rem; opacity:0.8;">❤️ ${escapeHtml(userName)}</span>`;

                    let rawSrc = images?.[i];
                    if (rawSrc && typeof rawSrc === 'string' && rawSrc.startsWith('blob:') && typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__) {
                        rawSrc = fallbackTimelinePhotos[i % fallbackTimelinePhotos.length];
                    }
                    if (rawSrc) {
                        const img = d.createElement("img");
                        img.src = rawSrc;
                        img.onerror = () => { img.onerror = null; img.src = fallbackTimelinePhotos[i % fallbackTimelinePhotos.length]; };
                        img.style.cssText = "width: 100%; height: clamp(160px, 18vw, 220px); object-fit: cover; border-radius: 20px; margin-top: 15px; border: 4px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);";
                        card.appendChild(img);
                    }
                    wrap.appendChild(card);
                }); return {};
            },
            disable(d) { d?.getElementById("magic-timeline-section")?.remove(); }
        },

        heartsOnScroll: {
            enable(d, w, ce) {
                this.disable(d, w);
                const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
                const emoji = (ce && ce.length && isEmoji(ce)) ? Array.from(ce)[0] : "\uD83D\uDC96";
                const c = d.createElement("div"); c.id = "magic-heart-scroll"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483400;";
                d.body.appendChild(c);
                const createHeart = () => {
                    const h = d.createElement("div"); h.innerHTML = emoji; const left = Math.random() * 100; const size = 20 + Math.random() * 18; const duration = 2 + Math.random() * 3;
                    h.style.cssText = `position:absolute; left:${left}%; top:-20px; font-size:${size}px; animation:magicHeartFall ${duration}s linear forwards; transform: rotate(${Math.random() * 20 - 10}deg);`;
                    c.appendChild(h); setTimeout(() => h.remove(), duration * 1000);
                };
                const startRain = () => { for (let i = 0; i < 25; i++) setTimeout(createHeart, i * 80); };
                let scrollTimeout; const fn = () => { if (scrollTimeout) clearTimeout(scrollTimeout); scrollTimeout = setTimeout(startRain, 50); };
                (w || window).addEventListener("scroll", fn, { passive: true });
                c._scrollHandler = fn;
                if (!d.querySelector("#magic-heart-style")) { const s = d.createElement("style"); s.id = "magic-heart-style"; s.textContent = `@keyframes magicHeartFall{to{transform:translateY(110vh) rotate(25deg); opacity:0;}}`; d.head.appendChild(s); }
                return {
                    listeners: [{ target: (w || window), type: "scroll", handler: fn }],
                    cleanup: () => (w || window).removeEventListener("scroll", fn)
                };
            },
            disable(d, w) {
                const el = d?.getElementById("magic-heart-scroll");
                if (el && el._scrollHandler) (w || window).removeEventListener("scroll", el._scrollHandler);
                el?.remove();
            }
        },

        oldPaperLetter: {
            enable(d, w, userName, customText) {
                if (d.getElementById("magic-old-letter-envelope")) return;
                let used = false;
                const audio = d.createElement('audio');
                audio.id = 'letterClickAudio';
                audio.src = '/assets/sounds/letter-click.mp3';
                audio.preload = 'auto';
                audio.style.display = 'none';
                d.body.appendChild(audio);

                const env = d.createElement("div");
                env.id = "magic-old-letter-envelope";
                env.innerHTML = "\u2709\uFE0F";
                env.style.cssText = "position:fixed; bottom:25px; left:25px; font-size:55px; cursor:pointer; z-index:1000; background:#fff; border-radius:50%; width:75px; height:75px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(0,0,0,0.4); transition:0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid #ffd700; opacity:0; visibility:hidden; pointer-events:none;";
                env.onmouseenter = () => env.style.transform = "scale(1.15) rotate(5deg)";
                env.onmouseleave = () => env.style.transform = "scale(1)";

                const showEnvelope = () => {
                    if (!d || !d.body) return;
                    if (!d.getElementById("magic-old-letter-envelope")) {
                        d.body.appendChild(env);
                    }
                    env.style.opacity = "1";
                    env.style.visibility = "visible";
                    env.style.pointerEvents = "auto";
                };

                // Check if curtains or lock or countdown overlays are currently blocking
                const curtain = d.getElementById("magic-curtain-reveal-root");
                const lock = d.getElementById("lock-overlay");
                const countdown = d.getElementById("magic-countdown-overlay");
                const welcome = d.getElementById("magic-welcome-typing-root");

                const isCurtainBlocking = curtain && !curtain._isOpening && !curtain.classList.contains('open') && curtain.style.display !== 'none';
                const isLockBlocking = !!lock;
                const isCountdownBlocking = !!countdown;

                if (isCurtainBlocking || isLockBlocking || isCountdownBlocking) {
                    // Append in hidden state
                    d.body.appendChild(env);

                    const onStageProgress = () => {
                        const cur = d.getElementById("magic-curtain-reveal-root");
                        const lk = d.getElementById("lock-overlay");
                        const cd = d.getElementById("magic-countdown-overlay");
                        if ((cur && !cur._isOpening && !cur.classList.contains('open') && cur.style.display !== 'none') || lk || cd) {
                            return; // still blocked
                        }
                        window.oldPaperLetterTimeout = setTimeout(showEnvelope, 1500);
                    };

                    if (w && typeof w.addEventListener === 'function') {
                        w.addEventListener('curtainOpened', onStageProgress);
                        w.addEventListener('lockUnlocked', onStageProgress);
                        w.addEventListener('countdownFinished', onStageProgress);
                    }
                    if (d && typeof d.addEventListener === 'function') {
                        d.addEventListener('curtainOpened', onStageProgress);
                        d.addEventListener('lockUnlocked', onStageProgress);
                        d.addEventListener('countdownFinished', onStageProgress);
                    }
                } else if (welcome) {
                    d.body.appendChild(env);
                    const onWelcomeDone = () => {
                        window.oldPaperLetterTimeout = setTimeout(showEnvelope, 1000);
                    };
                    if (w && typeof w.addEventListener === 'function') w.addEventListener('welcomeTypingFinished', onWelcomeDone);
                    if (d && typeof d.addEventListener === 'function') d.addEventListener('welcomeTypingFinished', onWelcomeDone);
                    window.oldPaperLetterTimeout = setTimeout(showEnvelope, 3500);
                } else {
                    // No blocking overlay, show immediately
                    showEnvelope();
                }
                const modal = d.createElement("div"); modal.id = "magic-letter-modal"; modal.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:2147484100; display:flex; align-items:center; justify-content:center; visibility:hidden; opacity:0; transition:0.4s; padding:20px;";
                const card = d.createElement("div");
                card.className = "magic-letter-card";
                card.style.cssText = "background: #fdf5e6; background-image: radial-gradient(#eadcb8 1px, transparent 0); background-size: 20px 20px; border-radius:15px; padding:45px; max-width:500px; width:100%; text-align:center; font-family:'Great Vibes',cursive; font-size:1.8rem; box-shadow:0 30px 60px rgba(0,0,0,0.6); border:8px double #d2b48c; color: #5d4037; position:relative; transform:translateY(30px); transition:transform 0.5s;";
                const lang = window.currentLang || 'en';
                const trans = window.translations?.[lang] || {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                let msgText = customText;
                if (!msgText) {
                    const def = trans.defaultOldPaperLetter;
                    msgText = typeof def === 'function' ? def(userName, evData.event) : (def || "With love");
                }
                card.innerHTML = `<div style="position:absolute; top:10px; right:15px; font-size:3rem; opacity:0.1; pointer-events:none;">\uD83D\uDD8B\uFE0F</div><p style="line-height:1.6; margin-bottom:25px; text-shadow: 1px 1px 0 rgba(255,255,255,0.5);">${msgText.replace(/\n/g, '<br>')}</p><button style="background:linear-gradient(to bottom, #8b4513, #5d2e0a); color:white; border:none; padding:12px 35px; border-radius:50px; cursor:pointer; font-family:'Poppins', sans-serif; font-size:1rem; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.3); transition:0.2s;">Close Letter</button>`;
                modal.appendChild(card); d.body.appendChild(modal);
                env.onclick = () => { audio.currentTime = 0; audio.play().catch(e => console.log(e)); modal.style.visibility = "visible"; modal.style.opacity = "1"; card.style.transform = "translateY(0)"; };
                const close = () => { modal.style.opacity = "0"; card.style.transform = "translateY(30px)"; setTimeout(() => { modal.style.visibility = "hidden"; if (!used) { used = true; env.remove(); audio.remove(); } }, 400); };
                card.querySelector("button").onclick = close; modal.onclick = (e) => { if (e.target === modal) close(); };
                return { listeners: [{ target: env, type: "click", handler: env.onclick }] };
            },
            disable(d) {
                d?.getElementById("magic-old-letter-envelope")?.remove();
                d?.getElementById("magic-letter-modal")?.remove();
                const audio = d?.getElementById("letterClickAudio");
                if (audio) audio.remove();
                // Clear any pending timeouts for showing the envelope
                if (window.oldPaperLetterTimeout) {
                    clearTimeout(window.oldPaperLetterTimeout);
                    window.oldPaperLetterTimeout = null;
                }
            }
        },

        hugSkyLetter: {
            enable(d, w, userName, customText) {
                if (d.getElementById("magic-hug-section")) return;
                const lang = window.currentLang || 'en';
                const trans = window.translations?.[lang] || {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                const section = d.createElement("section"); section.id = "magic-hug-section"; section.style.cssText = "padding: clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px); text-align: center; background: linear-gradient(145deg, rgba(255,182,193,0.15), rgba(255,105,180,0.08)); border-radius: clamp(20px, 2.5vw, 32px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; max-width: 560px; width: 92%; box-sizing: border-box; align-self: center;";
                const title = d.createElement("h2"); title.innerText = "\uD83E\uDD17 " + (typeof trans.hugTitle === 'function' ? trans.hugTitle(evData.event) : "Hug + Sky Letter"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "clamp(1.8rem, 3vw, 2.4rem)"; title.style.color = "#ff69b4";
                section.appendChild(title); const container = d.createElement("div"); container.style.cssText = "position: relative; min-height: 320px; margin: 25px 0; background: rgba(255,255,255,0.05); border-radius:30px;";
                const av1 = d.createElement("div");
                av1.className = "magic-hug-avatar";
                av1.innerText = "\uD83D\uDE0A"; av1.style.cssText = "position: absolute; left: 15%; bottom: 15%; font-size: 80px; transition: transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); filter: drop-shadow(0 5px 15px rgba(0,0,0,0.2));";
                container.appendChild(av1);
                const av2 = d.createElement("div");
                av2.className = "magic-hug-avatar";
                av2.innerText = "\uD83C\uDF82"; av2.style.cssText = "position: absolute; right: 15%; bottom: 15%; font-size: 80px; transition: transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); filter: drop-shadow(0 5px 15px rgba(0,0,0,0.2));";
                container.appendChild(av2); section.appendChild(container);
                const btn = d.createElement("button"); btn.innerText = "\u2709\uFE0F Open Sky Letter"; btn.style.cssText = "background: linear-gradient(135deg, #ff69b4, #ff1493); color:white; border:none; padding:14px 32px; border-radius:60px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow: 0 10px 20px rgba(255,20,147,0.3); transition:0.3s;";
                btn.onmouseenter = () => btn.style.transform = "translateY(-3px)"; btn.onmouseleave = () => btn.style.transform = "translateY(0)";
                section.appendChild(btn); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
                setTimeout(() => { av1.style.transform = "translateX(calc(35%))"; av2.style.transform = "translateX(calc(-35%))"; }, 300);
                setTimeout(() => {
                    const h = d.createElement("div"); h.innerHTML = "\uD83D\uDC96"; h.className = "magic-emoji"; h.style.cssText = "position: absolute; left: 50%; top: 35%; font-size: 60px; transform: translateX(-50%); z-index: 2;";
                    container.appendChild(h); if (window.canvasConfetti) window.canvasConfetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                }, 1500);
                const can = d.createElement("canvas"); can.style.cssText = "position: absolute; inset: 0; pointer-events: none; z-index: 1;"; can.width = container.clientWidth || 400; can.height = 320;
                container.appendChild(can); const ctx = can.getContext("2d"); let parts = []; for (let i = 0; i < 60; i++) parts.push({ x: Math.random() * can.width, y: Math.random() * can.height, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1 + 0.5, life: 1, color: `hsl(${Math.random() * 30 + 330},100%,70%)`, size: 2 + Math.random() * 2 });
                const anim = () => { if (!can.isConnected) return; ctx.clearRect(0, 0, can.width, can.height); parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.004; if (p.life > 0) { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI); ctx.fill(); } else { p.life = 1; p.y = -10; p.x = Math.random() * can.width; } }); requestAnimationFrame(anim); };
                anim(); btn.onclick = () => {
                    let m = customText;
                    if (!m) {
                        const def = trans.defaultHugSkyLetter;
                        m = typeof def === 'function' ? def(userName, evData.event) : (def || "Love you!");
                    }
                    // Create sky emoji overlay with text
                    const skyOverlay = d.createElement("div");
                    skyOverlay.style.cssText = "position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; animation: skyFadeIn 1s ease-out;";
                    skyOverlay.innerHTML = `
                    <div style="font-size: 300px; text-align: center; filter: brightness(0) invert(1); overflow: hidden;">
                        &#9729;
                    </div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #0000ff; font-size: 20px; font-weight: bold; font-family: 'Great Vibes', cursive; max-width: 200px; word-wrap: break-word; text-align: center; overflow: hidden; z-index: 1;">
                        ${escapeHtml(m)}
                    </div>
                `;
                    d.body.appendChild(skyOverlay);
                    const outStyle = d.createElement("style");
                    outStyle.textContent = "@keyframes skyFadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } } @keyframes skyFadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }";
                    (d.head || d.body)?.appendChild(outStyle);
                    setTimeout(() => { skyOverlay.style.animation = "skyFadeOut 1s ease-in forwards"; setTimeout(() => skyOverlay.remove(), 1000); }, 5000);
                };
                return { listeners: [{ target: btn, type: "click", handler: btn.onclick }] };
            },
            disable(d) { d?.getElementById("magic-hug-section")?.remove(); }
        },

        instantCamera: {
            enable(d, w, userName, customText, images) {
                this.disable(d);
                if (d.getElementById("magic-instant-camera-section")) return;

                const lang = (typeof window !== 'undefined' && window.currentLang) || 'en';
                const isHi = (lang === 'hi');

                // Clean & prepare images list
                let photoList = [];
                const isGeneratedPage = Boolean(
                    (typeof w !== 'undefined' && w.__IS_GENERATED_PAGE__) ||
                    (typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__)
                );

                if (images && Array.isArray(images) && images.length > 0) {
                    if (isGeneratedPage) {
                        const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                        photoList = cleaned.length > 0 ? cleaned : [];
                    } else {
                        photoList = images.filter(src => src && typeof src === 'string' && src.trim() !== '');
                    }
                }
                if (photoList.length === 0) {
                    photoList = getRandomFallbackPngs(4);
                }

                // Inject Styles
                let styleEl = d.getElementById('magic-camera-styles');
                if (!styleEl) {
                    styleEl = d.createElement('style');
                    styleEl.id = 'magic-camera-styles';
                    styleEl.textContent = `
                        @keyframes cameraFlashAnim {
                            0% { opacity: 0.95; }
                            100% { opacity: 0; }
                        }
                        @keyframes cameraRecoil {
                            0% { transform: scale(1) translateY(0) rotate(0deg); }
                            18% { transform: scale(0.92) translateY(8px) rotate(-1.5deg); }
                            45% { transform: scale(1.04) translateY(-5px) rotate(1.2deg); }
                            75% { transform: scale(0.98) translateY(2px) rotate(-0.5deg); }
                            100% { transform: scale(1) translateY(0) rotate(0deg); }
                        }
                        @keyframes polaroidEjectAnim {
                            0% {
                                opacity: 0;
                                transform: translateY(-135px) scale(0.48) rotateX(34deg) rotate(calc(var(--base-rot, 0deg) * 1.8));
                                filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1)) blur(2px);
                            }
                            35% {
                                opacity: 1;
                                transform: translateY(-40px) scale(0.85) rotateX(15deg) rotate(var(--base-rot, 0deg));
                                filter: drop-shadow(0 8px 18px rgba(0,0,0,0.12)) blur(0px);
                            }
                            70% {
                                transform: translateY(14px) scale(1.05) rotate(calc(var(--base-rot, 0deg) - 1.5deg));
                            }
                            88% {
                                transform: translateY(-4px) scale(0.99) rotate(calc(var(--base-rot, 0deg) + 0.5deg));
                            }
                            100% {
                                opacity: 1;
                                transform: translateY(0) scale(1) rotate(var(--base-rot, 0deg));
                                filter: drop-shadow(0 16px 32px rgba(0,0,0,0.16));
                            }
                        }
                        @keyframes polaroidDevelopAnim {
                            0% {
                                filter: brightness(2.1) contrast(0.35) saturate(0.1) sepia(0.35) blur(3.5px);
                                opacity: 0.65;
                            }
                            35% {
                                filter: brightness(1.55) contrast(0.65) saturate(0.55) sepia(0.2) blur(1.8px);
                                opacity: 0.88;
                            }
                            72% {
                                filter: brightness(1.15) contrast(0.9) saturate(0.85) sepia(0.05) blur(0.4px);
                                opacity: 0.98;
                            }
                            100% {
                                filter: brightness(1) contrast(1) saturate(1) sepia(0) blur(0px);
                                opacity: 1;
                            }
                        }
                        @keyframes photoShimmer {
                            0% { transform: translateX(-150%) skewX(-25deg); opacity: 0; }
                            25% { opacity: 0.85; }
                            100% { transform: translateX(250%) skewX(-25deg); opacity: 0; }
                        }
                        @keyframes polaroidShakeAnim {
                            0%, 100% { transform: rotate(var(--base-rot, 0deg)) scale(1); }
                            20% { transform: rotate(calc(var(--base-rot, 0deg) - 5deg)) scale(1.05); }
                            40% { transform: rotate(calc(var(--base-rot, 0deg) + 6deg)) scale(1.07); }
                            60% { transform: rotate(calc(var(--base-rot, 0deg) - 4deg)) scale(1.04); }
                            80% { transform: rotate(calc(var(--base-rot, 0deg) + 3deg)) scale(1.02); }
                        }
                        @keyframes cameraHeroFloat {
                            0%, 100% { transform: translateY(0) rotate(0deg); }
                            50% { transform: translateY(-7px) rotate(0.8deg); }
                        }
                        @keyframes cameraSnapPulse {
                            0%, 100% { transform: translateX(-50%) scale(1); box-shadow: 0 6px 20px rgba(235, 75, 110, 0.45); }
                            50% { transform: translateX(-50%) scale(1.05); box-shadow: 0 10px 28px rgba(235, 75, 110, 0.65); }
                        }
                        .magic-polaroid-item {
                            transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1), box-shadow 0.3s ease;
                        }
                        .magic-polaroid-item:hover {
                            transform: translateY(-8px) scale(1.03) rotate(0deg) !important;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.22) !important;
                            z-index: 15 !important;
                        }
                        .camera-hero-wrapper:hover .magic-camera-main-img {
                            transform: translateY(-4px) scale(1.02) !important;
                            filter: drop-shadow(0 24px 38px rgba(120, 40, 160, 0.42)) drop-shadow(0 8px 16px rgba(235, 75, 110, 0.32)) !important;
                        }
                        .camera-hero-wrapper:active .magic-camera-main-img {
                            transform: scale(0.93) translateY(4px) !important;
                        }
                    `;
                    (d.head || d.body)?.appendChild(styleEl);
                }

                // Web Audio Shutter Sound Synthesizer
                function playShutterAudio() {
                    try {
                        const AudioCtx = window.AudioContext || window.webkitAudioContext;
                        if (!AudioCtx) return;
                        const ctx = new AudioCtx();
                        if (ctx.state === 'suspended') ctx.resume();

                        // Shutter click transient
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(550, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.05);
                        gain.gain.setValueAtTime(0.7, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.07);

                        // Metallic noise burst
                        const bufferSize = Math.floor(ctx.sampleRate * 0.06);
                        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                        const noise = ctx.createBufferSource();
                        noise.buffer = buffer;
                        const noiseGain = ctx.createGain();
                        noiseGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.03);
                        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
                        noise.connect(noiseGain);
                        noiseGain.connect(ctx.destination);
                        noise.start(ctx.currentTime + 0.03);

                        // Film motor whirrr
                        const motor = ctx.createOscillator();
                        const motorGain = ctx.createGain();
                        motor.type = 'sawtooth';
                        motor.frequency.setValueAtTime(240, ctx.currentTime + 0.1);
                        motor.frequency.linearRampToValueAtTime(360, ctx.currentTime + 0.4);
                        motorGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
                        motorGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
                        motor.connect(motorGain);
                        motorGain.connect(ctx.destination);
                        motor.start(ctx.currentTime + 0.1);
                        motor.stop(ctx.currentTime + 0.48);
                    } catch (e) {
                        console.warn('Camera audio note:', e);
                    }
                }

                // Create Main Section
                const section = d.createElement("section");
                section.id = "magic-instant-camera-section";
                section.style.cssText = "width: 92%; max-width: 640px; margin: 40px auto 55px auto; padding: clamp(26px, 3.5vw, 36px) clamp(16px, 2.5vw, 24px); border-radius: 36px; background: linear-gradient(155deg, rgba(255,250,245,0.96) 0%, rgba(255,240,245,0.94) 100%); border: 1.5px solid rgba(255,182,193,0.45); box-shadow: 0 16px 45px rgba(220,120,150,0.12); box-sizing: border-box; text-align: center; position: relative; overflow: visible; clear: both;";

                // Flash Overlay
                let flashOverlay = d.getElementById('magic-camera-flash');
                if (!flashOverlay) {
                    flashOverlay = d.createElement("div");
                    flashOverlay.id = "magic-camera-flash";
                    flashOverlay.style.cssText = "position: fixed; inset: 0; background: radial-gradient(circle, #ffffff 40%, rgba(255,255,255,0.85) 100%); pointer-events: none; z-index: 99999; opacity: 0; display: none;";
                    d.body.appendChild(flashOverlay);
                }

                // Section Header
                const badge = d.createElement("div");
                badge.style.cssText = "display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 20px; background: rgba(235,75,110,0.1); color: #eb4b6e; font-size: 0.78rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;";
                badge.innerHTML = `<span>📸</span> <span>${isHi ? 'इंस्टेंट यादें' : 'INSTANT MEMORIES'}</span>`;
                section.appendChild(badge);

                const title = d.createElement("h2");
                title.style.cssText = "font-family: 'Great Vibes', cursive; font-size: clamp(2.2rem, 5vw, 2.9rem); color: #b83358; margin: 4px 0 6px 0; text-shadow: 0 2px 10px rgba(184,51,88,0.15); line-height: 1.2;";
                title.innerText = isHi ? "जादुई कैमरा स्नैपशॉट" : "Magic Camera Snapshot";
                section.appendChild(title);

                const subtitle = d.createElement("p");
                subtitle.style.cssText = "font-size: 0.92rem; color: #7a505b; margin: 0 0 22px 0; opacity: 0.9;";
                subtitle.innerText = isHi ? "कैमरे के शटर बटन पर क्लिक करें और अपनी फोटो निकालें! 🎞️" : "Tap the shutter button to snap & print instant Polaroid memories! 🎞️";
                section.appendChild(subtitle);

                // CAMERA HERO CONTAINER (Beautiful 3D Image Centerpiece)
                const cameraHero = d.createElement("div");
                cameraHero.className = "camera-hero-wrapper";
                cameraHero.style.cssText = "position: relative; width: min(240px, 72vw); margin: 10px auto 34px auto; cursor: pointer; user-select: none; animation: cameraHeroFloat 3.8s ease-in-out infinite; transition: transform 0.2s ease;";

                const cameraImg = d.createElement("img");
                cameraImg.src = "/assets/media/cam.png";
                cameraImg.alt = "Instant Camera";
                cameraImg.className = "magic-camera-main-img";
                cameraImg.style.cssText = "width: 100%; height: auto; display: block; filter: drop-shadow(0 18px 32px rgba(120, 40, 160, 0.32)) drop-shadow(0 6px 14px rgba(235, 75, 110, 0.22)); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease; pointer-events: none;";
                cameraHero.appendChild(cameraImg);

                // Floating Glowing Snap Pill Badge (positioned below camera so TheGreeter text is completely clear)
                const snapBadge = d.createElement("div");
                snapBadge.className = "camera-snap-badge";
                snapBadge.style.cssText = "position: absolute; bottom: -28px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #ff4b72 0%, #e0244d 100%); color: #ffffff; padding: 7px 18px; border-radius: 24px; font-weight: 800; font-size: 0.84rem; letter-spacing: 0.5px; box-shadow: 0 8px 22px rgba(224,36,77,0.45); display: flex; align-items: center; gap: 6px; white-space: nowrap; pointer-events: none; border: 2.5px solid #ffffff; animation: cameraSnapPulse 2.4s ease-in-out infinite;";
                snapBadge.innerHTML = `<span>📸</span> <span>${isHi ? 'क्लिक करके फोटो निकालें' : 'Tap to Snap!'}</span>`;
                cameraHero.appendChild(snapBadge);

                // Counter Banner under camera
                const counterBanner = d.createElement("div");
                counterBanner.style.cssText = "font-size: 0.82rem; font-weight: 700; color: #b84568; margin-top: 26px; display: flex; align-items: center; justify-content: center; gap: 6px;";
                counterBanner.innerHTML = `<span>🎞️</span> <span id="cameraRollCounter">${isHi ? `फोटो 0/${photoList.length} (क्लिक करके देखें)` : `0 of ${photoList.length} photos snapped`}</span>`;

                section.appendChild(cameraHero);
                section.appendChild(counterBanner);

                // EJECTED GALLERY CONTAINER
                const gallery = d.createElement("div");
                gallery.id = "magic-camera-gallery";
                gallery.style.cssText = "display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 10px; padding: 10px 4px; min-height: 40px;";
                section.appendChild(gallery);

                insertSectionBeforeFinal(d, section);
                scrollToElement(d, section);

                // LIGHTBOX POPUP FOR TAP-TO-ZOOM
                let lightbox = d.getElementById('magic-camera-lightbox');
                if (!lightbox) {
                    lightbox = d.createElement("div");
                    lightbox.id = "magic-camera-lightbox";
                    lightbox.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.82); z-index: 100000; display: none; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; backdrop-filter: blur(6px); cursor: pointer;";
                    lightbox.innerHTML = `
                        <div id="magic-lightbox-card" style="max-width: 90vw; max-height: 85vh; background: #ffffff; padding: 14px 14px 20px 14px; border-radius: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); text-align: center; position: relative; cursor: default;">
                            <img id="magic-lightbox-img" src="" style="max-width: 100%; max-height: 72vh; object-fit: contain; border-radius: 6px; display: block; background: #f8f8f8;" />
                            <button style="position: absolute; top: -14px; right: -14px; width: 34px; height: 34px; border-radius: 50%; background: #eb4b6e; color: #fff; border: 2px solid #fff; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">×</button>
                        </div>
                    `;
                    lightbox.onclick = (e) => {
                        if (e.target === lightbox || e.target.tagName === 'BUTTON') {
                            lightbox.style.display = 'none';
                        }
                    };
                    d.body.appendChild(lightbox);
                }

                // Snap photo interaction logic
                let currentSnapIdx = 0;

                function snapPhoto() {
                    if (currentSnapIdx >= photoList.length) {
                        currentSnapIdx = 0;
                        gallery.innerHTML = '';
                    }

                    // 1. Play Shutter Audio & Camera Mechanical Recoil Kick
                    playShutterAudio();
                    if (cameraHero) {
                        cameraHero.style.animation = "cameraRecoil 0.48s cubic-bezier(0.34, 1.56, 0.64, 1)";
                        setTimeout(() => {
                            cameraHero.style.animation = "cameraHeroFloat 3.8s ease-in-out infinite";
                        }, 500);
                    }

                    // 2. Flash animation & Lens Burst
                    if (flashOverlay) {
                        flashOverlay.style.display = "block";
                        flashOverlay.style.animation = "none";
                        void flashOverlay.offsetWidth;
                        flashOverlay.style.animation = "cameraFlashAnim 0.35s ease-out forwards";
                        setTimeout(() => { flashOverlay.style.display = "none"; }, 360);
                    }

                    // 3. Button printing micro-state feedback
                    if (snapBadge) {
                        snapBadge.innerHTML = `<span>🎞️</span> <span>${isHi ? 'फोटो प्रिंट हो रही है...' : 'Printing photo...'}</span>`;
                        setTimeout(() => {
                            snapBadge.innerHTML = `<span>📸</span> <span>${isHi ? 'क्लिक करके फोटो निकालें' : 'Tap to Snap!'}</span>`;
                        }, 920);
                    }

                    // 4. Sparkle/Confetti Ejection Burst from Camera
                    if (typeof ensureConfetti === 'function' && cameraHero) {
                        ensureConfetti(cfn => {
                            const rect = cameraHero.getBoundingClientRect();
                            const x = (rect.left + rect.width / 2) / window.innerWidth;
                            const y = (rect.top + rect.height * 0.72) / window.innerHeight;
                            cfn({
                                particleCount: 22,
                                spread: 65,
                                startVelocity: 26,
                                origin: { x, y },
                                colors: ['#ff4b72', '#ff8da1', '#ffd700', '#7b5df6', '#00f2fe', '#ffffff'],
                                scalar: 0.85,
                                ticks: 100
                            });
                        });
                    }

                    // 5. Pick photo
                    const photoSrc = photoList[currentSnapIdx];
                    currentSnapIdx++;

                    // 6. Create Polaroid Card
                    const polaroid = d.createElement("div");
                    polaroid.className = "magic-polaroid-item";
                    const randomRot = Math.round(Math.random() * 8 - 4);
                    polaroid.style.setProperty('--base-rot', `${randomRot}deg`);
                    polaroid.style.cssText = `
                        width: clamp(200px, 42vw, 240px);
                        background: #ffffff;
                        padding: 10px 10px 14px 10px;
                        border-radius: 12px;
                        box-shadow: 0 16px 36px rgba(0,0,0,0.16), 0 4px 10px rgba(0,0,0,0.06);
                        border: 1px solid rgba(0,0,0,0.06);
                        transform: rotate(${randomRot}deg);
                        cursor: pointer;
                        box-sizing: border-box;
                        animation: polaroidEjectAnim 0.95s cubic-bezier(0.22, 1, 0.36, 1) both;
                        position: relative;
                        user-select: none;
                        perspective: 1000px;
                    `;

                    // Inner Frame Container for Image + Glare Sheen
                    const frameWrap = d.createElement("div");
                    frameWrap.style.cssText = "position: relative; width: 100%; height: clamp(170px, 36vw, 210px); border-radius: 6px; overflow: hidden; background: #faf8f5;";

                    // Developing Image inside Polaroid
                    const img = d.createElement("img");
                    img.src = photoSrc;
                    img.alt = "Memory Snapshot";
                    img.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block; animation: polaroidDevelopAnim 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;";
                    img.onerror = () => { img.onerror = null; img.src = getRandomFallbackPngs(1)[0] || '/assets/media/1000009474.png'; };
                    frameWrap.appendChild(img);

                    // Glossy Photo Glare Sweep
                    const gloss = d.createElement("div");
                    gloss.style.cssText = "position: absolute; inset: 0; pointer-events: none; overflow: hidden;";
                    gloss.innerHTML = '<div style="position: absolute; top: 0; left: 0; width: 60%; height: 100%; background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.72) 50%, transparent 100%); animation: photoShimmer 1.8s cubic-bezier(0.25, 1, 0.5, 1) 0.35s both;"></div>';
                    frameWrap.appendChild(gloss);

                    polaroid.appendChild(frameWrap);

                    // Bottom Polaroid Caption Stamp
                    const caption = d.createElement("div");
                    caption.style.cssText = "margin-top: 9px; display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #7a505b; font-weight: 700; letter-spacing: 0.4px; padding: 0 4px;";
                    caption.innerHTML = `<span>🎞️ #${currentSnapIdx}</span><span style="font-size: 0.82rem; color: #ff4b72;">💖</span>`;
                    polaroid.appendChild(caption);

                    // Interactive Tap-to-Shake & Lightbox Zoom
                    polaroid.onclick = (e) => {
                        e.stopPropagation();
                        polaroid.style.animation = "none";
                        void polaroid.offsetWidth;
                        polaroid.style.animation = "polaroidShakeAnim 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) both";

                        if (typeof ensureConfetti === 'function') {
                            ensureConfetti(cfn => {
                                const rect = polaroid.getBoundingClientRect();
                                const x = (rect.left + rect.width / 2) / window.innerWidth;
                                const y = (rect.top + rect.height / 2) / window.innerHeight;
                                cfn({
                                    particleCount: 18,
                                    spread: 55,
                                    origin: { x, y },
                                    colors: ['#ff4b72', '#ffd700', '#ff8da1', '#ffffff']
                                });
                            });
                        }

                        const lbImg = d.getElementById('magic-lightbox-img');
                        if (lbImg) {
                            lbImg.src = img.src;
                            lightbox.style.display = "flex";
                        }
                    };

                    gallery.prepend(polaroid);

                    // Update counter
                    const counterEl = d.getElementById('cameraRollCounter');
                    if (counterEl) {
                        if (currentSnapIdx >= photoList.length) {
                            counterEl.innerHTML = isHi ? `🎉 सभी ${photoList.length} फोटो तैयार! फिर से स्नैप करें 🔄` : `🎉 All ${photoList.length} Snapped! Tap to reload 🔄`;
                        } else {
                            counterEl.innerHTML = isHi ? `फोटो ${currentSnapIdx}/${photoList.length} तैयार` : `Photo ${currentSnapIdx} of ${photoList.length} snapped`;
                        }
                    }
                }

                cameraHero.onclick = snapPhoto;

                return {
                    listeners: [{ target: cameraHero, type: "click", handler: snapPhoto }]
                };
            },
            disable(d) {
                d?.getElementById("magic-instant-camera-section")?.remove();
                d?.getElementById("magic-camera-flash")?.remove();
                d?.getElementById("magic-camera-styles")?.remove();
                d?.getElementById("magic-camera-lightbox")?.remove();
            }
        },

        floatingPolaroids: {
            enable(d, w, userName, customText, images) {
                this.disable(d);
                if (d.getElementById("magic-polaroids-section")) return;
                const lang = window.currentLang || 'en';
                const trans = window.translations?.[lang] || {};
                const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
                const section = d.createElement("section");
                section.id = "magic-polaroids-section";
                section.style.cssText = "padding: clamp(2.5rem, 4vw, 3.5rem) 1rem; position: relative; background: linear-gradient(145deg, rgba(255,215,0,0.05), rgba(255,100,0,0.03)); border-radius: clamp(24px, 3vw, 36px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 680px; box-sizing: border-box; align-self: center; overflow: hidden; min-height: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.1);";

                const title = d.createElement("h2");
                title.innerText = "📷 " + (typeof trans.polaroidTitle === 'function' ? trans.polaroidTitle(evData.event) : "Floating Memories");
                title.style.fontFamily = "'Great Vibes', cursive";
                title.style.fontSize = "clamp(1.8rem, 3vw, 2.5rem)";
                title.style.textAlign = "center";
                title.style.color = "#c0a080";
                section.appendChild(title);

                const canvas = d.createElement("div");
                canvas.id = "magic-polaroids-canvas";
                canvas.style.cssText = "position: absolute; inset: 0; pointer-events: none; overflow: hidden;";
                section.appendChild(canvas);

                insertSectionBeforeFinal(d, section);
                scrollToElement(d, section);

                const fallbackPhotos = getRandomFallbackPngs(4);

                // Robust filtering: strip dead/local blob: URLs on shared devices to avoid broken images
                let validImgs = [];
                const isGeneratedPolaroids = Boolean(
                    (typeof w !== 'undefined' && w.__IS_GENERATED_PAGE__) ||
                    (typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__)
                );
                if (images && Array.isArray(images) && images.length > 0) {
                    if (isGeneratedPolaroids) {
                        const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                        validImgs = cleaned.length > 0 ? cleaned : [];
                    } else {
                        validImgs = images.filter(src => src && typeof src === 'string' && src.trim() !== '');
                    }
                }
                if (validImgs.length === 0) {
                    validImgs = fallbackPhotos;
                }

                if (!d.querySelector("#magic-polaroid-style")) {
                    const s = d.createElement("style");
                    s.id = "magic-polaroid-style";
                    s.textContent = `
                    @keyframes magicPolaroidFloat {
                        0% { opacity: 0; transform: translateY(0) rotate(var(--rot, 0deg)); }
                        8% { opacity: 1; }
                        92% { opacity: 1; }
                        100% { transform: translateY(-700px) rotate(var(--rot, 0deg)); opacity: 0; }
                    }
                    .magic-polaroid-card {
                        transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease !important;
                    }
                    .magic-polaroid-card:hover {
                        transform: scale(1.08) rotate(0deg) !important;
                        z-index: 100 !important;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.35) !important;
                    }
                `;
                    (d.head || d.body)?.appendChild(s);
                }

                let photoIdx = 0;
                const spawnCard = (initialBottomPercent = null) => {
                    if (!section.isConnected) return;
                    const p = d.createElement("div");
                    p.className = "magic-polaroid-card";
                    const src = validImgs[photoIdx % validImgs.length];
                    photoIdx++;

                    const leftPos = Math.random() * 65 + 8; // 8% to 73%
                    const rot = Math.round(Math.random() * 18 - 9); // -9deg to +9deg
                    const duration = 10 + Math.random() * 4; // 10s to 14s

                    p.style.setProperty('--rot', `${rot}deg`);
                    p.style.cssText = `
                    position: absolute;
                    left: ${leftPos}%;
                    bottom: ${initialBottomPercent !== null ? initialBottomPercent + '%' : '-30px'};
                    width: clamp(140px, 15vw, 175px);
                    background: #ffffff;
                    padding: 8px 8px 26px 8px;
                    box-shadow: 0 16px 36px rgba(0,0,0,0.22);
                    border: 1px solid rgba(0,0,0,0.08);
                    border-radius: 4px;
                    pointer-events: auto;
                    cursor: pointer;
                    animation: magicPolaroidFloat ${duration}s linear forwards;
                    z-index: 10;
                `;

                    const fallbackSrc = fallbackPhotos[photoIdx % fallbackPhotos.length];
                    p.innerHTML = `
                    <img src="${src}" alt="Memory" style="width:100%; height:clamp(115px, 12vw, 140px); object-fit:cover; display:block; border-radius:2px; background:#f4f0ec;" loading="lazy" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                    <div style="font-family:'Caveat',cursive; text-align:center; margin-top:8px; font-size:clamp(0.95rem, 1.3vw, 1.18rem); color:#444; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:bold;">✨ ${customText || userName} ✨</div>
                `;

                    canvas.appendChild(p);
                    setTimeout(() => { if (p.parentNode) p.remove(); }, duration * 1000 + 500);
                };

                // Spawn 3 INITIAL photos immediately at visible staggered heights so user sees them instantly
                setTimeout(() => spawnCard(15), 100);
                setTimeout(() => spawnCard(45), 500);
                setTimeout(() => spawnCard(70), 1000);

                // Regular continuous interval (every 2.8s)
                const iv = setInterval(() => spawnCard(null), 2800);
                canvas._polaroidInterval = iv;
                section._polaroidInterval = iv;

                return { intervals: [iv] };
            },
            disable(d) {
                const sec = d?.getElementById("magic-polaroids-section");
                const canvas = d?.getElementById("magic-polaroids-canvas");
                if (canvas && canvas._polaroidInterval) clearInterval(canvas._polaroidInterval);
                if (sec && sec._polaroidInterval) clearInterval(sec._polaroidInterval);
                sec?.remove();
            }
        },

        finalSurprise: {
            enable(d, w, userName, customText, images, customEmoji, audio, spotifyEmbedUrl, youtubeEmbedUrl, instagramEmbedUrl, mediaUrl) {
                if (d.getElementById("magic-final-surprise-section")) return;
                const section = d.createElement("section"); section.id = "magic-final-surprise-section"; section.style.cssText = "padding: clamp(24px, 3vw, 36px) clamp(16px, 2.5vw, 24px); text-align: center; margin: 50px auto 40px auto; width: 92%; max-width: 560px; box-sizing: border-box; align-self: center; clear: both; position: relative; z-index: 10;";
                const audioEl = d.createElement('audio');
                audioEl.id = 'finalSurpriseAudio';
                audioEl.src = '/assets/sounds/final-revel.mp3';
                audioEl.preload = 'auto';
                audioEl.volume = 0.7;
                audioEl.style.display = 'none';
                d.body.appendChild(audioEl);
                const btn = d.createElement("button"); btn.innerText = "\u2728 Final Message \u2728";
                btn.style.cssText = "background:linear-gradient(135deg, #ffd700, #ff8c00); color:white; border:none; padding:20px 45px; border-radius:80px; font-weight:bold; font-size:1.4rem; cursor:pointer; box-shadow:0 15px 35px rgba(255,140,0,0.4); transition:0.3s; text-transform:uppercase; letter-spacing:1px;";
                btn.onmouseenter = () => { btn.style.transform = "scale(1.08) translateY(-5px)"; btn.style.boxShadow = "0 20px 45px rgba(255,140,0,0.6)"; };
                btn.onmouseleave = () => { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 15px 35px rgba(255,140,0,0.4)"; };
                btn.onclick = () => {
                    // Play final message sound
                    const finalAudio = d.getElementById('finalSurpriseAudio');
                    if (finalAudio) {
                        finalAudio.currentTime = 0;
                        finalAudio.volume = 0.7;
                        finalAudio.play().catch(e => console.log('Final message audio failed:', e));
                    }

                    let m = (customText !== undefined && customText !== null) ? customText : "You are truly One in Millions 💖";

                    const DEFAULT_FINAL_MEDIA = '/assets/media/Final1.png';
                    let mediaSource = (mediaUrl !== undefined && mediaUrl !== '') ? mediaUrl : ((typeof images === 'string' && images) ? images : (images && images.length ? images[0] : '')) || (typeof customEmoji === 'string' && customEmoji.startsWith('/assets/media') ? customEmoji : '') || DEFAULT_FINAL_MEDIA;
                    if (mediaSource === 'none' || mediaSource === 'null' || mediaSource === false) {
                        mediaSource = '';
                    }

                    d.body.classList.add('magic-noscroll');
                    const overlay = d.createElement("div");
                    overlay.id = "magic-final-message-root";
                    overlay.style.cssText = "position: fixed; inset: 0; background: radial-gradient(circle at center, #6a0000, #2a0000); z-index: 2147483646; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: opacity 1.5s ease; opacity: 1; cursor: pointer; padding: 20px; box-sizing: border-box;";

                    const container = d.createElement("div");
                    container.style.cssText = "display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; transform: scale(0.5); opacity: 0; transition: transform 3.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 2s ease; max-width: 94vw;";

                    let mediaHtml = '';
                    if (mediaSource) {
                        if (mediaSource.match(/\.(webm|mp4|mov)$/i)) {
                            mediaHtml = `<div class="magic-final-media-wrap" style="margin-bottom: clamp(14px, 3vh, 24px); display: flex; justify-content: center; align-items: center; width: 100%;"><video class="magic-final-media" src="${escapeHtml(mediaSource)}" autoplay loop muted playsinline webkit-playsinline preload="auto" style="width: min(90vw, 480px); height: auto; max-height: clamp(160px, 32vh, 320px); object-fit: contain; filter: drop-shadow(0 0 35px rgba(255,215,0,0.6)); pointer-events: none; will-change: transform; transform: translateZ(0); backface-visibility: hidden; animation: magicHeartBeat 3s infinite ease-in-out;"></video></div>`;
                        } else {
                            mediaHtml = `<div class="magic-final-media-wrap" style="margin-bottom: clamp(14px, 3vh, 24px); display: flex; justify-content: center; align-items: center; width: 100%;"><img class="magic-final-media" src="${escapeHtml(mediaSource)}" alt="Final message decor" style="width: min(90vw, 440px); height: auto; max-height: clamp(160px, 32vh, 320px); object-fit: contain; filter: drop-shadow(0 0 35px rgba(255,215,0,0.6)); pointer-events: none; will-change: transform; transform: translateZ(0); backface-visibility: hidden; animation: magicHeartBeat 3s infinite ease-in-out;" /></div>`;
                        }
                    }

                    let textHtml = '';
                    if (m && typeof m === 'string' && m.trim().length > 0) {
                        textHtml = `<h1 style="font-family: 'Great Vibes', cursive; font-size: clamp(2rem, 7.5vw, 3.8rem); color: #fff !important; text-shadow: 0 0 25px rgba(255,255,255,0.6); margin-top: 10px; margin-bottom: 20px; text-align: center; word-wrap: break-word; max-width: 90vw; line-height: 1.3;">${escapeHtml(m)}</h1>`;
                    }

                    container.innerHTML = mediaHtml + textHtml;
                    overlay.appendChild(container);
                    d.body.appendChild(overlay);

                    // Trigger celebration confetti
                    ensureConfetti((cfn) => {
                        if (cfn) {
                            try { cfn({ particleCount: 70, spread: 80, origin: { y: 0.6 } }); } catch (e) { }
                        }
                    });

                    setTimeout(() => { container.style.transform = "scale(1.12)"; container.style.opacity = "1"; }, 100);

                    const closeOverlay = () => {
                        overlay.style.opacity = "0";
                        setTimeout(() => {
                            overlay.remove();
                            d.body.classList.remove('magic-noscroll');
                        }, 1000);
                    };

                    overlay.onclick = closeOverlay;
                    setTimeout(closeOverlay, 6500);
                };

                section.appendChild(btn); insertSectionBeforeFinal(d, section); scrollToElement(d, section); return { listeners: [{ target: btn, type: "click", handler: btn.onclick }] };
            },
            disable(d) { d?.getElementById("magic-final-surprise-section")?.remove(); const audio = d?.getElementById("finalSurpriseAudio"); if (audio) audio.remove(); d?.getElementById("magic-final-message-root")?.remove(); }
        },

        magicMusic: {
            enable(d, w, userName, customText, audio) {
                if (d.getElementById("magic-bg-audio")) {
                    this.disable(d, w);
                }
                const DEFAULT_BG_AUDIO = "/assets/Happy Birthday short.mp3";
                let srcUrl = audio || customText;
                if (typeof srcUrl === 'string' && srcUrl.startsWith('blob:') && typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__) {
                    srcUrl = null;
                }
                const a = d.createElement("audio");
                a.id = "magic-bg-audio";
                a.loop = true;
                a.volume = 0.4;
                a.autoplay = false;

                if (srcUrl && typeof srcUrl === 'string' && srcUrl.trim().length > 0) {
                    a.src = srcUrl.trim();
                    a.onerror = () => {
                        console.warn("Custom background music failed to load. Falling back to default birthday music.");
                        a.onerror = null;
                        a.src = DEFAULT_BG_AUDIO;
                        a.load();
                        if (!a.paused) {
                            a.play().catch(() => { });
                        }
                    };
                } else {
                    a.src = DEFAULT_BG_AUDIO;
                }
                d.body.appendChild(a);

                // Checks if any of the overlays are still active/blocking
                const isBlocked = () => {
                    const hasCountdown = !!d.getElementById("magic-countdown-overlay");
                    const hasLock = !!d.getElementById("lock-overlay") || (w.lockUnlocked === false);
                    const hasCurtain = !!d.getElementById("magic-curtain-reveal-root");
                    const hasWelcome = !!d.getElementById("magic-welcome-typing-root");
                    return hasCountdown || hasLock || hasCurtain || hasWelcome;
                };

                // Inject CSS keyframes for animated music bars and premium effects
                if (!d.getElementById("magic-music-style")) {
                    const style = d.createElement("style");
                    style.id = "magic-music-style";
                    style.innerHTML = `
                    @keyframes magic-bar-bounce-0 { 0%, 100% { height: 25%; } 50% { height: 95%; } }
                    @keyframes magic-bar-bounce-1 { 0%, 100% { height: 35%; } 50% { height: 100%; } }
                    @keyframes magic-bar-bounce-2 { 0%, 100% { height: 15%; } 50% { height: 75%; } }
                    @keyframes magic-bar-bounce-3 { 0%, 100% { height: 40%; } 50% { height: 90%; } }
                    @keyframes magic-bar-bounce-4 { 0%, 100% { height: 20%; } 50% { height: 80%; } }
                    .magic-music-bar-active-0 { animation: magic-bar-bounce-0 0.7s ease-in-out infinite; }
                    .magic-music-bar-active-1 { animation: magic-bar-bounce-1 0.6s ease-in-out infinite; }
                    .magic-music-bar-active-2 { animation: magic-bar-bounce-2 0.8s ease-in-out infinite; }
                    .magic-music-bar-active-3 { animation: magic-bar-bounce-3 0.5s ease-in-out infinite; }
                    .magic-music-bar-active-4 { animation: magic-bar-bounce-4 0.7s ease-in-out infinite; }
                    
                    @keyframes magic-widget-pulse {
                        0% { box-shadow: 0 8px 24px rgba(123, 93, 246, 0.15), 0 0 0 0px rgba(123, 93, 246, 0.2); }
                        70% { box-shadow: 0 8px 24px rgba(123, 93, 246, 0.25), 0 0 0 8px rgba(123, 93, 246, 0); }
                        100% { box-shadow: 0 8px 24px rgba(123, 93, 246, 0.15), 0 0 0 0px rgba(123, 93, 246, 0); }
                    }
                    .magic-music-pulse-active { animation: magic-widget-pulse 2s infinite; }

                    @keyframes magic-status-blink {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.35; transform: scale(0.85); }
                    }
                    @keyframes magic-play-pulse {
                        0% { box-shadow: 0 4px 12px rgba(255, 122, 47, 0.35), 0 0 0 0px rgba(255, 122, 47, 0.4); }
                        70% { box-shadow: 0 4px 12px rgba(255, 122, 47, 0.35), 0 0 0 10px rgba(255, 122, 47, 0); }
                        100% { box-shadow: 0 4px 12px rgba(255, 122, 47, 0.35), 0 0 0 0px rgba(255, 122, 47, 0); }
                    }
                    .magic-play-pulse-active { animation: magic-play-pulse 2s infinite !important; }
                `;
                    d.head.appendChild(style);
                }

                // Create floating music widget
                const widget = d.createElement("div");
                widget.id = "magic-music-widget";
                widget.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000; background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1.5px solid rgba(255, 255, 255, 0.7); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s, box-shadow 0.3s;";

                // Glassmorphic sliding tooltip
                const tooltip = d.createElement("div");
                tooltip.style.cssText = "position: fixed; top: 28px; right: 74px; z-index: 10000; background: rgba(123, 93, 246, 0.9); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: white; padding: 6px 12px; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 0.68rem; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity 0.3s, transform 0.3s; transform: translateX(10px); box-shadow: 0 4px 12px rgba(123, 93, 246, 0.2); border: 1px solid rgba(255, 255, 255, 0.15); white-space: nowrap;";
                tooltip.innerText = w.currentLang === 'hi' ? 'संगीत बंद/चालू करें' : 'Tap to mute music';
                d.body.appendChild(tooltip);

                const wave = d.createElement("div");
                wave.style.cssText = "display: flex; align-items: flex-end; gap: 2.5px; width: 20px; height: 16px;";

                const bars = [];
                for (let i = 0; i < 5; i++) {
                    const bar = d.createElement("div");
                    bar.style.cssText = "width: 2.5px; height: 30%; background: linear-gradient(to top, #ff7a2f, #7b5df6); border-radius: 1.5px; transition: height 0.2s;";
                    wave.appendChild(bar);
                    bars.push(bar);
                }
                widget.appendChild(wave);

                // Muted Speaker Icon to replace the background music icon
                const muteIcon = d.createElement("i");
                muteIcon.className = "fas fa-volume-mute";
                muteIcon.style.cssText = "color: #7b5df6; font-size: 1.1rem; display: none;";
                widget.appendChild(muteIcon);

                d.body.appendChild(widget);

                const startBars = () => {
                    bars.forEach((bar, idx) => {
                        bar.classList.add(`magic-music-bar-active-${idx}`);
                    });
                    widget.classList.add("magic-music-pulse-active");
                    wave.style.display = 'flex';
                    muteIcon.style.display = 'none';
                };

                const stopBars = () => {
                    bars.forEach((bar, idx) => {
                        bar.classList.remove(`magic-music-bar-active-${idx}`);
                        bar.style.height = "30%";
                    });
                    widget.classList.remove("magic-music-pulse-active");
                    wave.style.display = 'none';
                    muteIcon.style.display = 'block';
                };

                // Set initial visual state to muted/paused
                stopBars();

                // Listeners to toggle animation state based on actual media playback
                a.addEventListener('play', startBars);
                a.addEventListener('playing', startBars);
                a.addEventListener('pause', stopBars);
                a.addEventListener('ended', stopBars);

                a.addEventListener('volumechange', () => {
                    if (a.muted || a.volume === 0) {
                        stopBars();
                    } else if (!a.paused) {
                        startBars();
                    }
                });

                // User manual pause tracker
                let userManuallyPaused = false;
                widget.onclick = () => {
                    if (isBlocked()) return;
                    if (a.paused) {
                        userManuallyPaused = false;
                        wasPlayingBeforeInterrupt = false;
                        a.play().catch(() => { });
                    } else {
                        userManuallyPaused = true;
                        wasPlayingBeforeInterrupt = false;
                        a.pause();
                    }
                };

                widget.onmouseenter = () => {
                    widget.style.transform = "scale(1.08)";
                    widget.style.boxShadow = "0 10px 28px rgba(123, 93, 246, 0.15)";
                    tooltip.style.opacity = "1";
                    tooltip.style.transform = "translateX(0)";
                };
                widget.onmouseleave = () => {
                    widget.style.transform = "scale(1)";
                    widget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                    tooltip.style.opacity = "0";
                    tooltip.style.transform = "translateX(10px)";
                };

                // Track interrupting sound effects and gracefully pause background music
                const activeOtherAudios = new Set();
                let wasPlayingBeforeInterrupt = false;
                let resumeTimer = null;

                const pauseBgMusicForSound = (otherAudio) => {
                    if (!otherAudio || otherAudio === a || otherAudio.id === "magic-bg-audio") return;

                    if (resumeTimer) {
                        clearTimeout(resumeTimer);
                        resumeTimer = null;
                    }

                    // Remember if background music was actively playing prior to this interruption
                    if (!a.paused) {
                        wasPlayingBeforeInterrupt = true;
                        a.pause();
                    }

                    activeOtherAudios.add(otherAudio);

                    const onSoundFinish = () => {
                        activeOtherAudios.delete(otherAudio);
                        otherAudio.removeEventListener('ended', onSoundFinish);
                        otherAudio.removeEventListener('pause', onSoundFinish);
                        otherAudio.removeEventListener('error', onSoundFinish);
                        scheduleCheckResume();
                    };

                    otherAudio.addEventListener('ended', onSoundFinish);
                    otherAudio.addEventListener('pause', onSoundFinish);
                    otherAudio.addEventListener('error', onSoundFinish);
                };

                const scheduleCheckResume = () => {
                    if (resumeTimer) clearTimeout(resumeTimer);
                    // 200ms buffer to seamlessly bridge overlapping or rapid sounds without audio stutter
                    resumeTimer = setTimeout(() => {
                        for (const aud of activeOtherAudios) {
                            if (aud.paused || aud.ended) {
                                activeOtherAudios.delete(aud);
                            }
                        }

                        // Verify no active audio is currently playing in document or parent document
                        const inDocPlaying = Array.from(d.querySelectorAll('audio')).some(aud => aud !== a && aud.id !== 'magic-bg-audio' && !aud.paused && !aud.ended);
                        let inParentPlaying = false;
                        try {
                            if (window.parent && window.parent.document && window.parent.document !== d) {
                                inParentPlaying = Array.from(window.parent.document.querySelectorAll('audio')).some(aud => aud !== a && aud.id !== 'magic-bg-audio' && !aud.paused && !aud.ended);
                            }
                        } catch (e) { }

                        if (activeOtherAudios.size === 0 && !inDocPlaying && !inParentPlaying) {
                            if (wasPlayingBeforeInterrupt && !userManuallyPaused && !isBlocked()) {
                                a.play().catch(() => { });
                            }
                            wasPlayingBeforeInterrupt = false;
                        }
                    }, 200);
                };

                // Auto play logic after conditions are met
                const checkAndPlay = () => {
                    if (!isBlocked() && !userManuallyPaused) {
                        // Only play if no other sound effects are currently playing
                        const anyOtherPlaying = Array.from(d.querySelectorAll('audio')).some(aud => aud !== a && aud.id !== 'magic-bg-audio' && !aud.paused && !aud.ended);
                        if (anyOtherPlaying || activeOtherAudios.size > 0) {
                            wasPlayingBeforeInterrupt = true;
                            return;
                        }
                        a.play().then(() => {
                            // Cleanup doc listeners once started successfully
                            d.removeEventListener('click', playAudio);
                            d.removeEventListener('keydown', playAudio);
                            try {
                                window.parent.document.removeEventListener('click', playAudio);
                                window.parent.document.removeEventListener('keydown', playAudio);
                            } catch (err) { }
                        }).catch(e => { });
                    }
                };

                // Listen to DOM mutations to automatically trigger once overlays are removed
                const observer = new MutationObserver(() => {
                    if (!isBlocked()) {
                        checkAndPlay();
                        observer.disconnect();
                    }
                });
                observer.observe(d.body, { childList: true, subtree: true });

                // Listen to specific custom events dispatched when features finish
                window.addEventListener('lockUnlocked', checkAndPlay);
                window.addEventListener('curtainOpened', checkAndPlay);
                window.addEventListener('welcomeTypingFinished', checkAndPlay);
                window.addEventListener('countdownFinished', checkAndPlay);
                try { (w || window).addEventListener('lockUnlocked', checkAndPlay); } catch (e) { }
                try { (w || window).addEventListener('curtainOpened', checkAndPlay); } catch (e) { }
                try { (w || window).addEventListener('welcomeTypingFinished', checkAndPlay); } catch (e) { }
                try { (w || window).addEventListener('countdownFinished', checkAndPlay); } catch (e) { }

                const playAudio = () => {
                    if (isBlocked()) return;
                    checkAndPlay();
                };
                d.addEventListener('click', playAudio);
                d.addEventListener('keydown', playAudio);
                try {
                    window.parent.document.addEventListener('click', playAudio);
                    window.parent.document.addEventListener('keydown', playAudio);
                } catch (err) { }

                const onOtherAudioPlay = (e) => {
                    pauseBgMusicForSound(e.target);
                };
                const onOtherAudioPauseOrEnd = (e) => {
                    if (e.target === a || e.target?.id === 'magic-bg-audio') return;
                    activeOtherAudios.delete(e.target);
                    scheduleCheckResume();
                };

                d.addEventListener('play', onOtherAudioPlay, true);
                d.addEventListener('pause', onOtherAudioPauseOrEnd, true);
                d.addEventListener('ended', onOtherAudioPauseOrEnd, true);
                try {
                    window.parent.document.addEventListener('play', onOtherAudioPlay, true);
                    window.parent.document.addEventListener('pause', onOtherAudioPauseOrEnd, true);
                    window.parent.document.addEventListener('ended', onOtherAudioPauseOrEnd, true);
                } catch (err) { }

                // Listen for YouTube & Spotify iframe postMessages to auto-pause background music
                const onWindowMessage = (e) => {
                    let data = e.data;
                    if (typeof data === 'string') {
                        try { data = JSON.parse(data); } catch (err) { return; }
                    }
                    if (!data || typeof data !== 'object') return;

                    // YouTube onStateChange or infoDelivery playerState
                    // 1: PLAYING, 3: BUFFERING, 2: PAUSED, 0: ENDED
                    const isYtPlay = (data.event === 'onStateChange' && (data.info === 1 || data.info === 3)) ||
                        (data.event === 'infoDelivery' && data.info && (data.info.playerState === 1 || data.info.playerState === 3));

                    const isYtPause = (data.event === 'onStateChange' && (data.info === 2 || data.info === 0)) ||
                        (data.event === 'infoDelivery' && data.info && (data.info.playerState === 2 || data.info.playerState === 0));

                    // Spotify playback updates
                    const isSpotifyPlay = data.type === 'playback_update' && data.data && data.data.is_paused === false;
                    const isSpotifyPause = data.type === 'playback_update' && data.data && data.data.is_paused === true;

                    if (isYtPlay || isSpotifyPlay) {
                        if (resumeTimer) {
                            clearTimeout(resumeTimer);
                            resumeTimer = null;
                        }
                        if (!a.paused) {
                            wasPlayingBeforeInterrupt = true;
                            a.pause();
                        }
                        activeOtherAudios.add(isYtPlay ? 'youtube' : 'spotify');
                    } else if (isYtPause || isSpotifyPause) {
                        activeOtherAudios.delete(isYtPause ? 'youtube' : 'spotify');
                        scheduleCheckResume();
                    }
                };

                const msgTargets = [w, window];
                try {
                    if (window.parent && window.parent !== window) msgTargets.push(window.parent);
                } catch (e) { }

                msgTargets.forEach(tgt => {
                    try { tgt.addEventListener('message', onWindowMessage); } catch (e) { }
                });

                // Synchronously intercept HTMLAudioElement.prototype.play in window and parent window
                const winTargets = [w, window];
                try {
                    if (window.parent && window.parent !== window) winTargets.push(window.parent);
                } catch (e) { }

                const originalPlayMap = new Map();
                winTargets.forEach(winObj => {
                    try {
                        if (winObj && winObj.HTMLAudioElement && winObj.HTMLAudioElement.prototype && !winObj.HTMLAudioElement.__magicAudioIntercepted) {
                            const origPlay = winObj.HTMLAudioElement.prototype.play;
                            originalPlayMap.set(winObj, origPlay);
                            winObj.HTMLAudioElement.__magicAudioIntercepted = true;
                            winObj.HTMLAudioElement.prototype.play = function () {
                                if (this !== a && this.id !== 'magic-bg-audio') {
                                    pauseBgMusicForSound(this);
                                }
                                return origPlay.apply(this, arguments);
                            };
                        }
                    } catch (e) { }
                });

                // Try to play initially (will only succeed if not blocked and browser allows)
                checkAndPlay();

                const cleanupFn = () => {
                    if (resumeTimer) {
                        clearTimeout(resumeTimer);
                        resumeTimer = null;
                    }
                    winTargets.forEach(winObj => {
                        try {
                            if (winObj && winObj.HTMLAudioElement && originalPlayMap.has(winObj)) {
                                winObj.HTMLAudioElement.prototype.play = originalPlayMap.get(winObj);
                                delete winObj.HTMLAudioElement.__magicAudioIntercepted;
                            }
                        } catch (e) { }
                    });
                    msgTargets.forEach(tgt => {
                        try { tgt.removeEventListener('message', onWindowMessage); } catch (e) { }
                    });
                    try {
                        a.pause();
                        a.currentTime = 0;
                        a.src = "";
                        a.load();
                    } catch (e) { }
                    a.remove();
                    widget?.remove();
                    tooltip?.remove();
                    observer?.disconnect();
                    window.removeEventListener('lockUnlocked', checkAndPlay);
                    window.removeEventListener('curtainOpened', checkAndPlay);
                    window.removeEventListener('welcomeTypingFinished', checkAndPlay);
                    window.removeEventListener('countdownFinished', checkAndPlay);
                    try { (w || window).removeEventListener('lockUnlocked', checkAndPlay); } catch (e) { }
                    try { (w || window).removeEventListener('curtainOpened', checkAndPlay); } catch (e) { }
                    try { (w || window).removeEventListener('welcomeTypingFinished', checkAndPlay); } catch (e) { }
                    try { (w || window).removeEventListener('countdownFinished', checkAndPlay); } catch (e) { }
                    d.removeEventListener('click', playAudio);
                    d.removeEventListener('keydown', playAudio);
                    d.removeEventListener('play', onOtherAudioPlay, true);
                    d.removeEventListener('pause', onOtherAudioPauseOrEnd, true);
                    d.removeEventListener('ended', onOtherAudioPauseOrEnd, true);
                    try {
                        window.parent.document.removeEventListener('click', playAudio);
                        window.parent.document.removeEventListener('keydown', playAudio);
                        window.parent.document.removeEventListener('play', onOtherAudioPlay, true);
                        window.parent.document.removeEventListener('pause', onOtherAudioPauseOrEnd, true);
                        window.parent.document.removeEventListener('ended', onOtherAudioPauseOrEnd, true);
                    } catch (err) { }
                    if (d) d.__magicMusicCleanup = null;
                };

                if (d) d.__magicMusicCleanup = cleanupFn;

                return {
                    cleanup: cleanupFn
                };
            },
            disable(d, w) {
                if (d?.__magicMusicCleanup) {
                    try { d.__magicMusicCleanup(); } catch (e) { }
                    d.__magicMusicCleanup = null;
                }
                const a = d?.getElementById("magic-bg-audio");
                if (a) {
                    try {
                        a.pause();
                        a.currentTime = 0;
                        a.src = "";
                        a.load();
                    } catch (e) { }
                    a.remove();
                }
                d?.getElementById("magic-music-widget")?.remove();
                d?.getElementById("magic-music-tooltip")?.remove();
            }
        },

        voiceNote: {
            enable(d, w, userName, customText, audio) {
                const defaultVoiceSample = "/assets/sounds/unlocked.mp3";
                let srcUrl = audio || customText || defaultVoiceSample;
                if (typeof srcUrl === 'string' && srcUrl.startsWith('blob:') && typeof window !== 'undefined' && window.__IS_GENERATED_PAGE__) {
                    srcUrl = defaultVoiceSample;
                }
                if (!srcUrl) return {};
                if (d.getElementById("magic-voice-note-section")) return {};

                // Ensure FontAwesome is loaded in the iframe
                if (!d.getElementById("fa-css-link")) {
                    const fa = d.createElement("link");
                    fa.id = "fa-css-link";
                    fa.rel = "stylesheet";
                    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
                    d.head.appendChild(fa);
                }

                const section = d.createElement("section");
                section.id = "magic-voice-note-section";
                section.style.cssText = "padding: clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px); text-align: center; background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: clamp(20px, 2.5vw, 32px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 560px; box-sizing: border-box; align-self: center; border: 1px solid rgba(255, 255, 255, 0.6); display: flex; flex-direction: column; align-items: center; gap: clamp(14px, 2vw, 20px); box-shadow: 0 20px 50px rgba(123, 93, 246, 0.1), 0 10px 20px rgba(0,0,0,0.03); transition: all 0.4s ease;";

                const title = d.createElement("h2");
                title.style.cssText = "font-family: 'Great Vibes', cursive; font-size: clamp(1.8rem, 3vw, 2.4rem); color: #ff7a2f; margin: 0; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 500;";
                title.innerHTML = '<i class="fas fa-microphone-alt" style="font-size: 1.8rem; background: linear-gradient(135deg, #ff7a2f, #7b5df6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i> ' + (w.currentLang === 'hi' ? 'आपके लिए एक वॉइस नोट' : 'Voice Note For You');
                section.appendChild(title);

                // Container supporting waveform + advanced audio controls
                const playerContainer = d.createElement("div");
                playerContainer.style.cssText = "display: flex; flex-direction: column; gap: 14px; background: rgba(255, 255, 255, 0.9); padding: clamp(14px, 2vw, 20px) clamp(16px, 2vw, 24px); border-radius: 30px; border: 1.5px solid rgba(255, 255, 255, 0.8); box-shadow: 0 10px 30px rgba(123, 93, 246, 0.05); width: min(100%, 420px); box-sizing: border-box;";

                // Row 1: Play, Waveform, Elapsed Time
                const mainRow = d.createElement("div");
                mainRow.style.cssText = "display: flex; align-items: center; gap: 12px; width: 100%;";

                const playBtn = d.createElement("button");
                playBtn.style.cssText = "background: linear-gradient(135deg, #ff7a2f, #ff9e67); color: white; border: none; width: clamp(46px, 4vw, 56px); height: clamp(46px, 4vw, 56px); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: clamp(1.1rem, 1.6vw, 1.35rem); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s; box-shadow: 0 4px 12px rgba(255, 122, 47, 0.3); flex-shrink: 0; outline: none; position: relative;";
                playBtn.innerHTML = '<i class="fas fa-play" style="margin-left: 2px;"></i>';

                playBtn.onmouseenter = () => { playBtn.style.transform = 'scale(1.06)'; };
                playBtn.onmouseleave = () => { playBtn.style.transform = 'scale(1)'; };
                mainRow.appendChild(playBtn);

                // Interactive Waveform Visualizer (35 premium bars)
                const waveformContainer = d.createElement("div");
                waveformContainer.style.cssText = "flex: 1; display: flex; align-items: center; gap: 3.5px; height: 38px; cursor: pointer; position: relative; padding: 0 4px;";

                const barHeights = [15, 25, 35, 20, 45, 55, 30, 60, 75, 50, 85, 95, 60, 80, 70, 50, 45, 65, 80, 90, 75, 60, 45, 35, 50, 40, 60, 30, 45, 25, 35, 20, 25, 15, 10];
                const bars = [];
                barHeights.forEach((h) => {
                    const bar = d.createElement("div");
                    bar.style.cssText = `flex: 1; height: ${h}%; background: rgba(0, 0, 0, 0.08); border-radius: 2px; transition: background 0.2s, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: center;`;
                    waveformContainer.appendChild(bar);
                    bars.push(bar);
                });
                mainRow.appendChild(waveformContainer);

                const timeLabel = d.createElement("span");
                timeLabel.style.cssText = "font-size: 0.8rem; color: #555; font-family: 'Poppins', sans-serif; min-width: 38px; text-align: right; font-weight: 500; user-select: none;";
                timeLabel.innerText = "0:00";
                mainRow.appendChild(timeLabel);

                playerContainer.appendChild(mainRow);

                // Row 2: Speed Control & Volume (Mute) - Download removed per user request
                const controlRow = d.createElement("div");
                controlRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(0, 0, 0, 0.05); padding-top: 8px; width: 100%; margin-top: 2px;";

                const leftControls = d.createElement("div");
                leftControls.style.cssText = "display: flex; align-items: center; gap: 12px;";

                // Playback Rate (Speed Toggle)
                const speedBtn = d.createElement("button");
                speedBtn.style.cssText = "background: rgba(0, 0, 0, 0.04); color: #555; border: none; padding: 4px 10px; border-radius: 12px; font-size: 0.72rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none;";
                speedBtn.innerText = "1.0x";
                const speeds = [1, 1.25, 1.5, 2];
                let speedIdx = 0;

                speedBtn.onclick = () => {
                    speedIdx = (speedIdx + 1) % speeds.length;
                    const newSpeed = speeds[speedIdx];
                    audioObj.defaultPlaybackRate = newSpeed;
                    audioObj.playbackRate = newSpeed;
                    speedBtn.innerText = newSpeed.toFixed(1) + "x";
                    if (newSpeed !== 1) {
                        speedBtn.style.background = "rgba(255, 122, 47, 0.12)";
                        speedBtn.style.color = "#ff7a2f";
                    } else {
                        speedBtn.style.background = "rgba(0, 0, 0, 0.04)";
                        speedBtn.style.color = "#555";
                    }
                };
                leftControls.appendChild(speedBtn);

                // Speaker Mute/Unmute
                const muteBtn = d.createElement("button");
                muteBtn.style.cssText = "background: none; border: none; color: #777; cursor: pointer; font-size: 0.85rem; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; outline: none;";
                muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                let isMuted = false;

                muteBtn.onclick = () => {
                    isMuted = !isMuted;
                    audioObj.muted = isMuted;
                    if (isMuted) {
                        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                        muteBtn.style.color = "#ff3366";
                    } else {
                        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        muteBtn.style.color = "#777";
                    }
                };
                leftControls.appendChild(muteBtn);
                controlRow.appendChild(leftControls);
                playerContainer.appendChild(controlRow);

                section.appendChild(playerContainer);

                const audioObj = d.createElement("audio");
                audioObj.src = srcUrl;
                audioObj.preload = "metadata";
                audioObj.onerror = () => {
                    if (audioObj.src !== defaultVoiceSample) {
                        audioObj.src = defaultVoiceSample;
                        audioObj.load();
                    }
                };
                section.appendChild(audioObj);

                let isPlaying = false;
                let animId = null;

                const formatTime = (secs) => {
                    if (isNaN(secs)) return "0:00";
                    const m = Math.floor(secs / 60);
                    const s = Math.floor(secs % 60);
                    return `${m}:${s.toString().padStart(2, '0')}`;
                };

                // Dynamic sine-wave breathing animation loop for playing waveform bars
                const updateWaveAnimation = () => {
                    if (!isPlaying) return;

                    const percent = audioObj.duration ? (audioObj.currentTime / audioObj.duration) * 100 : 0;
                    const activeBarCount = Math.floor((percent / 100) * bars.length);
                    const timeFactor = Date.now() / 150;

                    bars.forEach((bar, idx) => {
                        if (idx < activeBarCount) {
                            bar.style.background = "linear-gradient(to bottom, #ff7a2f, #7b5df6)";
                            const scale = 1.12 + Math.sin(timeFactor + idx * 0.4) * 0.28;
                            bar.style.transform = `scaleY(${scale})`;
                        } else {
                            bar.style.background = "rgba(0, 0, 0, 0.08)";
                            bar.style.transform = "scaleY(1)";
                        }
                    });

                    animId = requestAnimationFrame(updateWaveAnimation);
                };

                // Magnetic Ripple Hover Effect
                waveformContainer.onmousemove = (e) => {
                    const rect = waveformContainer.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const percentX = mouseX / rect.width;
                    const hoverIdx = Math.floor(percentX * bars.length);

                    bars.forEach((bar, idx) => {
                        const distance = Math.abs(idx - hoverIdx);
                        const percent = audioObj.duration ? (audioObj.currentTime / audioObj.duration) * 100 : 0;
                        const isActive = idx < Math.floor((percent / 100) * bars.length);

                        if (distance <= 4) {
                            const factor = 1 + (4 - distance) * 0.14;
                            const baseScale = isActive ? 1.15 : 1.0;
                            bar.style.transform = `scaleY(${baseScale * factor})`;
                            if (!isActive) {
                                bar.style.background = "rgba(123, 93, 246, 0.25)";
                            }
                        } else {
                            if (!isPlaying) {
                                const baseScale = isActive ? 1.15 : 1.0;
                                bar.style.transform = `scaleY(${baseScale})`;
                                if (!isActive) {
                                    bar.style.background = "rgba(0, 0, 0, 0.08)";
                                }
                            }
                        }
                    });
                };

                waveformContainer.onmouseleave = () => {
                    if (!isPlaying) {
                        const percent = audioObj.duration ? (audioObj.currentTime / audioObj.duration) * 100 : 0;
                        const activeBarCount = Math.floor((percent / 100) * bars.length);
                        bars.forEach((bar, idx) => {
                            if (idx < activeBarCount) {
                                bar.style.background = "linear-gradient(to bottom, #ff7a2f, #7b5df6)";
                                bar.style.transform = "scaleY(1.15)";
                            } else {
                                bar.style.background = "rgba(0, 0, 0, 0.08)";
                                bar.style.transform = "scaleY(1)";
                            }
                        });
                    }
                };

                const applyPlaybackSpeed = () => {
                    if (audioObj && speeds && speeds[speedIdx] !== undefined) {
                        if (audioObj.playbackRate !== speeds[speedIdx]) {
                            audioObj.playbackRate = speeds[speedIdx];
                        }
                    }
                };

                audioObj.addEventListener('play', applyPlaybackSpeed);
                audioObj.addEventListener('playing', applyPlaybackSpeed);
                audioObj.addEventListener('seeked', applyPlaybackSpeed);
                audioObj.addEventListener('canplay', applyPlaybackSpeed);
                audioObj.addEventListener('ratechange', applyPlaybackSpeed);

                audioObj.addEventListener('loadedmetadata', () => {
                    applyPlaybackSpeed();
                    timeLabel.innerText = formatTime(audioObj.duration);
                });

                audioObj.addEventListener('timeupdate', () => {
                    applyPlaybackSpeed();
                    // If not playing (e.g. paused/seeking), manually update static states
                    if (!isPlaying) {
                        const percent = audioObj.duration ? (audioObj.currentTime / audioObj.duration) * 100 : 0;
                        const activeBarCount = Math.floor((percent / 100) * bars.length);
                        bars.forEach((bar, idx) => {
                            if (idx < activeBarCount) {
                                bar.style.background = "linear-gradient(to bottom, #ff7a2f, #7b5df6)";
                                bar.style.transform = "scaleY(1.15)";
                            } else {
                                bar.style.background = "rgba(0, 0, 0, 0.08)";
                                bar.style.transform = "scaleY(1)";
                            }
                        });
                    }
                    timeLabel.innerText = formatTime(audioObj.currentTime);
                });

                audioObj.addEventListener('ended', () => {
                    isPlaying = false;
                    if (animId) cancelAnimationFrame(animId);
                    playBtn.innerHTML = '<i class="fas fa-play" style="margin-left: 2px;"></i>';
                    playBtn.classList.remove("magic-play-pulse-active");
                    bars.forEach(bar => {
                        bar.style.background = "rgba(0, 0, 0, 0.08)";
                        bar.style.transform = "scaleY(1)";
                    });
                    timeLabel.innerText = formatTime(audioObj.duration);
                });

                playBtn.onclick = () => {
                    if (isPlaying) {
                        audioObj.pause();
                        isPlaying = false;
                        if (animId) cancelAnimationFrame(animId);
                        playBtn.innerHTML = '<i class="fas fa-play" style="margin-left: 2px;"></i>';
                        playBtn.classList.remove("magic-play-pulse-active");
                    } else {
                        audioObj.play().catch(e => console.log(e));
                        isPlaying = true;
                        updateWaveAnimation();
                        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                        playBtn.classList.add("magic-play-pulse-active");
                    }
                };

                waveformContainer.onclick = (e) => {
                    const rect = waveformContainer.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    if (audioObj.duration) audioObj.currentTime = pos * audioObj.duration;
                };

                if (typeof insertSectionBeforeFinal === 'function') {
                    insertSectionBeforeFinal(d, section);
                } else {
                    const container = d.getElementById('sections-container') || d.body;
                    container.appendChild(section);
                }
                scrollToElement(d, section);
                return { cleanup: () => { section.remove(); } };
            },
            disable(d) {
                d?.getElementById("magic-voice-note-section")?.remove();
            }
        },

        countdown: {
            enable(d, w, userName, customText, images, customEmoji, audio, spotifyEmbedUrl, youtubeEmbedUrl, instagramEmbedUrl, mediaUrl) {
                if (!customText) return {};
                const parseLocalTime = (str) => {
                    if (typeof str !== 'string') return new Date(str);
                    const parts = str.split('T');
                    if (parts.length !== 2) return new Date(str);
                    const dateParts = parts[0].split('-');
                    const timeParts = parts[1].split(':');
                    if (dateParts.length !== 3 || timeParts.length < 2) return new Date(str);
                    return new Date(
                        parseInt(dateParts[0], 10),
                        parseInt(dateParts[1], 10) - 1,
                        parseInt(dateParts[2], 10),
                        parseInt(timeParts[0], 10),
                        parseInt(timeParts[1], 10),
                        0, 0
                    );
                };

                const targetTimeStr = (typeof customText === 'object' && customText.text) ? customText.text : (typeof customText === 'string' ? customText : '');
                const targetTime = parseLocalTime(targetTimeStr).getTime();
                if (isNaN(targetTime)) return {};

                const now = Date.now();
                if (now >= targetTime) return {}; // Already passed

                const existing = d.getElementById("magic-countdown-overlay");
                if (existing) {
                    if (existing._timerInterval) {
                        clearInterval(existing._timerInterval);
                    }
                    existing.remove();
                }

                const THEMES = {
                    'romantic-couple': {
                        id: 'romantic-couple',
                        name: 'Romantic Couple',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ SPECIAL SURPRISE MOMENT ✦',
                        cardSubtitleHi: '✦ स्पेशल सरप्राइज मोमेंट ✦',
                        badgeIcon: '💖',
                        badgeBg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                        cardBg: 'rgba(255, 255, 255, 0.82)',
                        cardBorder: 'rgba(255, 255, 255, 0.94)',
                        cardShadow: '0 24px 54px rgba(219, 39, 119, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        cardSubColor: '#be185d',
                        haloGradient: 'radial-gradient(circle, #f472b6 0%, #fda4af 60%, transparent 100%)',
                        decorLeft: '♡',
                        decorRight: '♡',
                        decorUnder: '♡',
                        bgGradient: 'linear-gradient(135deg, #fff0f3 0%, #fde2e4 45%, #fbcfe8 100%)',
                        textColor: '#9d174d',
                        titleColor: '#be185d',
                        pillBg: 'rgba(255, 255, 255, 0.62)',
                        pillBorder: 'rgba(255, 255, 255, 0.88)',
                        pillShadow: '0 16px 36px rgba(219, 39, 119, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        numColor: '#9d174d',
                        colonColor: '#ec4899',
                        labelColor: '#be185d',
                        defaultMedia: '/assets/media/countdown/theme-couple.jpg',
                        confettiColors: ['#ff4081', '#f06292', '#f48fb1', '#ffffff', '#ff80ab', '#ad1457'],
                        particleEmoji: ['💖', '💕', '🌸', '✨', '🤍']
                    },
                    'birthday-bear': {
                        id: 'birthday-bear',
                        name: 'Birthday Bear',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ BIRTHDAY CELEBRATION ✦',
                        cardSubtitleHi: '✦ जन्मदिन का जश्न ✦',
                        badgeIcon: '🎂',
                        badgeBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        cardBg: 'rgba(255, 255, 255, 0.86)',
                        cardBorder: 'rgba(255, 255, 255, 0.95)',
                        cardShadow: '0 24px 54px rgba(217, 119, 6, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        cardSubColor: '#b45309',
                        haloGradient: 'radial-gradient(circle, #fbbf24 0%, #fde68a 60%, transparent 100%)',
                        decorLeft: '⊰',
                        decorRight: '⊱',
                        decorUnder: '♥',
                        bgGradient: 'linear-gradient(135deg, #fffdf0 0%, #fef3c7 45%, #fde68a 100%)',
                        textColor: '#9a3412',
                        titleColor: '#b45309',
                        pillBg: 'rgba(255, 255, 255, 0.68)',
                        pillBorder: 'rgba(255, 255, 255, 0.92)',
                        pillShadow: '0 16px 36px rgba(217, 119, 6, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        numColor: '#991b1b',
                        colonColor: '#ea580c',
                        labelColor: '#9a3412',
                        defaultMedia: '/assets/media/countdown/theme-bear.jpg',
                        confettiColors: ['#ffca28', '#ff7043', '#ec407a', '#26a69a', '#ab47bc', '#ffd54f'],
                        particleEmoji: ['🎉', '⭐', '🎈', '✨', '🍰']
                    },
                    'star-kitten': {
                        id: 'star-kitten',
                        name: 'Sleeping Star Kitten',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ MAGICAL STARRY NIGHT ✦',
                        cardSubtitleHi: '✦ तारों भरी रात ✦',
                        badgeIcon: '⭐',
                        badgeBg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        cardBg: 'rgba(255, 255, 255, 0.82)',
                        cardBorder: 'rgba(255, 255, 255, 0.94)',
                        cardShadow: '0 24px 54px rgba(124, 58, 237, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        cardSubColor: '#6d28d9',
                        haloGradient: 'radial-gradient(circle, #c084fc 0%, #ddd6fe 60%, transparent 100%)',
                        decorLeft: '♡',
                        decorRight: '♡',
                        decorUnder: '♡',
                        bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 45%, #ddd6fe 100%)',
                        textColor: '#5b21b6',
                        titleColor: '#6d28d9',
                        pillBg: 'rgba(255, 255, 255, 0.62)',
                        pillBorder: 'rgba(255, 255, 255, 0.88)',
                        pillShadow: '0 16px 36px rgba(124, 58, 237, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        numColor: '#4c1d95',
                        colonColor: '#7c3aed',
                        labelColor: '#5b21b6',
                        defaultMedia: '/assets/media/countdown/theme-star-cat.jpg',
                        confettiColors: ['#c084fc', '#a855f7', '#7c3aed', '#ffffff', '#fde047'],
                        particleEmoji: ['⭐', '✨', '🌙', '💜', '☁️']
                    },
                    'lavender-bouquet': {
                        id: 'lavender-bouquet',
                        name: 'Lavender Bouquet',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ FLORAL BOUQUET MOMENT ✦',
                        cardSubtitleHi: '✦ महकते फूलों का तोहफा ✦',
                        badgeIcon: '🌸',
                        badgeBg: 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
                        cardBg: 'rgba(255, 255, 255, 0.82)',
                        cardBorder: 'rgba(255, 255, 255, 0.94)',
                        cardShadow: '0 24px 54px rgba(162, 28, 175, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        cardSubColor: '#86198f',
                        haloGradient: 'radial-gradient(circle, #e879f9 0%, #f3e8ff 60%, transparent 100%)',
                        decorLeft: '❧',
                        decorRight: '❧',
                        decorUnder: '♡',
                        bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 45%, #e9d5ff 100%)',
                        textColor: '#701a75',
                        titleColor: '#86198f',
                        pillBg: 'rgba(255, 255, 255, 0.62)',
                        pillBorder: 'rgba(255, 255, 255, 0.88)',
                        pillShadow: '0 16px 36px rgba(162, 28, 175, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        numColor: '#701a75',
                        colonColor: '#c026d3',
                        labelColor: '#86198f',
                        defaultMedia: '/assets/media/countdown/theme-bouquet.jpg',
                        confettiColors: ['#e879f9', '#c026d3', '#a21caf', '#ffffff', '#f472b6'],
                        particleEmoji: ['🌸', '🦋', '💐', '✨', '💜']
                    },
                    'sunset-cat': {
                        id: 'sunset-cat',
                        name: 'Sunset Kitten',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ GOLDEN SUNSET MAGIC ✦',
                        cardSubtitleHi: '✦ सुनहरी शाम का जादू ✦',
                        badgeIcon: '☀️',
                        badgeBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        cardBg: 'rgba(255, 255, 255, 0.84)',
                        cardBorder: 'rgba(255, 255, 255, 0.95)',
                        cardShadow: '0 24px 54px rgba(234, 88, 12, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        cardSubColor: '#c2410c',
                        haloGradient: 'radial-gradient(circle, #fb923c 0%, #fed7aa 60%, transparent 100%)',
                        decorLeft: '♡',
                        decorRight: '♡',
                        decorUnder: '♡',
                        bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 35%, #fed7aa 70%, #fecdd3 100%)',
                        textColor: '#9a3412',
                        titleColor: '#c2410c',
                        pillBg: 'rgba(255, 255, 255, 0.64)',
                        pillBorder: 'rgba(255, 255, 255, 0.88)',
                        pillShadow: '0 16px 36px rgba(234, 88, 12, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        numColor: '#9a3412',
                        colonColor: '#ea580c',
                        labelColor: '#c2410c',
                        defaultMedia: '/assets/media/countdown/theme-sunset-cat.jpg',
                        confettiColors: ['#fb7185', '#f43f5e', '#fb923c', '#ffffff', '#fde047'],
                        particleEmoji: ['🐾', '☀️', '☁️', '🧡', '✨']
                    },
                    'midnight-stars': {
                        id: 'midnight-stars',
                        name: 'Midnight Celestial',
                        titleEn: 'The Surprise Begins In',
                        titleHi: 'सरप्राइज खुलने में...',
                        cardSubtitleEn: '✦ MIDNIGHT CELESTIAL MAGIC ✦',
                        cardSubtitleHi: '✦ मिडनाइट सेलेस्टियल मैजिक ✦',
                        badgeIcon: '🌙',
                        badgeBg: 'linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)',
                        cardBg: 'rgba(18, 24, 54, 0.74)',
                        cardBorder: 'rgba(255, 255, 255, 0.32)',
                        cardShadow: '0 24px 56px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.28)',
                        cardSubColor: '#facc15',
                        haloGradient: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(129, 140, 248, 0.15) 50%, transparent 100%)',
                        decorLeft: '★',
                        decorRight: '★',
                        decorUnder: '★',
                        bgGradient: 'radial-gradient(ellipse at top, #141b3d 0%, #0a0d24 60%, #030511 100%)',
                        textColor: '#f8fafc',
                        titleColor: '#f1f5f9',
                        pillBg: 'rgba(255, 255, 255, 0.12)',
                        pillBorder: 'rgba(255, 255, 255, 0.32)',
                        pillShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
                        numColor: '#ffffff',
                        colonColor: '#facc15',
                        labelColor: '#cbd5e1',
                        defaultMedia: '/assets/media/countdown/theme-midnight.jpg',
                        confettiColors: ['#facc15', '#38bdf8', '#818cf8', '#ffffff', '#c084fc'],
                        particleEmoji: ['⭐', '🌟', '🌙', '✨', '💫']
                    }
                };

                let mediaSource = (mediaUrl !== undefined && mediaUrl !== '') ? mediaUrl : ((typeof images === 'string' && images) ? images : (images && images.length ? images[0] : '')) || (typeof customText === 'object' ? customText.mediaUrl : '') || (typeof audio === 'string' && (audio.endsWith('.webm') || audio.endsWith('.png') || audio.endsWith('.jpg') || audio.endsWith('.mp4') || audio.endsWith('.webp')) ? audio : '') || '';
                if (mediaSource === 'none' || mediaSource === 'null' || mediaSource === false) {
                    mediaSource = '';
                }

                // Detect selected theme
                let selectedTheme = THEMES['romantic-couple'];
                const mediaStr = String(mediaSource || '');
                const isNone = (mediaSource === 'none' || mediaUrl === 'none');
                if (mediaStr.includes('bear')) selectedTheme = THEMES['birthday-bear'];
                else if (mediaStr.includes('star-cat') || mediaStr.includes('star_cat')) selectedTheme = THEMES['star-kitten'];
                else if (mediaStr.includes('bouquet')) selectedTheme = THEMES['lavender-bouquet'];
                else if (mediaStr.includes('sunset')) selectedTheme = THEMES['sunset-cat'];
                else if (mediaStr.includes('midnight')) selectedTheme = THEMES['midnight-stars'];
                else if (mediaStr.includes('couple')) selectedTheme = THEMES['romantic-couple'];
                else if (mediaStr.match(/\.(webm|mp4|mov)$/i) || isNone || mediaStr.includes('10000098') || mediaStr.includes('3565')) selectedTheme = THEMES['midnight-stars'];

                // Detect custom title override
                let headerText = '';
                if (typeof customText === 'object' && customText && customText.title) {
                    headerText = String(customText.title).trim();
                } else if (typeof customEmoji === 'string' && customEmoji.trim()) {
                    headerText = customEmoji.trim();
                } else if (w?.customData?.get?.('countdown')?.title) {
                    headerText = String(w.customData.get('countdown').title).trim();
                } else if (typeof window !== 'undefined' && window.customData?.get?.('countdown')?.title) {
                    headerText = String(window.customData.get('countdown').title).trim();
                } else if (w?.parent?.customData?.get?.('countdown')?.title) {
                    headerText = String(w.parent.customData.get('countdown').title).trim();
                } else if (typeof window !== 'undefined' && window.parent?.customData?.get?.('countdown')?.title) {
                    headerText = String(window.parent.customData.get('countdown').title).trim();
                } else if (d?.defaultView?.parent?.customData?.get?.('countdown')?.title) {
                    headerText = String(d.defaultView.parent.customData.get('countdown').title).trim();
                } else if (d?.defaultView?.customData?.get?.('countdown')?.title) {
                    headerText = String(d.defaultView.customData.get('countdown').title).trim();
                }
                const isHi = (window.currentLang === 'hi' || w?.currentLang === 'hi' || (typeof window !== 'undefined' && window.parent?.currentLang === 'hi'));
                if (!headerText) {
                    headerText = isHi ? selectedTheme.titleHi : selectedTheme.titleEn;
                }

                const overlay = d.createElement("div");
                overlay.id = "magic-countdown-overlay";
                overlay.style.cssText = `position:fixed; inset:0; background:${selectedTheme.bgGradient}; z-index:2147483650; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:${selectedTheme.textColor}; backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); transition:opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1); padding: clamp(14px, 2.5vh, 28px) clamp(16px, 3vw, 32px); box-sizing:border-box; overflow-y:auto; overflow-x:hidden;`;

                // Add style tag for keyframes and responsive rules
                const style = d.createElement('style');
                style.innerHTML = `
                    @keyframes floatDecor {
                        0%, 100% { transform: translateY(0) scale(1); }
                        50% { transform: translateY(-7px) scale(1.015); }
                    }
                    @keyframes floatCard {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-7px); }
                    }
                    @keyframes floatAmbient {
                        0% { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; }
                        20% { opacity: 0.7; }
                        80% { opacity: 0.7; }
                        100% { transform: translateY(-110vh) rotate(360deg) scale(1.1); opacity: 0; }
                    }
                    @keyframes pulseHeart {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.22); }
                    }
                    .magic-countdown-content-wrap {
                        position: relative;
                        z-index: 2;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        max-width: 520px;
                        margin: auto;
                        box-sizing: border-box;
                    }
                    .magic-countdown-stage-left {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                        flex-shrink: 0;
                    }
                    .magic-countdown-stage-right {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        text-align: center;
                        flex: 1 1 auto;
                    }
                    .magic-countdown-arch-card {
                        will-change: transform;
                    }
                    .magic-countdown-video-wrap {
                        will-change: transform;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        margin-bottom: clamp(10px, 1.8vh, 18px);
                    }
                    .magic-countdown-frameless-video {
                        width: auto;
                        height: auto;
                        max-width: min(88vw, 320px);
                        max-height: clamp(220px, 40vh, 340px);
                        object-fit: contain;
                        pointer-events: none;
                        display: block;
                        filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.45));
                    }
                    .magic-countdown-pill:hover {
                        transform: translateY(-2px);
                    }
                    .magic-countdown-eyebrow {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        font-size: clamp(0.72rem, 1.2vw, 0.85rem);
                        font-weight: 700;
                        letter-spacing: 2.2px;
                        text-transform: uppercase;
                        color: ${selectedTheme.titleColor};
                        opacity: 0.88;
                        margin-bottom: clamp(6px, 1.2vh, 10px);
                    }
                    .magic-countdown-footer-note {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        font-size: clamp(0.75rem, 1.1vw, 0.9rem);
                        font-weight: 500;
                        letter-spacing: 0.4px;
                        color: ${selectedTheme.textColor};
                        opacity: 0.82;
                        text-align: center;
                        line-height: 1.4;
                    }

                    /* TABLET, LAPTOP & PC RESPONSIVE 2-SIDE VIEW (Scaled-up & Screen-Filling) */
                    @media (min-width: 650px) and (min-height: 420px) {
                        #magic-countdown-overlay {
                            padding: clamp(36px, 5vh, 68px) clamp(20px, 3.5vw, 60px) !important;
                            justify-content: center !important;
                        }
                        .magic-countdown-content-wrap {
                            flex-direction: row !important;
                            justify-content: center !important;
                            align-items: center !important;
                            max-width: 1320px !important;
                            gap: clamp(32px, 5.5vw, 88px) !important;
                            padding: clamp(14px, 2.5vw, 40px) !important;
                            margin: auto !important;
                        }
                        .magic-countdown-stage-left {
                            flex: 0 0 auto !important;
                            justify-content: flex-end !important;
                            align-items: center !important;
                            width: auto !important;
                        }
                        .magic-countdown-stage-left .magic-countdown-arch-card {
                            width: clamp(280px, 29vw, 460px) !important;
                            margin-bottom: 0 !important;
                        }
                        .magic-countdown-stage-left .magic-countdown-video-wrap {
                            margin-bottom: 0 !important;
                        }
                        .magic-countdown-stage-left .magic-countdown-frameless-video {
                            width: 100% !important;
                            max-width: clamp(320px, 33vw, 540px) !important;
                            max-height: clamp(320px, 55vh, 560px) !important;
                            filter: drop-shadow(0 20px 48px rgba(0, 0, 0, 0.55)) !important;
                        }
                        .magic-countdown-stage-right {
                            align-items: flex-start !important;
                            text-align: left !important;
                            max-width: clamp(420px, 50vw, 660px) !important;
                            width: auto !important;
                            flex: 1 1 auto !important;
                        }
                        .magic-countdown-eyebrow {
                            justify-content: flex-start !important;
                            text-align: left !important;
                            font-size: clamp(0.78rem, 1.1vw, 1.05rem) !important;
                            letter-spacing: 2.8px !important;
                            margin-bottom: clamp(10px, 1.6vh, 16px) !important;
                            gap: 10px !important;
                        }
                        .magic-countdown-title-wrap {
                            align-items: flex-start !important;
                            text-align: left !important;
                            margin-bottom: clamp(14px, 2.4vh, 26px) !important;
                        }
                        .magic-countdown-title-el {
                            justify-content: flex-start !important;
                            text-align: left !important;
                            font-size: clamp(2rem, 3.4vw, 3.8rem) !important;
                            gap: clamp(8px, 1.4vw, 16px) !important;
                            letter-spacing: -0.5px !important;
                        }
                        .magic-countdown-title-under {
                            margin: clamp(10px, 1.4vh, 16px) 0 0 0 !important;
                            width: clamp(64px, 10vw, 100px) !important;
                        }
                        .magic-countdown-pill {
                            margin-left: 0 !important;
                            margin-right: auto !important;
                            margin-top: clamp(16px, 2.5vh, 28px) !important;
                            margin-bottom: clamp(14px, 2vh, 22px) !important;
                            padding: clamp(14px, 2.2vh, 26px) clamp(24px, 3.6vw, 60px) !important;
                        }
                        .magic-countdown-stage-right .magic-countdown-unit-wrap {
                            min-width: clamp(66px, 11vw, 110px) !important;
                        }
                        .magic-countdown-stage-right .magic-countdown-num {
                            font-size: clamp(2.2rem, 4.5vw, 4.5rem) !important;
                        }
                        .magic-countdown-stage-right .magic-countdown-colon {
                            font-size: clamp(1.8rem, 3.6vw, 3.6rem) !important;
                            margin: 0 clamp(4px, 1.2vw, 12px) !important;
                        }
                        .magic-countdown-stage-right .magic-countdown-unit-lbl {
                            font-size: clamp(0.66rem, 1vw, 0.9rem) !important;
                            letter-spacing: 2px !important;
                            margin-top: 7px !important;
                        }
                        .magic-countdown-footer-note {
                            justify-content: flex-start !important;
                            text-align: left !important;
                            font-size: clamp(0.82rem, 1.15vw, 1.05rem) !important;
                            gap: 10px !important;
                            opacity: 0.85 !important;
                        }
                    }

                    /* SOLO CENTERED MODE (When No Art / None is selected) */
                    .magic-countdown-stage-right.magic-countdown-solo {
                        align-items: center !important;
                        text-align: center !important;
                        max-width: 680px !important;
                        margin: 0 auto !important;
                    }
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-eyebrow,
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-title-wrap,
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-title-el,
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-pill,
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-footer-note {
                        justify-content: center !important;
                        text-align: center !important;
                        margin-left: auto !important;
                        margin-right: auto !important;
                    }
                    .magic-countdown-stage-right.magic-countdown-solo .magic-countdown-title-under {
                        margin: 10px auto 0 !important;
                    }
                `;
                overlay.appendChild(style);

                // Ambient floating particle layer
                const particleBox = d.createElement('div');
                particleBox.style.cssText = "position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0;";
                for (let i = 0; i < 14; i++) {
                    const p = d.createElement('span');
                    const em = selectedTheme.particleEmoji[Math.floor(Math.random() * selectedTheme.particleEmoji.length)];
                    p.innerText = em;
                    const size = Math.random() * 14 + 14;
                    const left = Math.random() * 94 + 3;
                    const dur = Math.random() * 6 + 6;
                    const delay = Math.random() * 5;
                    p.style.cssText = `position:absolute; left:${left}%; bottom:-40px; font-size:${size}px; opacity:0; animation: floatAmbient ${dur}s ease-in-out infinite ${delay}s; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.08));`;
                    particleBox.appendChild(p);
                }
                overlay.appendChild(particleBox);

                // Content wrapper for layering above particles
                const contentWrap = d.createElement('div');
                contentWrap.className = 'magic-countdown-content-wrap';
                overlay.appendChild(contentWrap);

                const stageLeft = d.createElement('div');
                stageLeft.className = 'magic-countdown-stage-left';

                const stageRight = d.createElement('div');
                stageRight.className = 'magic-countdown-stage-right';

                // Audio elements
                const unlockAudio = d.createElement('audio');
                unlockAudio.src = '/assets/sounds/unlocked.mp3';
                unlockAudio.volume = 0.5;
                overlay.appendChild(unlockAudio);

                // Web Audio tick sound for last 10 seconds
                const playTickSound = () => {
                    try {
                        const AudioCtx = window.AudioContext || window.webkitAudioContext;
                        if (!AudioCtx) return;
                        if (!window._countdownAudioCtx) {
                            window._countdownAudioCtx = new AudioCtx();
                        }
                        const ctx = window._countdownAudioCtx;
                        if (ctx.state === 'suspended') ctx.resume();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(800, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
                        gain.gain.setValueAtTime(0.12, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.045);
                    } catch(e) {}
                };

                // Media Presentation (Frameless for Videos, Luxury Arched Card for Images)
                let mediaStage = null;
                const activeMedia = mediaSource || selectedTheme.defaultMedia;
                const isVideo = Boolean(activeMedia && activeMedia.match(/\.(webm|mp4|mov)$/i));

                if (!isNone && activeMedia) {
                    if (isVideo) {
                        // Frameless video presentation so animated stickers and videos float freely & fully without frame clipping
                        mediaStage = d.createElement("div");
                        mediaStage.className = "magic-countdown-video-wrap";
                        mediaStage.style.cssText = "position:relative; display:flex; align-items:center; justify-content:center; animation:floatCard 4.6s ease-in-out infinite; box-sizing:border-box; flex-shrink:0;";

                        // Ambient theme-tinted glowing halo behind video
                        const halo = d.createElement("div");
                        halo.className = "magic-countdown-video-halo";
                        halo.style.cssText = `position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; height:90%; border-radius:50%; filter:blur(44px); opacity:0.6; pointer-events:none; z-index:-1; background:${selectedTheme.haloGradient};`;
                        mediaStage.appendChild(halo);

                        const vid = d.createElement('video');
                        vid.className = "magic-countdown-media magic-countdown-frameless-video";
                        vid.src = activeMedia;
                        vid.autoplay = true;
                        vid.loop = true;
                        vid.muted = true;
                        vid.setAttribute('playsinline', '');
                        vid.setAttribute('preload', 'auto');
                        mediaStage.appendChild(vid);

                        stageLeft.appendChild(mediaStage);
                        contentWrap.appendChild(stageLeft);
                    } else {
                        // Luxury Arched Invitation Card for static images/illustrations
                        mediaStage = d.createElement("div");
                        mediaStage.className = "magic-countdown-arch-card";
                        mediaStage.style.cssText = `position:relative; width:min(86vw, clamp(250px, 44vh, 340px)); padding:clamp(7px, 1.2vw, 10px); padding-bottom:clamp(12px, 1.6vh, 16px); border-radius:999px 999px 24px 24px; background:${selectedTheme.cardBg}; backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%); border:2px solid ${selectedTheme.cardBorder}; box-shadow:${selectedTheme.cardShadow}; animation:floatCard 4.6s ease-in-out infinite; margin-bottom:clamp(8px, 1.4vh, 14px); display:flex; flex-direction:column; align-items:center; justify-content:center; box-sizing:border-box; flex-shrink:0;`;

                        // Ambient theme-tinted glowing halo behind card
                        const halo = d.createElement("div");
                        halo.className = "magic-countdown-card-halo";
                        halo.style.cssText = `position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:92%; height:92%; border-radius:50%; filter:blur(36px); opacity:0.65; pointer-events:none; z-index:-1; background:${selectedTheme.haloGradient};`;
                        mediaStage.appendChild(halo);

                        // Top Apex Badge Pin
                        const badge = d.createElement("div");
                        badge.className = "magic-countdown-arch-badge";
                        badge.style.cssText = `position:absolute; top:-14px; left:50%; transform:translateX(-50%); width:32px; height:32px; border-radius:50%; background:${selectedTheme.badgeBg}; border:2.5px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.18); display:flex; align-items:center; justify-content:center; font-size:15px; z-index:5;`;
                        badge.innerHTML = `<span>${selectedTheme.badgeIcon}</span>`;
                        mediaStage.appendChild(badge);

                        // Inner Arched Media Window (1:1 aspect ratio)
                        const windowBox = d.createElement("div");
                        windowBox.className = "magic-countdown-arch-window";
                        windowBox.style.cssText = `width:100%; aspect-ratio:1 / 1; border-radius:999px 999px 16px 16px; overflow:hidden; border:1px solid rgba(255, 255, 255, 0.65); box-shadow:inset 0 2px 8px rgba(0,0,0,0.06); margin-bottom:clamp(8px, 1.2vh, 11px); display:flex; align-items:center; justify-content:center; position:relative; background:rgba(0,0,0,0.03);`;

                        const img = d.createElement('img');
                        img.className = "magic-countdown-media";
                        img.src = activeMedia;
                        img.alt = selectedTheme.name;
                        img.style.cssText = "width:100%; height:100%; object-fit:cover; object-position:center center; pointer-events:none; display:block;";
                        windowBox.appendChild(img);
                        mediaStage.appendChild(windowBox);

                        // Bottom Card Subtitle Ribbon
                        const subtitle = d.createElement("div");
                        subtitle.className = "magic-countdown-arch-subtitle";
                        subtitle.style.cssText = `font-size:clamp(0.66rem, 1.4vw, 0.76rem); font-weight:700; letter-spacing:clamp(1px, 0.2vw, 1.6px); text-transform:uppercase; color:${selectedTheme.cardSubColor}; opacity:0.92; display:flex; align-items:center; justify-content:center; gap:6px; text-align:center; line-height:1.2; margin-top:2px;`;
                        subtitle.innerText = isHi ? selectedTheme.cardSubtitleHi : selectedTheme.cardSubtitleEn;
                        mediaStage.appendChild(subtitle);

                        stageLeft.appendChild(mediaStage);
                        contentWrap.appendChild(stageLeft);
                    }
                } else {
                    stageRight.classList.add('magic-countdown-solo');
                }

                // Eyebrow tag above title on right side
                const eyebrow = d.createElement('div');
                eyebrow.className = "magic-countdown-eyebrow";
                eyebrow.innerHTML = `<span>✨</span><span>${isHi ? 'जादुई काउंटडाउन' : 'SURPRISE COUNTDOWN'}</span><span>✨</span>`;
                stageRight.appendChild(eyebrow);

                // Title section matching reference images
                const titleWrap = d.createElement('div');
                titleWrap.className = "magic-countdown-title-wrap";
                titleWrap.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: clamp(14px, 2.5vh, 22px); flex-shrink: 0; text-align: center;";

                const titleEl = d.createElement('div');
                titleEl.className = "magic-countdown-title-el";
                titleEl.style.cssText = `font-size: clamp(1.35rem, 3.8vw, 2.3rem); font-weight: 700; color: ${selectedTheme.titleColor}; display: flex; align-items: center; justify-content: center; gap: clamp(6px, 1.5vw, 12px); letter-spacing: -0.3px; line-height: 1.2; text-shadow: 0 2px 10px rgba(0,0,0,0.06);`;
                titleEl.innerHTML = `<span style="font-size: 0.85em; opacity: 0.85; animation: pulseHeart 2s infinite ease-in-out;">${selectedTheme.decorLeft}</span> <span class="magic-countdown-title-text">${headerText}</span> <span style="font-size: 0.85em; opacity: 0.85; animation: pulseHeart 2s infinite ease-in-out;">${selectedTheme.decorRight}</span>`;

                const titleUnder = d.createElement('div');
                titleUnder.className = "magic-countdown-title-under";
                titleUnder.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 8px; width: clamp(48px, 10vw, 76px); height: 1.5px; background: ${selectedTheme.titleColor}; opacity: 0.35; margin: 8px auto 0; position: relative;`;
                titleUnder.innerHTML = `<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: transparent; font-size: 0.7rem; color: ${selectedTheme.titleColor}; opacity: 0.9;">${selectedTheme.decorUnder}</span>`;

                titleWrap.appendChild(titleEl);
                titleWrap.appendChild(titleUnder);
                stageRight.appendChild(titleWrap);

                // Glassmorphism Capsule Pill Countdown
                const pillContainer = d.createElement('div');
                pillContainer.className = "magic-countdown-pill";
                pillContainer.style.cssText = `display: flex; align-items: center; justify-content: center; background: ${selectedTheme.pillBg}; backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); border: 1.5px solid ${selectedTheme.pillBorder}; box-shadow: ${selectedTheme.pillShadow}; border-radius: 999px; padding: clamp(12px, 2vh, 18px) clamp(20px, 4vw, 44px); width: auto; max-width: min(94vw, 560px); box-sizing: border-box; margin-bottom: clamp(16px, 2.5vh, 24px); flex-shrink: 0; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;`;
                stageRight.appendChild(pillContainer);

                // Reassuring footer note
                const footerNote = d.createElement('div');
                footerNote.className = "magic-countdown-footer-note";
                footerNote.innerHTML = `<span>✦</span><span>${isHi ? 'समय समाप्त होते ही आपका सरप्राइज अनलॉक हो जाएगा' : 'Unlocks automatically when the countdown reaches zero'}</span><span>✦</span>`;
                stageRight.appendChild(footerNote);

                contentWrap.appendChild(stageRight);

                // Function to build unit
                const createUnit = (label) => {
                    const wrap = d.createElement('div');
                    wrap.className = "magic-countdown-unit-wrap";
                    wrap.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: clamp(52px, 14vw, 84px);";
                    const num = d.createElement('div');
                    num.className = "magic-countdown-num";
                    num.style.cssText = `font-size: clamp(1.8rem, 5.2vw, 3.2rem); font-weight: 800; line-height: 1; color: ${selectedTheme.numColor}; font-family: 'Outfit', sans-serif; font-variant-numeric: tabular-nums; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);`;
                    num.innerText = "00";
                    const lbl = d.createElement('div');
                    lbl.className = "magic-countdown-unit-lbl";
                    lbl.style.cssText = `font-size: clamp(0.55rem, 1.3vw, 0.72rem); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${selectedTheme.labelColor}; opacity: 0.85; margin-top: 5px; line-height: 1;`;
                    lbl.innerText = label;
                    wrap.appendChild(num);
                    wrap.appendChild(lbl);
                    return { wrap, num, lbl };
                };

                const createColon = () => {
                    const col = d.createElement('div');
                    col.className = "magic-countdown-colon";
                    col.style.cssText = `font-size: clamp(1.6rem, 4.5vw, 2.6rem); font-weight: 700; color: ${selectedTheme.colonColor}; margin: 0 clamp(2px, 1.2vw, 8px); transform: translateY(-6px); line-height: 1; user-select: none;`;
                    col.innerText = ":";
                    return col;
                };

                let currentLayoutWithDays = null;
                let daysUnit, hoursUnit, minutesUnit, secondsUnit;

                const setupPillLayout = (includeDays) => {
                    pillContainer.innerHTML = '';
                    currentLayoutWithDays = includeDays;
                    if (includeDays) {
                        daysUnit = createUnit(isHi ? "दिन" : "Days");
                        pillContainer.appendChild(daysUnit.wrap);
                        pillContainer.appendChild(createColon());
                    } else {
                        daysUnit = null;
                    }

                    hoursUnit = createUnit(isHi ? "घंटे" : "Hours");
                    pillContainer.appendChild(hoursUnit.wrap);
                    pillContainer.appendChild(createColon());

                    minutesUnit = createUnit(isHi ? "मिनट" : "Minutes");
                    pillContainer.appendChild(minutesUnit.wrap);
                    pillContainer.appendChild(createColon());

                    secondsUnit = createUnit(isHi ? "सेकंड" : "Seconds");
                    pillContainer.appendChild(secondsUnit.wrap);
                };

                d.body.appendChild(overlay);

                const updateValue = (unitObj, val) => {
                    if (!unitObj || !unitObj.num) return;
                    const strVal = val.toString().padStart(2, '0');
                    if (unitObj.num.innerText !== strVal) {
                        unitObj.num.innerText = strVal;
                        unitObj.num.style.transform = "scale(1.12)";
                        setTimeout(() => { if (unitObj.num) unitObj.num.style.transform = "scale(1)"; }, 180);
                    }
                };

                let isUnlocking = false;

                const updateTimer = () => {
                    if (isUnlocking) return;
                    const currentTime = Date.now();
                    const diff = targetTime - currentTime;

                    if (diff <= 0) {
                        isUnlocking = true;
                        clearInterval(intervalId);

                        // Trigger tick and scale effect
                        pillContainer.style.transform = "scale(1.15)";
                        pillContainer.style.opacity = "0";
                        pillContainer.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
                        if (mediaStage) {
                            mediaStage.style.transform = "scale(1.15)";
                            mediaStage.style.opacity = "0";
                            mediaStage.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
                        }
                        if (stageRight) {
                            stageRight.style.transform = "scale(1.15)";
                            stageRight.style.opacity = "0";
                            stageRight.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
                        }

                        if (typeof confetti === 'function') {
                            try {
                                confetti({
                                    particleCount: 120,
                                    spread: 80,
                                    origin: { y: 0.6 },
                                    colors: selectedTheme.confettiColors
                                });
                            } catch(e) {}
                        }

                        unlockAudio.play().catch(e => console.log('Countdown unlock audio failed:', e));

                        setTimeout(() => {
                            overlay.style.opacity = '0';
                            setTimeout(() => {
                                overlay.remove();
                                if (w) w.countdownFinished = true;
                                window.countdownFinished = true;
                                try { if (w && typeof w.dispatchEvent === 'function') w.dispatchEvent(new CustomEvent('countdownFinished')); } catch (e) { }
                                try { if (typeof window !== 'undefined' && window !== w) window.dispatchEvent(new CustomEvent('countdownFinished')); } catch (e) { }
                                try { if (d && typeof d.dispatchEvent === 'function') d.dispatchEvent(new CustomEvent('countdownFinished')); } catch (e) { }
                            }, 800);
                        }, 500);
                        return;
                    }

                    // Sound on last 10 seconds
                    if (diff <= 10000 && diff > 0) {
                        playTickSound();
                        pillContainer.style.transform = "scale(1.025)";
                        setTimeout(() => { pillContainer.style.transform = "scale(1)"; }, 220);
                    }

                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    const needDays = days > 0;
                    if (currentLayoutWithDays !== needDays) {
                        setupPillLayout(needDays);
                    }

                    if (needDays && daysUnit) {
                        updateValue(daysUnit, days);
                    }
                    updateValue(hoursUnit, hours);
                    updateValue(minutesUnit, minutes);
                    updateValue(secondsUnit, seconds);
                };

                updateTimer();
                const intervalId = setInterval(updateTimer, 1000);
                overlay._timerInterval = intervalId;
                return { cleanup: () => { clearInterval(intervalId); overlay.remove(); } };
            },
            disable(d) {
                const overlay = d?.getElementById("magic-countdown-overlay");
                if (overlay && overlay._timerInterval) clearInterval(overlay._timerInterval);
                overlay?.remove();
            }
        },

        addMusicSection: {
            enable(d, w, userName, customText, spotifyEmbedUrl, youtubeEmbedUrl, instagramEmbedUrl) {
                if (typeof injectFontsIfNeeded === 'function') injectFontsIfNeeded(d);

                let section = d.getElementById("magic-music-section");
                const fallbackMusicTrack = "https://www.youtube.com/embed/nl62hhiBMOM?autoplay=0";
                const embedUrl = spotifyEmbedUrl || youtubeEmbedUrl || instagramEmbedUrl || (typeof window !== "undefined" && window.__IS_GENERATED_PAGE__ ? fallbackMusicTrack : "");

                if (!section) {
                    section = d.createElement("section");
                    section.id = "magic-music-section";
                    section.style.cssText = "padding: clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px); text-align: center; background: linear-gradient(145deg, rgba(123,93,246,0.08), rgba(255,122,47,0.06)); border-radius: clamp(24px, 3vw, 36px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 580px; box-sizing: border-box; align-self: center;";

                    const title = d.createElement("h2");
                    title.innerText = "\uD83C\uDFB5 " + (window.currentLang === 'hi' ? "\u0917\u093E\u0928\u093E" : "Music For You");
                    title.style.fontFamily = "'Great Vibes', cursive";
                    title.style.fontSize = "clamp(1.8rem, 3vw, 2.4rem)";
                    title.style.color = "#7b5df6";
                    section.appendChild(title);

                    insertSectionBeforeFinal(d, section);
                }

                const isInstagram = !!(instagramEmbedUrl && instagramEmbedUrl.includes('instagram.com'));
                const embedWrap = d.createElement("div");
                embedWrap.id = "magic-music-embed";
                if (isInstagram) {
                    embedWrap.style.cssText = "width: 100%; max-width: 360px; margin: 16px auto; border-radius: 12px; overflow: visible; box-shadow: 0 12px 32px rgba(0,0,0,0.14); aspect-ratio: 9 / 16; position: relative;";
                } else {
                    embedWrap.style.cssText = "width: 100%; max-width: 480px; margin: 16px auto; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.14); aspect-ratio: 16 / 9; position: relative;";
                }

                const isHindi = (window.currentLang === 'hi' || (w && w.currentLang === 'hi') || (w && w.parent && w.parent.currentLang === 'hi'));

                function triggerMusicSelection(e) {
                    if (e) {
                        try { if (typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) { }
                        try { if (typeof e.stopPropagation === 'function') e.stopPropagation(); } catch (_) { }
                    }
                    if (w && w.parent && typeof w.parent.openMusicModal === 'function') {
                        w.parent.openMusicModal();
                        return;
                    }
                    if (w && typeof w.openMusicModal === 'function') {
                        w.openMusicModal();
                        return;
                    }
                    try {
                        const parentDoc = (w && w.parent) ? w.parent.document : null;
                        if (parentDoc) {
                            const plusBtn = parentDoc.querySelector('#toggle-addMusicSection .plus-icon') || parentDoc.querySelector('.toggle-row#toggle-addMusicSection .plus-icon');
                            if (plusBtn) {
                                plusBtn.click();
                                return;
                            }
                            const musicModal = parentDoc.getElementById('musicModal');
                            if (musicModal) {
                                const toggleRow = parentDoc.getElementById('toggle-addMusicSection');
                                if (toggleRow && !toggleRow.classList.contains('active')) {
                                    toggleRow.click();
                                }
                                const sInput = parentDoc.getElementById('musicSearchInput');
                                const lInput = parentDoc.getElementById('musicLinkInput');
                                const rBox = parentDoc.getElementById('musicResults');
                                const stBox = parentDoc.getElementById('musicStatus');
                                if (sInput) sInput.value = '';
                                if (lInput) lInput.value = '';
                                if (rBox) rBox.innerHTML = '';
                                if (stBox) stBox.textContent = '';
                                musicModal.classList.add('show');
                                return;
                            }
                        }
                    } catch (err) { }
                    try {
                        if (w && w.parent && w.parent !== w) {
                            w.parent.postMessage({ type: 'openMusicModal' }, '*');
                        }
                    } catch (err) { }
                }

                if (embedUrl) {
                    let finalEmbedUrl = embedUrl;
                    if (typeof finalEmbedUrl === 'string' && (finalEmbedUrl.includes('youtube.com/embed/') || finalEmbedUrl.includes('youtube-nocookie.com/embed/'))) {
                        const hasQuery = finalEmbedUrl.includes('?');
                        if (!finalEmbedUrl.includes('enablejsapi=1')) {
                            finalEmbedUrl += (hasQuery ? '&' : '?') + 'enablejsapi=1';
                        }
                    }
                    const iframe = d.createElement("iframe");
                    iframe.id = "magic-music-iframe";
                    iframe.src = finalEmbedUrl;
                    iframe.style.cssText = "width: 100%; height: 100%; border: none; border-radius: 24px;";
                    iframe.allow = "autoplay; encrypted-media; fullscreen";
                    iframe.setAttribute("allowfullscreen", "");
                    iframe.loading = "lazy";
                    embedWrap.appendChild(iframe);

                    // Notify YouTube player to broadcast playback state changes
                    const sendYtListening = () => {
                        try {
                            if (iframe.contentWindow) {
                                iframe.contentWindow.postMessage('{"event":"listening"}', '*');
                                iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                            }
                        } catch (e) { }
                    };
                    iframe.onload = () => {
                        sendYtListening();
                        setTimeout(sendYtListening, 800);
                        setTimeout(sendYtListening, 2000);
                    };

                    const isEditMode = !w.__IS_GENERATED_PAGE__ && (!w.parent || !w.parent.__IS_GENERATED_PAGE__) && (w.location.search.includes("mode=edit") || d.body.classList.contains("edit-mode") || (w.parent && w.parent !== w));
                    if (isEditMode) {
                        const changeBtn = d.createElement("button");
                        changeBtn.className = "magic-music-change-btn";
                        changeBtn.type = "button";
                        changeBtn.innerHTML = isHindi ? '<span style="font-size:1rem;">🎵</span> गाना बदलें' : '<span style="font-size:1rem;">🎵</span> Change Music';
                        changeBtn.style.cssText = "position: absolute; top: 12px; right: 12px; z-index: 10; background: rgba(20,20,35,0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #ffffff; border: 1px solid rgba(255,255,255,0.3); border-radius: 50px; padding: 7px 16px; font-size: 0.85rem; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.35); transition: all 0.2s ease; pointer-events: auto;";
                        changeBtn.onmouseover = () => { changeBtn.style.transform = "scale(1.05)"; changeBtn.style.background = "linear-gradient(135deg, #7b5df6, #ff7a2f)"; };
                        changeBtn.onmouseout = () => { changeBtn.style.transform = "scale(1)"; changeBtn.style.background = "rgba(20,20,35,0.85)"; };
                        changeBtn.onclick = (e) => triggerMusicSelection(e);
                        embedWrap.appendChild(changeBtn);
                    }
                } else {
                    const placeholder = d.createElement("div");
                    placeholder.className = "magic-music-placeholder";
                    placeholder.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 220px; background: linear-gradient(135deg, rgba(123,93,246,0.06), rgba(255,122,47,0.05)); color: var(--text-secondary,#4a3b66); font-size: 1.05rem; border-radius: 24px; border: 2px dashed rgba(123,93,246,0.3); padding: 32px 20px; box-sizing: border-box; text-align: center; gap: 16px; position: relative; cursor: pointer; transition: all 0.25s ease;";

                    const msgPara = d.createElement("p");
                    msgPara.style.cssText = "margin: 0; font-size: 1.05rem; font-weight: 500; color: var(--text-secondary,#5d4e75); font-family: 'Outfit', sans-serif; pointer-events: none;";
                    msgPara.innerText = isHindi ? "कृपया कस्टमर या नीचे दिए गए बटन से गाना जोड़ें" : "Please add music from the customizer";

                    const selectBtn = d.createElement("button");
                    selectBtn.className = "magic-music-select-btn";
                    selectBtn.type = "button";
                    selectBtn.innerHTML = isHindi ? '<span style="font-size:1.15rem;">➕</span> 🎵 गाना चुनें (Select Music)' : '<span style="font-size:1.15rem;">➕</span> 🎵 Select Music';
                    selectBtn.style.cssText = "background: linear-gradient(135deg, #7b5df6 0%, #ff7a2f 100%); color: #ffffff; border: none; border-radius: 50px; padding: 12px 28px; font-size: 1rem; font-weight: 700; font-family: 'Outfit', sans-serif; cursor: pointer; box-shadow: 0 8px 24px rgba(123,93,246,0.35); display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s ease, box-shadow 0.2s ease; pointer-events: auto;";

                    selectBtn.onmouseover = () => {
                        selectBtn.style.transform = "scale(1.06) translateY(-2px)";
                        selectBtn.style.boxShadow = "0 12px 28px rgba(123,93,246,0.55)";
                    };
                    selectBtn.onmouseout = () => {
                        selectBtn.style.transform = "scale(1) translateY(0)";
                        selectBtn.style.boxShadow = "0 8px 24px rgba(123,93,246,0.35)";
                    };
                    placeholder.onmouseover = () => {
                        placeholder.style.borderColor = "#7b5df6";
                        placeholder.style.background = "linear-gradient(135deg, rgba(123,93,246,0.1), rgba(255,122,47,0.08))";
                    };
                    placeholder.onmouseout = () => {
                        placeholder.style.borderColor = "rgba(123,93,246,0.3)";
                        placeholder.style.background = "linear-gradient(135deg, rgba(123,93,246,0.06), rgba(255,122,47,0.05))";
                    };

                    selectBtn.onclick = (e) => triggerMusicSelection(e);
                    placeholder.onclick = (e) => triggerMusicSelection(e);

                    placeholder.appendChild(msgPara);
                    placeholder.appendChild(selectBtn);
                    embedWrap.appendChild(placeholder);
                }

                const oldEmbed = section.querySelector("div[id='magic-music-embed']");
                if (oldEmbed) {
                    if (typeof oldEmbed.replaceWith === 'function') {
                        oldEmbed.replaceWith(embedWrap);
                    } else if (oldEmbed.parentNode) {
                        oldEmbed.parentNode.replaceChild(embedWrap, oldEmbed);
                    }
                } else {
                    section.appendChild(embedWrap);
                }
                scrollToElement(d, section);
                return {};
            },
            disable(d) {
                d?.getElementById("magic-music-section")?.remove();
            }
        },
        imageExplosion: {
            enable(d, w, userName, customText, images) {
                let section = d.getElementById("magic-image-explosion-section");
                const isEditMode = !w.__IS_GENERATED_PAGE__ && (!w.parent || !w.parent.__IS_GENERATED_PAGE__) && (w.location.search.includes("mode=edit") || d.body.classList.contains("edit-mode"));

                if (section) {
                    // Update existing image if any
                    const img = section.querySelector("img");
                    if (img) {
                        if (images && images.length > 0) {
                            img.src = images[0];
                            img.style.cssText = "width: auto; height: auto; max-width: 100%; max-height: 60vh; border: 3px solid #ff7a2f; border-radius: 24px;";
                            img.style.opacity = "1";
                        } else {
                            img.src = getRandomFallbackPngs(1)[0] || "/assets/media/1000009474.png";
                            img.style.cssText = "width: 100%; height: 100%; object-fit: contain; border: 3px solid #ff7a2f; border-radius: 24px; opacity: 0.9;";
                        }
                    }
                    const uploadBtn = section.querySelector('.upload-btn');
                    const removeBtn = section.querySelector('.remove-btn');
                    const container = section.querySelector('div[style*="text-align: center"]'); // Assuming it's the imageContainer
                    if (uploadBtn && removeBtn && container) {
                        if (isEditMode) {
                            if (images && images.length > 0) {
                                uploadBtn.style.display = 'none';
                                removeBtn.style.display = 'block';
                                container.style.background = 'transparent';
                            } else {
                                uploadBtn.style.display = 'block';
                                removeBtn.style.display = 'none';
                                container.style.background = 'rgba(255,255,255,0.1)';
                            }
                        } else {
                            uploadBtn.style.display = 'none';
                            removeBtn.style.display = 'none';
                            if (images && images.length > 0) {
                                container.style.background = 'transparent';
                            } else {
                                container.style.background = 'rgba(255,255,255,0.1)';
                            }
                        }
                    }
                    const p = section.querySelector("p");
                    if (p) p.innerText = customText || "";
                    scrollToElement(d, section);
                    return;
                }

                if (typeof injectFontsIfNeeded === 'function') injectFontsIfNeeded(d);

                section = d.createElement("section");
                section.id = "magic-image-explosion-section";
                section.style.cssText = "padding: clamp(24px, 3.5vw, 40px) clamp(16px, 2.5vw, 28px); text-align: center; background: radial-gradient(circle at center, rgba(255,122,47,0.05), transparent); border-radius: clamp(24px, 3vw, 36px); margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 680px; box-sizing: border-box; align-self: center; min-height: 450px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center;";

                const title = d.createElement("h2");
                title.innerText = "\u2728 " + (window.currentLang === 'hi' ? "\u092e\u0948\u091c\u093f\u0915 \u092b\u094b\u091f\u094b" : "Magic Photo") + " \u2728";
                title.style.fontFamily = "'Great Vibes', cursive";
                title.style.fontSize = "clamp(2.4rem, 4.5vw, 3.4rem)";
                title.style.color = "#ff7a2f";
                title.style.marginBottom = "30px";
                title.style.textShadow = "0 0 15px rgba(255,122,47,0.3)";
                section.appendChild(title);

                const imageContainer = d.createElement("div");
                imageContainer.style.cssText = "width: min(60vw, 300px); height: auto; background: rgba(255,255,255,0.1); text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative; min-height: 100px; transform: scale(0.7) translateY(60px) rotate(-5deg); opacity: 0; filter: blur(12px); transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1s ease-out, filter 1s ease-out;";

                const img = d.createElement("img");
                if (images && images.length > 0) {
                    img.src = images[0];
                    img.style.cssText = "width: auto; height: auto; max-width: 100%; max-height: 60vh; border: 3px solid #ff7a2f; border-radius: 24px;";
                } else {
                    img.src = getRandomFallbackPngs(1)[0] || "/assets/media/1000009474.png";
                    img.style.cssText = "width: 100%; height: 100%; object-fit: contain; border: 3px solid #ff7a2f; border-radius: 24px; opacity: 0.9;";
                }
                imageContainer.appendChild(img);

                const fileInput = d.createElement("input");
                fileInput.type = "file";
                fileInput.accept = "image/*";
                fileInput.style.display = "none";
                section.appendChild(fileInput);

                const uploadBtn = d.createElement("button");
                uploadBtn.className = "upload-btn";
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
                uploadBtn.style.cssText = "position: absolute; bottom: 10px; left: 10px; background: #ff7a2f; color: white; border: none; padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; cursor: pointer; z-index: 10;";
                uploadBtn.onclick = () => fileInput.click();
                imageContainer.appendChild(uploadBtn);

                const removeBtn = d.createElement("button");
                removeBtn.className = "remove-btn";
                removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
                removeBtn.style.cssText = "position: absolute; bottom: 10px; right: 10px; background: #ff4da6; color: white; border: none; padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; cursor: pointer; z-index: 10;";
                removeBtn.onclick = () => {
                    img.src = "https://placehold.co/200x250/FFF9F0/5D4037?text=Upload+any+image+here";
                    img.style.cssText = "width: 100%; height: 100%; object-fit: contain; border: 3px solid #ff7a2f; border-radius: 24px; opacity: 0.6;";
                    uploadBtn.style.display = isEditMode ? 'block' : 'none';
                    removeBtn.style.display = 'none';
                    imageContainer.style.background = 'rgba(255,255,255,0.1)';
                    w.parent.postMessage({ type: 'removeImageExplosion' }, '*');
                };
                imageContainer.appendChild(removeBtn);

                // Initially set button visibility and background
                if (isEditMode) {
                    if (images && images.length > 0) {
                        uploadBtn.style.display = 'none';
                        removeBtn.style.display = 'block';
                        imageContainer.style.background = 'transparent';
                    } else {
                        uploadBtn.style.display = 'block';
                        removeBtn.style.display = 'none';
                        imageContainer.style.background = 'rgba(255,255,255,0.1)';
                    }
                } else {
                    uploadBtn.style.display = 'none';
                    removeBtn.style.display = 'none';
                    if (images && images.length > 0) {
                        imageContainer.style.background = 'transparent';
                    } else {
                        imageContainer.style.background = 'rgba(255,255,255,0.1)';
                    }
                }

                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 15 * 1024 * 1024) {
                            alert("Image exceeds limit. Please select an image under 15 MB.");
                            fileInput.value = "";
                            return;
                        }
                        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing & Uploading...';
                        uploadBtn.disabled = true;

                        const urlParams = new URLSearchParams(window.location.search);
                        const viewId = urlParams.get('view') || urlParams.get('restore') || (typeof currentViewId !== 'undefined' ? currentViewId : '');
                        const isPrem = !!(
                            window.isPremiumUser ||
                            window.isPremium ||
                            (typeof userDataObj !== 'undefined' && userDataObj && userDataObj.isPremium) ||
                            localStorage.getItem('isPremium') === 'true' ||
                            (viewId && localStorage.getItem(`premium_${viewId}`) === 'true') ||
                            localStorage.getItem('pendingPremiumForNextWebsite') === 'true' ||
                            urlParams.get('_v') === 'c'
                        );
                        if (isPrem) {
                            window.isPremiumUser = true;
                            window.isPremium = true;
                        }

                        let fileToUpload = file;
                        const compressor = (w.parent && typeof w.parent.compressImageIfNeeded === 'function')
                            ? w.parent.compressImageIfNeeded
                            : (typeof window.compressImageIfNeeded === 'function' ? window.compressImageIfNeeded : null);
                        if (compressor) {
                            try {
                                fileToUpload = await compressor(file, isPrem);
                            } catch (_) { }
                        }

                        const formData = new FormData();
                        formData.append('file', fileToUpload);
                        formData.append('isPremium', isPrem ? 'true' : 'false');

                        fetch('/api/upload-photo', {
                            method: 'POST',
                            body: formData
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.secure_url || data.url) {
                                    const finalUrl = data.secure_url || data.url;
                                    img.src = finalUrl;
                                    img.style.cssText = "width: auto; height: auto; max-width: 100%; max-height: 60vh; border: 3px solid #ff7a2f; border-radius: 24px;";
                                    img.style.opacity = "1";
                                    uploadBtn.style.display = 'none';
                                    removeBtn.style.display = isEditMode ? 'block' : 'none';
                                    imageContainer.style.background = 'transparent';

                                    w.parent.postMessage({ type: 'updateImageExplosion', image: finalUrl }, '*');
                                } else {
                                    throw new Error(data.error?.message || 'Upload failed');
                                }
                            })
                            .catch(err => {
                                console.error('Image upload failed:', err);
                                alert(window.currentLang === 'hi' ? 'छवि अपलोड विफल रही। कृपया पुनः प्रयास करें।' : 'Image upload failed. Please try again.');
                            })
                            .finally(() => {
                                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
                                uploadBtn.disabled = false;
                            });
                    }
                };
                section.appendChild(imageContainer);

                const p = d.createElement("p");
                p.innerText = customText || "";
                p.style.cssText = "margin-top: 20px; font-family: 'Poppins', sans-serif; font-size: 1.2rem; color: #5d4037; font-weight: 500; max-width: 80%; min-height: 1.2em;";
                section.appendChild(p);

                insertSectionBeforeFinal(d, section);
                scrollToElement(d, section);

                // Add crackers sound
                const crackersAudio = d.createElement('audio');
                crackersAudio.id = 'crackersAudio';
                crackersAudio.src = '/assets/sounds/crackers-mini.mp3';
                crackersAudio.volume = 0.6;
                crackersAudio.preload = 'auto';
                crackersAudio.style.display = 'none';
                d.body.appendChild(crackersAudio);

                let interval = null;
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        // Beautiful spring-loaded entrance style
                        imageContainer.style.transform = "scale(1.05) translateY(0) rotate(0deg)";
                        imageContainer.style.opacity = "1";
                        imageContainer.style.filter = "blur(0)";

                        // Play crackers sound
                        crackersAudio.currentTime = 0;
                        crackersAudio.play().catch(e => console.log('Crackers audio failed:', e));

                        // Trigger Firecrackers/Fireworks - use iframe window context
                        const confettiFn = w.confetti || w.canvasConfetti || window.confetti || window.canvasConfetti;
                        if (confettiFn) {
                            const duration = 5 * 1000;
                            const animationEnd = Date.now() + duration;
                            const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 9999 };

                            function randomInRange(min, max) { return Math.random() * (max - min) + min; }

                            if (interval) clearInterval(interval);
                            interval = setInterval(function () {
                                const timeLeft = animationEnd - Date.now();
                                if (timeLeft <= 0) {
                                    clearInterval(interval);
                                    interval = null;
                                    return;
                                }
                                // Increased particle counts for more attractive celebration
                                const particleCount = 120 * (timeLeft / duration);
                                confettiFn(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                                confettiFn(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                            }, 250);

                            // Additional massive "explosion" effect
                            setTimeout(() => {
                                confettiFn({
                                    particleCount: 300,
                                    spread: 100,
                                    origin: { y: 0.6 },
                                    zIndex: 9999
                                });
                            }, 500);
                        }
                    } else {
                        // Reset animation state when leaving viewport so it triggers again on scroll
                        imageContainer.style.transform = "scale(0.7) translateY(60px) rotate(-5deg)";
                        imageContainer.style.opacity = "0";
                        imageContainer.style.filter = "blur(12px)";
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }
                    }
                }, { threshold: 0.2 });
                observer.observe(section);

                const cleanup = () => {
                    observer.disconnect();
                    if (interval) {
                        clearInterval(interval);
                        interval = null;
                    }
                };
                section._cleanup = cleanup;

                return {
                    cleanup
                };
            },
            disable(d) {
                const sec = d?.getElementById("magic-image-explosion-section");
                if (sec && sec._cleanup) sec._cleanup();
                sec?.remove();
                const audio = d?.getElementById("crackersAudio");
                if (audio) {
                    audio.pause?.();
                    audio.remove();
                }
            }
        },
        namedBirthdayCard: {
            enable(d, w, userName, customText) {
                if (d.getElementById("magic-named-birthday-card-section")) return;

                if (!d.getElementById('magic-custom-fonts')) {
                    const link = d.createElement('link');
                    link.id = 'magic-custom-fonts';
                    link.rel = 'stylesheet';
                    link.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Outfit:wght@600;700;800;900&family=Poppins:wght@600;700;800&family=Caveat:wght@700&display=swap';
                    (d.head || d.body)?.appendChild(link);
                }

                if (!d.getElementById('magic-named-card-styles')) {
                    const style = d.createElement('style');
                    style.id = 'magic-named-card-styles';
                    style.textContent = `
                        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Outfit:wght@600;700;800;900&family=Caveat:wght@700&family=Poppins:wght@600;700;800&display=swap');

                        @keyframes namedCardFloat {
                            0%, 100% { transform: translateY(0) rotate(0deg); }
                            50% { transform: translateY(-8px) rotate(0.6deg); }
                        }
                        @keyframes namedCardBounce {
                            0% { transform: scale(1); }
                            30% { transform: scale(1.08) rotate(-2deg); }
                            60% { transform: scale(0.96) rotate(1deg); }
                            100% { transform: scale(1) rotate(0deg); }
                        }
                        @keyframes namedHeartPop {
                            0% { transform: scale(0) translateY(0); opacity: 1; }
                            100% { transform: scale(1.4) translateY(-60px) rotate(20deg); opacity: 0; }
                        }
                        @keyframes namedAuraPulse {
                            0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.75; }
                            100% { transform: translate(-50%, -50%) scale(1.18); opacity: 1; }
                        }
                        @keyframes namedSparkleFloat1 {
                            0%, 100% { transform: translateY(0) rotate(0deg) scale(0.95); opacity: 0.85; }
                            50% { transform: translateY(-7px) rotate(12deg) scale(1.15); opacity: 1; filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.9)); }
                        }
                        @keyframes namedSparkleFloat2 {
                            0%, 100% { transform: translateY(0) rotate(0deg) scale(0.95); opacity: 0.85; }
                            50% { transform: translateY(-6px) rotate(-10deg) scale(1.12); opacity: 1; filter: drop-shadow(0 0 6px rgba(255, 105, 180, 0.8)); }
                        }
                        @keyframes namedBadgePulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.04); }
                        }
                        @keyframes namedBadgeBounce {
                            0% { transform: scale(1); }
                            25% { transform: scale(0.88); }
                            50% { transform: scale(1.12); }
                            75% { transform: scale(0.96); }
                            100% { transform: scale(1); }
                        }
                        @keyframes namedCelebrationScatter {
                            0% {
                                transform: translate(0, 0) scale(0.2) rotate(0deg);
                                opacity: 1;
                                filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
                            }
                            45% {
                                opacity: 1;
                                transform: translate(calc(var(--tx) * 0.75), calc(var(--ty) * 0.75 - 25px)) scale(1.3) rotate(calc(var(--rot) * 0.5));
                            }
                            100% {
                                transform: translate(var(--tx), calc(var(--ty) + 40px)) scale(0.5) rotate(var(--rot));
                                opacity: 0;
                                filter: drop-shadow(0 0 12px rgba(255, 105, 180, 0));
                            }
                        }
                        @keyframes namedSparkleBurst {
                            0% {
                                transform: translate(0, 0) scale(0);
                                opacity: 1;
                            }
                            60% {
                                opacity: 1;
                                transform: translate(var(--stx), var(--sty)) scale(1.5);
                            }
                            100% {
                                transform: translate(calc(var(--stx) * 1.2), calc(var(--sty) * 1.2)) scale(0);
                                opacity: 0;
                            }
                        }
                        @keyframes namedShockwaveExpand {
                            0% {
                                transform: translate(-50%, -50%) scale(0.2);
                                opacity: 0.9;
                                border-width: 4px;
                            }
                            100% {
                                transform: translate(-50%, -50%) scale(2.4);
                                opacity: 0;
                                border-width: 1px;
                            }
                        }
                        .magic-named-card-bg-aura {
                            position: absolute;
                            top: 45%;
                            left: 50%;
                            width: 125%;
                            height: 125%;
                            transform: translate(-50%, -50%);
                            background: radial-gradient(circle, rgba(255, 215, 0, 0.26) 0%, rgba(255, 140, 185, 0.22) 38%, rgba(255, 220, 235, 0.08) 65%, transparent 75%);
                            pointer-events: none;
                            z-index: 0;
                            animation: namedAuraPulse 5s ease-in-out infinite alternate;
                        }
                        .magic-named-card-orb {
                            position: absolute;
                            border-radius: 50%;
                            pointer-events: none;
                            filter: blur(40px);
                            z-index: 0;
                            opacity: 0.6;
                        }
                        .magic-named-card-orb-1 {
                            width: 160px;
                            height: 160px;
                            background: rgba(255, 182, 193, 0.65);
                            top: -30px;
                            left: -30px;
                        }
                        .magic-named-card-orb-2 {
                            width: 170px;
                            height: 170px;
                            background: rgba(255, 220, 120, 0.6);
                            bottom: -30px;
                            right: -30px;
                        }
                        .magic-named-card-orb-3 {
                            width: 130px;
                            height: 130px;
                            background: rgba(180, 235, 255, 0.55);
                            top: 40%;
                            right: -25px;
                        }
                        .magic-named-card-wrap {
                            position: relative;
                            width: 100%;
                            max-width: 440px;
                            aspect-ratio: 1200 / 1310;
                            margin: 0 auto;
                            cursor: pointer;
                            user-select: none;
                            -webkit-user-select: none;
                            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
                            filter: drop-shadow(0 15px 35px rgba(255, 105, 180, 0.35));
                            animation: namedCardFloat 4s ease-in-out infinite;
                            z-index: 1;
                        }
                        .magic-named-card-wrap:hover {
                            transform: scale(1.03) translateY(-4px);
                            filter: drop-shadow(0 22px 50px rgba(255, 105, 180, 0.55));
                        }
                        .magic-named-card-wrap.bounce {
                            animation: namedCardBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                        }
                        .magic-named-card-img {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            display: block;
                            pointer-events: none;
                        }
                        .magic-named-card-banner-text {
                            position: absolute;
                            top: 27.2%;
                            left: 23%;
                            width: 54%;
                            height: 8.8%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            pointer-events: none;
                            z-index: 2;
                            box-sizing: border-box;
                            padding: 0 4px;
                        }
                        .magic-named-card-banner-inner {
                            font-family: 'Fredoka', 'Outfit', 'Caveat', 'Poppins', 'Comic Neue', cursive, sans-serif !important;
                            font-weight: 800;
                            color: #4a2818 !important;
                            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.95), 0 0 10px rgba(255, 235, 204, 0.9);
                            letter-spacing: 0.5px;
                            line-height: 1.1;
                            word-break: break-word;
                            max-width: 100%;
                            max-height: 100%;
                            overflow: hidden;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                        }
                        .magic-named-card-badge {
                            margin-top: clamp(12px, 1.8vh, 18px);
                            padding: 8px 24px;
                            background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 238, 215, 0.95));
                            border: 1.5px solid rgba(255, 255, 255, 0.95);
                            border-radius: 50px;
                            color: #6a2e15;
                            font-family: 'Fredoka', 'Poppins', 'Outfit', sans-serif;
                            font-size: clamp(0.85rem, 2.9vw, 1rem);
                            font-weight: 800;
                            letter-spacing: 0.5px;
                            box-shadow: 0 8px 20px rgba(255, 140, 0, 0.18), inset 0 1px 1px #fff;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            cursor: pointer;
                            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
                            z-index: 1;
                            animation: namedBadgePulse 2.8s infinite ease-in-out;
                            user-select: none;
                            -webkit-user-select: none;
                        }
                        .magic-named-card-badge:hover {
                            transform: scale(1.06) translateY(-2px);
                            box-shadow: 0 12px 28px rgba(255, 140, 0, 0.32);
                        }
                        .magic-named-card-badge.bouncing {
                            animation: namedBadgeBounce 0.5s ease !important;
                        }
                    `;
                    d.head.appendChild(style);
                }

                const section = d.createElement("section");
                section.id = "magic-named-birthday-card-section";
                section.style.cssText = "position: relative; padding: clamp(22px, 3.2vw, 36px) clamp(16px, 2.5vw, 26px); text-align: center; margin: clamp(1.8rem, 3vw, 2.6rem) auto; width: 92%; max-width: 520px; box-sizing: border-box; align-self: center; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.94) 0%, rgba(255, 245, 235, 0.88) 45%, rgba(255, 232, 242, 0.82) 100%); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); border-radius: clamp(28px, 4vw, 42px); border: 2.5px solid rgba(255, 255, 255, 0.85); box-shadow: 0 20px 50px rgba(255, 105, 180, 0.22), 0 0 35px rgba(255, 215, 0, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 6px rgba(255, 192, 203, 0.25); overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease;";

                let nameText = (customText !== undefined && customText !== null) ? customText : (userName || "Birthday Star");
                if (typeof nameText === 'string') nameText = nameText.trim();

                let fontSizeStyle = 'font-size: clamp(1.15rem, 5.2vw, 1.85rem);';
                if (nameText.length > 22) {
                    fontSizeStyle = 'font-size: clamp(0.72rem, 3vw, 1.1rem);';
                } else if (nameText.length > 15) {
                    fontSizeStyle = 'font-size: clamp(0.82rem, 3.8vw, 1.3rem);';
                } else if (nameText.length > 10) {
                    fontSizeStyle = 'font-size: clamp(0.95rem, 4.4vw, 1.55rem);';
                }

                // Decorative ambient colored orbs
                const orb1 = d.createElement("div");
                orb1.className = "magic-named-card-orb magic-named-card-orb-1";
                section.appendChild(orb1);

                const orb2 = d.createElement("div");
                orb2.className = "magic-named-card-orb magic-named-card-orb-2";
                section.appendChild(orb2);

                const orb3 = d.createElement("div");
                orb3.className = "magic-named-card-orb magic-named-card-orb-3";
                section.appendChild(orb3);

                // Ambient glowing background aura
                const aura = d.createElement("div");
                aura.className = "magic-named-card-bg-aura";
                section.appendChild(aura);

                // Decorative corner elements matching the cute birthday theme
                const iconTL = d.createElement("div");
                iconTL.style.cssText = "position: absolute; top: 12px; left: 16px; font-size: 1.35rem; pointer-events: none; z-index: 1; animation: namedSparkleFloat1 3.8s ease-in-out infinite;";
                iconTL.innerText = "🎈";
                section.appendChild(iconTL);

                const iconTR = d.createElement("div");
                iconTR.style.cssText = "position: absolute; top: 12px; right: 16px; font-size: 1.35rem; pointer-events: none; z-index: 1; animation: namedSparkleFloat2 4.2s ease-in-out infinite 0.5s;";
                iconTR.innerText = "🎁";
                section.appendChild(iconTR);

                const iconBL = d.createElement("div");
                iconBL.style.cssText = "position: absolute; bottom: 14px; left: 16px; font-size: 1.25rem; pointer-events: none; z-index: 1; animation: namedSparkleFloat2 3.6s ease-in-out infinite 1s;";
                iconBL.innerText = "💖";
                section.appendChild(iconBL);

                const iconBR = d.createElement("div");
                iconBR.style.cssText = "position: absolute; bottom: 14px; right: 16px; font-size: 1.25rem; pointer-events: none; z-index: 1; animation: namedSparkleFloat1 4s ease-in-out infinite 1.5s;";
                iconBR.innerText = "✨";
                section.appendChild(iconBR);

                const cardWrap = d.createElement("div");
                cardWrap.className = "magic-named-card-wrap";
                cardWrap.id = "magic-named-card-wrap";

                const textHtml = nameText ? `<div class="magic-named-card-banner-text"><span class="magic-named-card-banner-inner" style="${fontSizeStyle}">${escapeHtml(nameText)}</span></div>` : '';

                cardWrap.innerHTML = `
                    <img class="magic-named-card-img" src="/assets/media/BName.png" alt="Happy Birthday" />
                    ${textHtml}
                `;

                // Interactive badge
                const isHi = (window.currentLang === 'hi');
                const badgeText = isHi ? "✨ सेलिब्रेट करने के लिए टैप करें ✨" : "✨ Tap to Celebrate ✨";
                const badge = d.createElement("div");
                badge.className = "magic-named-card-badge";
                badge.innerHTML = badgeText;

                // Add audio element for celebratory tap
                const tapAudio = d.createElement('audio');
                tapAudio.id = 'magic-named-card-audio';
                tapAudio.src = '/assets/sounds/final-revel.mp3';
                tapAudio.preload = 'auto';
                tapAudio.volume = 0.6;
                tapAudio.style.display = 'none';
                d.body.appendChild(tapAudio);

                const handleTap = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    triggerNamedCardCelebration(section, e);
                };

                cardWrap.addEventListener('click', handleTap);
                badge.addEventListener('click', handleTap);
                section.appendChild(cardWrap);
                section.appendChild(badge);
                insertSectionBeforeFinal(d, section);
                scrollToElement(d, section);

                return { listeners: [{ target: cardWrap, type: 'click', handler: handleTap }, { target: badge, type: 'click', handler: handleTap }] };
            },
            disable(d) {
                d?.getElementById("magic-named-birthday-card-section")?.remove();
                const audio = d?.getElementById("magic-named-card-audio");
                if (audio) audio.remove();
            }
        },
        virtualCake: {
            enable(d, w, userName, customText, images, customCakeId) {
                const existingCake = d.getElementById('magic-virtual-cake-section');
                if (existingCake) existingCake.remove();

                if (!d.querySelector('meta[charset]')) {
                    const meta = d.createElement('meta');
                    meta.setAttribute('charset', 'UTF-8');
                    if (d.head) d.head.insertBefore(meta, d.head.firstChild);
                }

                if (!d.getElementById('greeter-font-awesome')) {
                    const fa = d.createElement('link');
                    fa.id = 'greeter-font-awesome';
                    fa.rel = 'stylesheet';
                    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
                    d.head.appendChild(fa);
                }
                if (!d.getElementById('greeter-cake-fonts')) {
                    const fl = d.createElement('link');
                    fl.id = 'greeter-cake-fonts';
                    fl.rel = 'stylesheet';
                    fl.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Outfit:wght@500;700;800;900&family=Poppins:wght@400;500;600;700&display=swap';
                    (d.head || d.body)?.appendChild(fl);
                }

                const oldVcStyles = d.getElementById('vc-styles');
                if (oldVcStyles) oldVcStyles.remove();
                const s = d.createElement('style');
                s.id = 'vc-styles';
                s.textContent = `
                :root {
                    --vc-gold: #FFD700;
                    --vc-gold2: #FF9100;
                    --vc-pink: #FF4D8F;
                    --vc-rose: #E91E8C;
                    --vc-blush: #FFB6C1;
                    --vc-magenta: #C2185B;
                }
                /* ===== FLOATING AMBIENT PETALS ===== */
                @keyframes vc-petal-float {
                    0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 0; }
                    12%  { opacity: 0.75; }
                    80%  { opacity: 0.65; }
                    100% { transform: translateY(-115%) translateX(var(--vc-petal-dx, 28px)) rotate(var(--vc-petal-rot, 180deg)) scale(0.5); opacity: 0; }
                }
                .vc-petal {
                    position: absolute;
                    pointer-events: none;
                    border-radius: 50% 0 50% 0;
                    animation: vc-petal-float var(--vc-petal-dur, 7s) ease-in-out var(--vc-petal-delay, 0s) infinite;
                    will-change: transform, opacity;
                    z-index: 1;
                }
                /* ===== LUXURY CELEBRATION CARD ===== */
                .vc-section {
                    position: relative;
                    z-index: 10;
                    isolation: isolate;
                    width: 92%;
                    max-width: 580px;
                    perspective: 1200px;
                    -webkit-perspective: 1200px;
                    margin: clamp(20px, 3.5vw, 36px) auto !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    align-self: center;
                    box-sizing: border-box;
                    padding: clamp(28px, 4vw, 44px) clamp(16px, 3vw, 32px);
                    border-radius: clamp(26px, 4vw, 36px);
                    border: 1.5px solid rgba(255, 215, 0, 0.45);
                    box-shadow:
                        0 24px 60px -10px rgba(0, 0, 0, 0.75),
                        0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                        0 0 50px -10px rgba(255, 77, 143, 0.35);
                    color: #fff;
                    font-family: 'Outfit', 'Poppins', -apple-system, sans-serif;
                    text-align: center;
                    overflow: hidden;
                    transition: border-color 0.4s ease, box-shadow 0.4s ease, background 0.45s ease;
                }
                .vc-section:hover {
                    border-color: rgba(255, 215, 0, 0.7);
                    box-shadow:
                        0 28px 70px -10px rgba(0, 0, 0, 0.8),
                        0 0 0 1.5px rgba(255, 255, 255, 0.12) inset,
                        0 0 65px -8px rgba(255, 77, 143, 0.45);
                }

                /* Ambient Floating Orbs */
                .vc-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(50px);
                    opacity: 0.35;
                    z-index: 1;
                    animation: vc-orb-drift 8s ease-in-out infinite alternate;
                }
                .vc-orb-1 { width: 220px; height: 220px; background: rgba(255, 77, 143, 0.4); top: -60px; left: -40px; }
                .vc-orb-2 { width: 180px; height: 180px; background: rgba(255, 215, 0, 0.35); bottom: -40px; right: -30px; animation-delay: -3s; }
                .vc-orb-3 { width: 140px; height: 140px; background: rgba(255, 145, 0, 0.28); top: 35%; right: 8%; animation-delay: -5s; }
                @keyframes vc-orb-drift {
                    0%   { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(16px, 12px) scale(1.08); }
                }

                /* Ambient Twinkling Stars */
                .vc-star {
                    position: absolute;
                    pointer-events: none;
                    font-size: clamp(10px, 2.4vw, 15px);
                    color: #FFD700;
                    opacity: 0;
                    z-index: 2;
                    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
                    animation: vc-star-twinkle 2.8s ease-in-out infinite;
                }
                @keyframes vc-star-twinkle {
                    0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
                    50%      { opacity: 0.88; transform: scale(1.15) rotate(25deg); }
                }

                /* Header Badges & Typography */
                .vc-header {
                    position: relative;
                    z-index: 3;
                    margin-bottom: clamp(12px, 2.5vw, 18px);
                }
                .vc-title,
                .vc-title-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-family: 'Outfit', -apple-system, sans-serif;
                    font-size: clamp(1.4rem, 4.2vw, 2.1rem);
                    font-weight: 900;
                    letter-spacing: -0.01em;
                    line-height: 1.2;
                    margin: 0 auto 6px;
                    color: #FFFFFF;
                    text-shadow: none !important;
                }
                .vc-title-text,
                .vc-gradient-text {
                    background: linear-gradient(135deg, #FFF9D2 0%, #FFD700 38%, #FF85A2 75%, #FF4081 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    text-shadow: none !important;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
                    font-weight: 900;
                }
                .vc-title-badge .vc-icon,
                .vc-title .fas {
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
                    display: inline-block;
                }
                .vc-emoji {
                    -webkit-text-fill-color: initial;
                    display: inline-block;
                    margin-left: 4px;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }
                .vc-subtitle {
                    font-size: clamp(0.82rem, 2.3vw, 0.98rem);
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.92);
                    letter-spacing: 0.01em;
                    margin: 0;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
                }

                /* Ribbon Wish Banner */
                .vc-ribbon {
                    position: relative;
                    z-index: 3;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin: 0 auto clamp(14px, 2.8vw, 22px);
                    padding: clamp(6px, 1.5vw, 10px) clamp(16px, 3.2vw, 28px);
                    background:
                        linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 100%),
                        radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.14), transparent 70%);
                    border: 1.5px solid rgba(255, 215, 0, 0.65);
                    border-radius: 999px;
                    box-shadow:
                        0 8px 24px -4px rgba(0, 0, 0, 0.5),
                        0 0 20px rgba(255, 215, 0, 0.25) inset;
                    max-width: 95%;
                    box-sizing: border-box;
                }
                .vc-ribbon-text {
                    font-family: 'Great Vibes', cursive, sans-serif;
                    font-size: clamp(1.15rem, 3.4vw, 1.75rem);
                    font-weight: 400;
                    color: #FFD700;
                    letter-spacing: 0.02em;
                    line-height: 1.25;
                    word-break: break-word;
                    text-align: center;
                    text-shadow:
                        0 2px 10px rgba(0, 0, 0, 0.7),
                        0 0 18px rgba(255, 215, 0, 0.6);
                }
                .vc-ribbon-icon {
                    font-size: clamp(0.9rem, 2vw, 1.15rem);
                    flex-shrink: 0;
                    color: #FF4D8F;
                    filter: drop-shadow(0 2px 6px rgba(255, 77, 143, 0.6));
                    animation: vc-icon-pulse 1.8s ease-in-out infinite;
                }
                @keyframes vc-icon-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.88; }
                    50%      { transform: scale(1.18); opacity: 1; }
                }

                /* 3D Scene Container */
                .vc-scene {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto clamp(18px, 3.5vw, 30px);
                    width: 100%;
                    max-width: 360px;
                    cursor: pointer;
                    user-select: none;
                    -webkit-user-select: none;
                    perspective: 1100px;
                    perspective-origin: 50% 32%;
                    transform-style: preserve-3d;
                }

                /* ===== ROLLING ENTRANCE ANIMATION (vc-cake-roll-in) ===== */
                @keyframes vc-cake-roll-in {
                    0% {
                        opacity: 0;
                        transform: translateX(-120%) rotate(-210deg) scale(0.6);
                    }
                    60% {
                        opacity: 1;
                        transform: translateX(14px) rotate(14deg) scale(1.05, 0.95);
                    }
                    78% {
                        transform: translateX(-7px) rotate(-7deg) scale(0.97, 1.03);
                    }
                    90% {
                        transform: translateX(3px) rotate(2deg) scale(1.01, 0.99);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(0) rotate(0deg) scale(1);
                    }
                }

                .vc-scene.rolling-in {
                    animation: vc-cake-roll-in 1.35s cubic-bezier(0.2, 0.85, 0.32, 1.2) forwards;
                    transform-origin: 50% 88%;
                    will-change: transform, opacity;
                }

                /* Gold Sparkle Dust Trail underneath pedestal */
                .vc-roll-trail {
                    position: absolute;
                    bottom: 6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 330px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    pointer-events: none;
                    z-index: 1;
                    opacity: 0;
                    transition: opacity 0.35s ease;
                }

                .vc-scene.rolling-in .vc-roll-trail {
                    opacity: 1;
                }

                .vc-roll-sparkle-dot {
                    position: relative;
                    display: inline-block;
                    font-size: clamp(14px, 2.8vw, 19px);
                    line-height: 1;
                    color: #FFD700;
                    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.95)) drop-shadow(0 0 16px rgba(255, 179, 0, 0.7));
                    opacity: 0;
                }

                .vc-roll-sparkle-dot::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(255, 215, 0, 0.75) 0%, rgba(255, 179, 0, 0.25) 55%, transparent 75%);
                    pointer-events: none;
                    z-index: -1;
                }

                .vc-scene.rolling-in .vc-roll-sparkle-dot {
                    animation: vc-roll-sparkle 1.15s ease-out forwards;
                    animation-delay: calc(var(--i, 0) * 0.15s);
                }

                @keyframes vc-roll-sparkle {
                    0% {
                        opacity: 0;
                        transform: translateY(14px) scale(0.2) rotate(0deg);
                    }
                    30% {
                        opacity: 1;
                        transform: translateY(-6px) scale(1.25) rotate(45deg);
                    }
                    70% {
                        opacity: 0.85;
                        transform: translateY(-14px) scale(1) rotate(90deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-22px) scale(0.2) rotate(135deg);
                    }
                }


                /* Cake Container (Stationary with Subtle 3D Side-to-Side Yaw & Micro-Hover) */
                .vc-cake-rotator {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: 350px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform-style: preserve-3d;
                }

                /* ===== LUXURY IDLE YAW & MICRO-HOVER ANIMATION ===== */
                @keyframes vc-idle-sway {
                    0% {
                        transform: translateY(0px) rotateY(0deg) rotateZ(0deg);
                    }
                    25% {
                        transform: translateY(-4px) rotateY(-8deg) rotateZ(-0.5deg);
                    }
                    50% {
                        transform: translateY(1px) rotateY(0deg) rotateZ(0deg);
                    }
                    75% {
                        transform: translateY(-4px) rotateY(8deg) rotateZ(0.5deg);
                    }
                    100% {
                        transform: translateY(0px) rotateY(0deg) rotateZ(0deg);
                    }
                }

                .vc-cake-rotator.is-idle-swaying {
                    animation: vc-idle-sway 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                    transform-origin: 50% 88%;
                    will-change: transform;
                }

                /* Turntable Dynamic Shadow with Synchronized Breath Pulse */
                .vc-turntable-shadow {
                    position: absolute;
                    bottom: 0px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: clamp(220px, 80%, 300px);
                    height: 26px;
                    background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.15) 55%, transparent 75%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1;
                    opacity: 0.55;
                    transition: opacity 0.4s ease;
                }

                @keyframes vc-shadow-pulse {
                    0%, 50%, 100% {
                        transform: translateX(-50%) scale(1);
                        opacity: 0.55;
                    }
                    25%, 75% {
                        transform: translateX(-50%) scale(0.92);
                        opacity: 0.35;
                    }
                }

                .vc-scene.is-swaying .vc-turntable-shadow {
                    animation: vc-shadow-pulse 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                    will-change: transform, opacity;
                }

                /* SVG Vector Cake */
                .vc-cake-svg {
                    width: 100%;
                    max-width: 350px;
                    height: auto;
                    display: block;
                    overflow: visible;
                    filter: drop-shadow(0 16px 32px rgba(20, 2, 18, 0.5));
                }

                /* Cake Halves Separation */
                .vc-half {
                    transition: transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1);
                    transform-origin: 180px 270px;
                }
                .vc-scene.is-cut .vc-left {
                    transform: translateX(-38px) rotate(-3.5deg);
                }
                .vc-scene.is-cut .vc-right {
                    transform: translateX(38px) rotate(3.5deg);
                }

                /* Vertical Laser Cut Line & Knife */
                .vc-cut-line {
                    position: absolute;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 3px;
                    height: 0;
                    background: linear-gradient(180deg, #FF1744 0%, #FF5252 60%, #FF8A80 100%);
                    box-shadow:
                        0 0 16px #FF1744,
                        0 0 28px #FF5252;
                    z-index: 20;
                    opacity: 0;
                    pointer-events: none;
                    border-radius: 3px;
                }
                .vc-cut-line.slicing {
                    opacity: 1;
                    height: 250px;
                    transition: height 0.65s cubic-bezier(0.2, 0.8, 0.25, 1);
                }
                .vc-cut-line.flash {
                    opacity: 1;
                    animation: vc-cut-glow 0.8s ease-out forwards;
                }
                @keyframes vc-cut-glow {
                    0%   { opacity: 1; filter: brightness(2); }
                    100% { opacity: 0; filter: brightness(1); }
                }

                .vc-knife-wrap {
                    position: absolute;
                    top: -55px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 25;
                    font-size: clamp(2.0rem, 5vw, 2.6rem);
                    color: #E0E0E0;
                    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
                    opacity: 0;
                    pointer-events: none;
                    transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.3s ease;
                }
                .vc-knife-wrap.slicing {
                    opacity: 1;
                    transform: translateX(-50%) translateY(240px);
                }

                /* Realistic Candle Burning & Flame Flickering Animations */
                @keyframes vc-flame-burn-1 {
                    0%, 100% { transform: scale(1, 1) rotate(0deg) skewX(0deg); }
                    18%      { transform: scale(0.93, 1.07) rotate(-3.5deg) skewX(-2.5deg); }
                    38%      { transform: scale(1.06, 0.94) rotate(2.8deg) skewX(2deg); }
                    58%      { transform: scale(0.96, 1.04) rotate(-2.2deg) skewX(-1.5deg); }
                    78%      { transform: scale(1.03, 0.97) rotate(2.2deg) skewX(1.5deg); }
                }
                @keyframes vc-flame-burn-2 {
                    0%, 100% { transform: scale(1.02, 0.97) rotate(-1.5deg) skewX(-1deg); }
                    22%      { transform: scale(0.93, 1.08) rotate(3.5deg) skewX(2.5deg); }
                    44%      { transform: scale(1.05, 0.94) rotate(-3deg) skewX(-2deg); }
                    66%      { transform: scale(0.96, 1.04) rotate(2.2deg) skewX(1.5deg); }
                    84%      { transform: scale(1.01, 0.98) rotate(-1.2deg) skewX(-1deg); }
                }
                @keyframes vc-flame-burn-3 {
                    0%, 100% { transform: scale(1.01, 1.02) rotate(0deg) skewX(0deg); }
                    20%      { transform: scale(1.07, 0.93) rotate(4deg) skewX(2.8deg); }
                    40%      { transform: scale(0.94, 1.07) rotate(-3deg) skewX(-2.2deg); }
                    60%      { transform: scale(1.04, 0.95) rotate(3deg) skewX(2deg); }
                    80%      { transform: scale(0.96, 1.05) rotate(-3.5deg) skewX(-2.5deg); }
                }
                @keyframes vc-ambient-candlelight-pulse {
                    0%, 100% { opacity: 0.72; transform: scale(0.97); }
                    50%      { opacity: 0.96; transform: scale(1.03); }
                }

                /* Candle Flame Items (Anchored at wick tip: 0px -5px, natural fire teardrop glow) */
                .vc-flame-item {
                    filter: drop-shadow(0 -3px 8px rgba(255, 154, 0, 0.85)) drop-shadow(0 -6px 16px rgba(255, 61, 0, 0.5));
                }
                #vc-flame-0, .vc-flame-item-1 {
                    transform-origin: 0px -5px;
                    animation: vc-flame-burn-1 1.25s ease-in-out infinite;
                    will-change: transform;
                }
                #vc-flame-1, .vc-flame-item-2 {
                    transform-origin: 0px -5px;
                    animation: vc-flame-burn-2 1.45s ease-in-out infinite 0.18s;
                    will-change: transform;
                }
                #vc-flame-2, .vc-flame-item-3 {
                    transform-origin: 0px -5px;
                    animation: vc-flame-burn-3 1.15s ease-in-out infinite 0.35s;
                    will-change: transform;
                }
                #vc-flame-3, .vc-flame-item-4 {
                    transform-origin: 0px -5px;
                    animation: vc-flame-burn-2 1.55s ease-in-out infinite 0.12s;
                    will-change: transform;
                }
                #vc-flame-4, .vc-flame-item-5 {
                    transform-origin: 0px -5px;
                    animation: vc-flame-burn-1 1.35s ease-in-out infinite 0.28s;
                    will-change: transform;
                }

                /* Ambient Candlelight Warmth Soft Pulsing */
                .vc-ambient-candlelight-glow {
                    transform-origin: 180px 110px;
                    animation: vc-ambient-candlelight-pulse 2.2s ease-in-out infinite alternate;
                }

                /* Ensure NO discs, corona circles, or pre-mature smoke appear */
                .vc-flame-corona,
                circle.vc-flame-corona,
                .vc-flame-item circle,
                .vc-smoke-item:not(.puffing),
                .vc-smoke:not(.puffing) {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
                .vc-smoke-item.puffing,
                .vc-smoke.puffing {
                    display: block !important;
                    opacity: 0;
                    animation: vc-smoke-float 1.2s ease-out forwards !important;
                }

                /* Blow out candles state */
                .vc-flame-item.out,
                .vc-flame-item.out *,
                .vc-flame.out,
                #vc-flame-0.out,
                #vc-flame-1.out,
                #vc-flame-2.out,
                #vc-flame-3.out,
                #vc-flame-4.out {
                    animation: none !important;
                    opacity: 0 !important;
                    transform: scale(0.1) translateY(-12px) !important;
                    transition: opacity 0.35s ease, transform 0.4s ease !important;
                }

                /* Smoke Puffs */
                .vc-smoke {
                    opacity: 0;
                    pointer-events: none;
                }
                .vc-smoke.puffing {
                    animation: vc-smoke-float 1.2s ease-out forwards;
                }
                @keyframes vc-smoke-float {
                    0%   { opacity: 0.85; transform: translateY(0) scale(0.6); }
                    50%  { opacity: 0.6; transform: translateY(-16px) scale(1.1); }
                    100% { opacity: 0; transform: translateY(-36px) scale(1.6); }
                }

                /* Action Button */
                .vc-btn-wrap {
                    position: relative;
                    z-index: 4;
                    margin-top: clamp(10px, 2vw, 16px);
                    display: flex;
                    justify-content: center;
                }
                .vc-btn {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: clamp(14px, 2.6vw, 18px) clamp(28px, 5.5vw, 44px);
                    border: none;
                    border-radius: 999px;
                    background: linear-gradient(135deg, #FFE082 0%, #FFB300 35%, #FF4081 75%, #F50057 100%);
                    color: #260012;
                    font-family: 'Outfit', sans-serif;
                    font-size: clamp(0.95rem, 2.4vw, 1.15rem);
                    font-weight: 800;
                    letter-spacing: 0.01em;
                    cursor: pointer;
                    box-shadow:
                        0 10px 30px -4px rgba(255, 64, 129, 0.55),
                        0 4px 12px rgba(0, 0, 0, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.35) inset;
                    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, filter 0.25s ease;
                    outline: none;
                }
                .vc-btn:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow:
                        0 16px 40px -4px rgba(255, 64, 129, 0.7),
                        0 6px 18px rgba(0, 0, 0, 0.5),
                        0 0 0 1.5px rgba(255, 255, 255, 0.55) inset;
                    filter: brightness(1.06);
                }
                .vc-btn:active {
                    transform: translateY(1px) scale(0.98);
                }
                .vc-btn.done {
                    background: linear-gradient(135deg, #10B981, #059669);
                    color: #fff;
                    cursor: default;
                    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45);
                    transform: none !important;
                }

                /* Celebratory Wish Card */
                .vc-wish-card {
                    display: none;
                    margin-top: 18px;
                    padding: 16px 22px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 215, 0, 0.45);
                    border-radius: 18px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    animation: vc-wish-pop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
                }
                @keyframes vc-wish-pop {
                    0% { opacity: 0; transform: translateY(14px) scale(0.92); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .vc-wish-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #FFD700;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .vc-wish-desc {
                    font-size: 0.88rem;
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.4;
                    margin: 0;
                }

                /* Cake Slices Sharing Showcase */
                .vc-slices-wrapper {
                    display: none;
                    margin-top: 24px;
                    padding-top: 18px;
                    border-top: 1px dashed rgba(255, 215, 0, 0.35);
                    animation: vc-wish-pop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
                }
                .vc-slices-heading {
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: #FFE082;
                    margin: 0 0 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .vc-slices-sub {
                    font-size: 0.78rem;
                    color: rgba(255, 255, 255, 0.75);
                    margin: 0 0 14px;
                }
                .vc-slices-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                .vc-slice-card {
                    position: relative;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 215, 0, 0.28);
                    border-radius: 14px;
                    padding: 12px 10px;
                    cursor: pointer;
                    transition: transform 0.2s, background 0.2s, border-color 0.2s;
                    user-select: none;
                }
                .vc-slice-card:hover {
                    transform: translateY(-2px);
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 215, 0, 0.6);
                }
                .vc-slice-card:active {
                    transform: scale(0.96);
                }
                .vc-slice-graphic {
                    font-size: 1.8rem;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                .vc-slice-badge {
                    display: inline-block;
                    font-size: 0.68rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #FFD700;
                    background: rgba(255, 215, 0, 0.15);
                    padding: 2px 8px;
                    border-radius: 10px;
                    margin-bottom: 4px;
                }
                .vc-slice-label {
                    font-size: 0.78rem;
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.25;
                }
                .vc-slice-toast {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%) translateY(0);
                    background: #FF4081;
                    color: #fff;
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    pointer-events: none;
                    opacity: 0;
                    white-space: nowrap;
                    z-index: 10;
                }
                .vc-slice-toast.pop {
                    animation: vc-toast-float 1.2s ease-out forwards;
                }
                @keyframes vc-toast-float {
                    0% { opacity: 0; transform: translateX(-50%) translateY(6px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(-6px); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(-12px); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
                `;
                d.head.appendChild(s);

                const CAKE_THEMES = {
                    C1: {
                        id: 'C1',
                        name: 'Ruby Berry Royale',
                        standGold: { c0: '#9A7528', c18: '#DFBA60', c42: '#FFF8D6', c65: '#E5BF62', c85: '#B88A24', c100: '#735212', topStroke: '#E2BC60', highlight: '#FFF8D6' },
                        porcelainTop: { c0: '#FFFFFF', c60: '#FAF5EE', c100: '#E5D9C8' },
                        spongeGrad: { c0: '#D5C0AB', c12: '#EFE2D4', c32: '#FFFDF9', c52: '#FFFFFF', c78: '#F5E8D8', c100: '#CFBAA4', stroke: '#D4C0AD' },
                        biscuitFill: { c0: '#C88E46', c50: '#FFD180', c100: '#B57A30' },
                        spongeJam: '#C2185B',
                        glazeBody: { c0: '#80092B', c12: '#C2185B', c38: '#FF2A7A', c68: '#E91E63', c88: '#C2185B', c100: '#60001B' },
                        glazePool: { c0: '#FF5288', c60: '#E91E63', c100: '#AD1457' },
                        creamRosette: { c0: '#FFFFFF', c60: '#FFFDF8', c100: '#EFE1D3' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFF0A0', c65: '#FFB300', c100: '#8A6715' },
                        candleWax: { c0: '#FAF1E0', c35: '#FFFFFF', c70: '#FFFDF6', c100: '#E8DAC2' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(255, 170, 50, 0.28) 0%, rgba(255, 105, 180, 0.16) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.25) 0%, rgba(255, 77, 143, 0.18) 32%, transparent 65%), linear-gradient(168deg, #18021f 0%, #2b0630 30%, #430a3c 60%, #1f0323 88%, #140118 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(98, 196) rotate(-20)"><path d="M 0,-6 C -6,-6 -7,2 -2,8 C 0,10 0,10 2,8 C 7,2 6,-6 0,-6 Z" fill="url(#vc-berry-grad)"/><path d="M 0,-4 C -3,-4 -4,1 -1,5 C 0,6 0,6 1,5 C 4,1 3,-4 0,-4 Z" fill="#FFF2F4"/><circle cx="0" cy="1" r="0.8" fill="#FF1744"/></g>
                            <g transform="translate(72, 198)"><circle cx="0" cy="0" r="4.2" fill="url(#vc-blueberry-grad)"/><circle cx="-1" cy="-1.2" r="1" fill="#FFFFFF" opacity="0.8"/><polygon points="0,-1.5 0.8,-0.5 1.8,-0.8 1.2,0.2 1.6,1.2 0.6,0.8 0,1.8 -0.6,0.8 -1.6,1.2 -1.2,0.2 -1.8,-0.8 -0.8,-0.5" fill="#121858" transform="scale(0.8)"/></g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(262, 196) rotate(20)"><path d="M 0,-6 C -6,-6 -7,2 -2,8 C 0,10 0,10 2,8 C 7,2 6,-6 0,-6 Z" fill="url(#vc-berry-grad)"/><path d="M 0,-4 C -3,-4 -4,1 -1,5 C 0,6 0,6 1,5 C 4,1 3,-4 0,-4 Z" fill="#FFF2F4"/><circle cx="0" cy="1" r="0.8" fill="#FF1744"/></g>
                            <g transform="translate(288, 198)"><circle cx="0" cy="0" r="4.2" fill="url(#vc-blueberry-grad)"/><circle cx="-1" cy="-1.2" r="1" fill="#FFFFFF" opacity="0.8"/><polygon points="0,-1.5 0.8,-0.5 1.8,-0.8 1.2,0.2 1.6,1.2 0.6,0.8 0,1.8 -0.6,0.8 -1.6,1.2 -1.2,0.2 -1.8,-0.8 -0.8,-0.5" fill="#121858" transform="scale(0.8)"/></g>`,
                        topToppingsLeft: `
                            <g><g transform="translate(118, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(148, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(136, 114) rotate(-14)"><ellipse cx="2" cy="10" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/><path d="M 0,-11 C -10,-11 -13,2 -4,13 C -1,17 1,17 4,13 C 13,2 10,-11 0,-11 Z" fill="url(#vc-berry-grad)"/><path d="M -3,-8 C -8,-3 -8,4 -4,8" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="-4" cy="-3" r="0.75" fill="#FFE082"/><circle cx="2" cy="-4" r="0.75" fill="#FFE082"/><circle cx="-2" cy="2" r="0.75" fill="#FFE082"/><circle cx="3" cy="3" r="0.75" fill="#FFE082"/><circle cx="0" cy="7" r="0.75" fill="#FFE082"/><path d="M 0,-11 L -5,-15 L -2,-12 L 0,-16 L 3,-12 L 6,-15 L 2,-10 Z" fill="url(#vc-leaf-grad)"/></g>
                            <g transform="translate(156, 124)"><circle cx="0" cy="0" r="5" fill="url(#vc-blueberry-grad)"/><circle cx="-1.5" cy="-1.5" r="1.2" fill="#FFFFFF" opacity="0.85"/><polygon points="0,-1.8 0.9,-0.6 2.1,-1 1.4,0.3 1.9,1.4 0.7,0.9 0,2.1 -0.7,0.9 -1.9,1.4 -1.4,0.3 -2.1,-1 -0.9,-0.6" fill="#0A0E32" transform="scale(0.8)"/></g>`,
                        topToppingsRight: `
                            <g><g transform="translate(212, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(242, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(224, 114) rotate(14)"><ellipse cx="2" cy="10" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/><path d="M 0,-11 C -10,-11 -13,2 -4,13 C -1,17 1,17 4,13 C 13,2 10,-11 0,-11 Z" fill="url(#vc-berry-grad)"/><path d="M 3,-8 C 8,-3 8,4 4,8" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="-3" cy="-4" r="0.75" fill="#FFE082"/><circle cx="3" cy="-3" r="0.75" fill="#FFE082"/><circle cx="2" cy="2" r="0.75" fill="#FFE082"/><circle cx="-2" cy="4" r="0.75" fill="#FFE082"/><circle cx="0" cy="7" r="0.75" fill="#FFE082"/><path d="M 0,-11 L -5,-15 L -2,-12 L 0,-16 L 3,-12 L 6,-15 L 2,-10 Z" fill="url(#vc-leaf-grad)"/></g>
                            <g transform="translate(204, 124)"><circle cx="0" cy="0" r="5" fill="url(#vc-blueberry-grad)"/><circle cx="-1.5" cy="-1.5" r="1.2" fill="#FFFFFF" opacity="0.85"/><polygon points="0,-1.8 0.9,-0.6 2.1,-1 1.4,0.3 1.9,1.4 0.7,0.9 0,2.1 -0.7,0.9 -1.9,1.4 -1.4,0.3 -2.1,-1 -0.9,-0.6" fill="#0A0E32" transform="scale(0.8)"/></g>`,
                        centerpiece: `
                            <g transform="translate(180, 122)"><ellipse cx="0" cy="12" rx="9" ry="4" fill="rgba(0,0,0,0.25)"/><path d="M 0,-13 C -12,-13 -15,3 -5,16 C -1,20 1,20 5,16 C 15,3 12,-13 0,-13 Z" fill="url(#vc-berry-grad)"/><path d="M -4,-10 C -10,-4 -10,4 -5,10" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="-5" cy="-4" r="0.8" fill="#FFE082"/><circle cx="3" cy="-5" r="0.8" fill="#FFE082"/><circle cx="-2" cy="2" r="0.8" fill="#FFE082"/><circle cx="4" cy="3" r="0.8" fill="#FFE082"/><circle cx="-1" cy="8" r="0.8" fill="#FFE082"/><circle cx="2" cy="10" r="0.8" fill="#FFE082"/><path d="M 0,-13 L -6,-18 L -3,-14 L 0,-19 L 3,-14 L 6,-18 L 2,-12 Z" fill="url(#vc-leaf-grad)"/></g>`,
                        sparklesLeft: `<path d="M 125,138 L 126.5,142 L 130.5,143.5 L 126.5,145 L 125,149 L 123.5,145 L 119.5,143.5 L 123.5,142 Z" fill="#FFD700" opacity="0.85"/><path d="M 166,134 L 167,137 L 170,138 L 167,139 L 166,142 L 165,139 L 162,138 L 165,137 Z" fill="#FFE082" opacity="0.9"/>`,
                        sparklesRight: `<path d="M 235,138 L 236.5,142 L 240.5,143.5 L 236.5,145 L 235,149 L 233.5,145 L 229.5,143.5 L 233.5,142 Z" fill="#FFD700" opacity="0.85"/><path d="M 194,134 L 195,137 L 198,138 L 195,139 L 194,142 L 193,139 L 190,138 L 193,137 Z" fill="#FFE082" opacity="0.9"/>`
                    },
                    C2: {
                        id: 'C2',
                        name: 'Belgian Chocolate Truffle',
                        standGold: { c0: '#4A3414', c18: '#C9933B', c42: '#FFEAA6', c65: '#D1A348', c85: '#875C1C', c100: '#3D2507', topStroke: '#D1A348', highlight: '#FFEAA6' },
                        porcelainTop: { c0: '#2A1810', c60: '#1F1008', c100: '#150A05' },
                        spongeGrad: { c0: '#2B1408', c12: '#44200D', c32: '#5C2D13', c52: '#6E3718', c78: '#4E240D', c100: '#261106', stroke: '#3A180A' },
                        biscuitFill: { c0: '#8A4B1A', c50: '#DDA059', c100: '#6E350D' },
                        spongeJam: '#180803',
                        glazeBody: { c0: '#150703', c12: '#2B0E05', c38: '#4F1E0B', c68: '#3D1507', c88: '#250C04', c100: '#0F0401' },
                        glazePool: { c0: '#4A1D0B', c60: '#2E1005', c100: '#170602' },
                        creamRosette: { c0: '#7A3E1D', c60: '#5C2D13', c100: '#381A0B' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFF2B2', c65: '#FFC107', c100: '#996500' },
                        candleWax: { c0: '#3D1C0B', c35: '#5C2D13', c70: '#47200B', c100: '#2A1005' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(255, 170, 50, 0.28) 0%, rgba(218, 140, 40, 0.16) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.22) 0%, rgba(139, 69, 19, 0.25) 32%, transparent 65%), linear-gradient(168deg, #120905 0%, #241108 30%, #38180c 60%, #1c0a04 88%, #0d0402 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#9C5B28"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(98, 196) rotate(-15)"><ellipse cx="0" cy="-2" rx="8" ry="4" fill="#3D1C0B"/><ellipse cx="0" cy="0" rx="7" ry="1.2" fill="#180803"/><ellipse cx="0" cy="2" rx="8" ry="4" fill="#4E260F"/><circle cx="-2" cy="-2" r="1" fill="#FFF" opacity="0.4"/></g>
                            <g transform="translate(70, 198)"><circle cx="0" cy="0" r="5" fill="url(#vc-gold-pearl)"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#9C5B28"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(262, 196) rotate(15)"><ellipse cx="0" cy="-2" rx="8" ry="4" fill="#3D1C0B"/><ellipse cx="0" cy="0" rx="7" ry="1.2" fill="#180803"/><ellipse cx="0" cy="2" rx="8" ry="4" fill="#4E260F"/><circle cx="-2" cy="-2" r="1" fill="#FFF" opacity="0.4"/></g>
                            <g transform="translate(290, 198)"><circle cx="0" cy="0" r="5" fill="url(#vc-gold-pearl)"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        topToppingsLeft: `
                            <g><g transform="translate(118, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#9C5B28"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(148, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(136, 114) rotate(-10)"><ellipse cx="0" cy="0" rx="8" ry="7" fill="url(#vc-gold-pearl)" stroke="#5C2D13" stroke-width="0.8"/><circle cx="-2" cy="-2" r="1.5" fill="#FFF" opacity="0.8"/><path d="M -4,-2 C -1,-5 2,-4 5,-1" stroke="#2B1408" stroke-width="1.6" fill="none"/></g>
                            <g transform="translate(158, 122)"><circle cx="0" cy="0" r="4.5" fill="#3D1C0B"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        topToppingsRight: `
                            <g><g transform="translate(212, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(242, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#9C5B28"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(224, 114) rotate(10)"><ellipse cx="0" cy="0" rx="8" ry="7" fill="url(#vc-gold-pearl)" stroke="#5C2D13" stroke-width="0.8"/><circle cx="-2" cy="-2" r="1.5" fill="#FFF" opacity="0.8"/><path d="M -4,-2 C -1,-5 2,-4 5,-1" stroke="#2B1408" stroke-width="1.6" fill="none"/></g>
                            <g transform="translate(202, 122)"><circle cx="0" cy="0" r="4.5" fill="#3D1C0B"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        centerpiece: `
                            <g transform="translate(180, 120)"><ellipse cx="0" cy="12" rx="10" ry="4" fill="rgba(0,0,0,0.35)"/><circle cx="0" cy="0" r="11" fill="url(#vc-gold-pearl)" stroke="#5C2D13" stroke-width="1"/><path d="M -8,-4 C -2,-8 4,-6 8,-2 C 4,3 -2,4 -7,2" stroke="#2B1408" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-4" r="1.5" fill="#FFF" opacity="0.8"/><circle cx="2" cy="4" r="1.2" fill="#FFEAA6"/><circle cx="5" cy="-2" r="1" fill="#FFEAA6"/></g>`,
                        sparklesLeft: `<path d="M 125,138 L 126.5,142 L 130.5,143.5 L 126.5,145 L 125,149 L 123.5,145 L 119.5,143.5 L 123.5,142 Z" fill="#FFD700" opacity="0.9"/><path d="M 166,134 L 167,137 L 170,138 L 167,139 L 166,142 L 165,139 L 162,138 L 165,137 Z" fill="#FFEAA6" opacity="0.95"/>`,
                        sparklesRight: `<path d="M 235,138 L 236.5,142 L 240.5,143.5 L 236.5,145 L 235,149 L 233.5,145 L 229.5,143.5 L 233.5,142 Z" fill="#FFD700" opacity="0.9"/><path d="M 194,134 L 195,137 L 198,138 L 195,139 L 194,142 L 193,139 L 190,138 L 193,137 Z" fill="#FFEAA6" opacity="0.95"/>`
                    },
                    C3: {
                        id: 'C3',
                        name: 'Pastel Princess Strawberry',
                        standGold: { c0: '#B76E79', c18: '#F7C5CC', c42: '#FFFFFF', c65: '#F2B1BA', c85: '#C87D87', c100: '#8A4850', topStroke: '#F2B1BA', highlight: '#FFFFFF' },
                        porcelainTop: { c0: '#FFFFFF', c60: '#FFF5F7', c100: '#FCE4EC' },
                        spongeGrad: { c0: '#F3CAD9', c12: '#FCE7F0', c32: '#FFF9FB', c52: '#FFFFFF', c78: '#FBE8F1', c100: '#EEC2D3', stroke: '#E8B3C7' },
                        biscuitFill: { c0: '#F48FB1', c50: '#FF80AB', c100: '#C2185B' },
                        spongeJam: '#FF4081',
                        glazeBody: { c0: '#C2185B', c12: '#E91E63', c38: '#FF4081', c68: '#FF80AB', c88: '#F06292', c100: '#AD1457' },
                        glazePool: { c0: '#FF80AB', c60: '#FF4081', c100: '#E91E63' },
                        creamRosette: { c0: '#FFFFFF', c60: '#FFF0F5', c100: '#F8BBD0' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFE4E9', c65: '#FF80AB', c100: '#C2185B' },
                        candleWax: { c0: '#FCE4EC', c35: '#FFFFFF', c70: '#FFF5F8', c100: '#F8BBD0' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(255, 182, 193, 0.3) 0%, rgba(233, 30, 99, 0.16) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.2) 0%, rgba(255, 105, 180, 0.22) 32%, transparent 65%), linear-gradient(168deg, #200517 0%, #380a29 30%, #520f3c 60%, #28051e 88%, #14020f 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(98, 196)"><circle cx="0" cy="0" r="2.5" fill="#FFD700"/><ellipse cx="0" cy="-4.8" rx="2" ry="3.8" fill="#FFF"/><ellipse cx="4.8" cy="0" rx="3.8" ry="2" fill="#FFF"/><ellipse cx="0" cy="4.8" rx="2" ry="3.8" fill="#FFF"/><ellipse cx="-4.8" cy="0" rx="3.8" ry="2" fill="#FFF"/></g>
                            <g transform="translate(70, 198) rotate(-15)"><ellipse cx="0" cy="-1.5" rx="7" ry="3.5" fill="#FF80AB"/><ellipse cx="0" cy="0" rx="6" ry="1" fill="#FFF"/><ellipse cx="0" cy="1.5" rx="7" ry="3.5" fill="#F06292"/></g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(262, 196)"><circle cx="0" cy="0" r="2.5" fill="#FFD700"/><ellipse cx="0" cy="-4.8" rx="2" ry="3.8" fill="#FFF"/><ellipse cx="4.8" cy="0" rx="3.8" ry="2" fill="#FFF"/><ellipse cx="0" cy="4.8" rx="2" ry="3.8" fill="#FFF"/><ellipse cx="-4.8" cy="0" rx="3.8" ry="2" fill="#FFF"/></g>
                            <g transform="translate(290, 198) rotate(15)"><ellipse cx="0" cy="-1.5" rx="7" ry="3.5" fill="#FF80AB"/><ellipse cx="0" cy="0" rx="6" ry="1" fill="#FFF"/><ellipse cx="0" cy="1.5" rx="7" ry="3.5" fill="#F06292"/></g>`,
                        topToppingsLeft: `
                            <g><g transform="translate(118, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(148, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(136, 114) rotate(-14)"><ellipse cx="2" cy="10" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/><path d="M 0,-11 C -10,-11 -13,2 -4,13 C -1,17 1,17 4,13 C 13,2 10,-11 0,-11 Z" fill="url(#vc-berry-grad)"/><path d="M -3,-8 C -8,-3 -8,4 -4,8" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="-4" cy="-3" r="0.75" fill="#FFE082"/><circle cx="2" cy="-4" r="0.75" fill="#FFE082"/><circle cx="-2" cy="2" r="0.75" fill="#FFE082"/><circle cx="3" cy="3" r="0.75" fill="#FFE082"/><circle cx="0" cy="7" r="0.75" fill="#FFE082"/><path d="M 0,-11 L -5,-15 L -2,-12 L 0,-16 L 3,-12 L 6,-15 L 2,-10 Z" fill="url(#vc-leaf-grad)"/></g>
                            <g transform="translate(158, 124)"><circle cx="0" cy="0" r="2.2" fill="#FFD700"/><ellipse cx="0" cy="-4" rx="1.6" ry="3" fill="#FFF"/><ellipse cx="4" cy="0" rx="3" ry="1.6" fill="#FFF"/><ellipse cx="0" cy="4" rx="1.6" ry="3" fill="#FFF"/><ellipse cx="-4" cy="0" rx="3" ry="1.6" fill="#FFF"/></g>`,
                        topToppingsRight: `
                            <g><g transform="translate(212, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(242, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(224, 114) rotate(14)"><ellipse cx="2" cy="10" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/><path d="M 0,-11 C -10,-11 -13,2 -4,13 C -1,17 1,17 4,13 C 13,2 10,-11 0,-11 Z" fill="url(#vc-berry-grad)"/><path d="M 3,-8 C 8,-3 8,4 4,8" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="-3" cy="-4" r="0.75" fill="#FFE082"/><circle cx="3" cy="-3" r="0.75" fill="#FFE082"/><circle cx="2" cy="2" r="0.75" fill="#FFE082"/><circle cx="-2" cy="4" r="0.75" fill="#FFE082"/><circle cx="0" cy="7" r="0.75" fill="#FFE082"/><path d="M 0,-11 L -5,-15 L -2,-12 L 0,-16 L 3,-12 L 6,-15 L 2,-10 Z" fill="url(#vc-leaf-grad)"/></g>
                            <g transform="translate(202, 124)"><circle cx="0" cy="0" r="2.2" fill="#FFD700"/><ellipse cx="0" cy="-4" rx="1.6" ry="3" fill="#FFF"/><ellipse cx="4" cy="0" rx="3" ry="1.6" fill="#FFF"/><ellipse cx="0" cy="4" rx="1.6" ry="3" fill="#FFF"/><ellipse cx="-4" cy="0" rx="3" ry="1.6" fill="#FFF"/></g>`,
                        centerpiece: `
                            <g transform="translate(180, 122)"><ellipse cx="0" cy="12" rx="9" ry="4" fill="rgba(0,0,0,0.25)"/><path d="M 0,-13 C -12,-13 -15,3 -5,16 C -1,20 1,20 5,16 C 15,3 12,-13 0,-13 Z" fill="url(#vc-berry-grad)"/><path d="M -4,-10 C -10,-4 -10,4 -5,10" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="-5" cy="-4" r="0.8" fill="#FFE082"/><circle cx="3" cy="-5" r="0.8" fill="#FFE082"/><circle cx="-2" cy="2" r="0.8" fill="#FFE082"/><circle cx="4" cy="3" r="0.8" fill="#FFE082"/><g transform="translate(0, -14)"><circle cx="0" cy="0" r="2.8" fill="#FFD700"/><ellipse cx="0" cy="-4" rx="1.8" ry="3" fill="#FFF"/><ellipse cx="4" cy="0" rx="3" ry="1.8" fill="#FFF"/><ellipse cx="0" cy="4" rx="1.8" ry="3" fill="#FFF"/><ellipse cx="-4" cy="0" rx="3" ry="1.8" fill="#FFF"/></g></g>`,
                        sparklesLeft: `<path d="M 125,138 L 126.5,142 L 130.5,143.5 L 126.5,145 L 125,149 L 123.5,145 L 119.5,143.5 L 123.5,142 Z" fill="#FF80AB" opacity="0.9"/><path d="M 166,134 L 167,137 L 170,138 L 167,139 L 166,142 L 165,139 L 162,138 L 165,137 Z" fill="#FFF" opacity="0.9"/>`,
                        sparklesRight: `<path d="M 235,138 L 236.5,142 L 240.5,143.5 L 236.5,145 L 235,149 L 233.5,145 L 229.5,143.5 L 233.5,142 Z" fill="#FF80AB" opacity="0.9"/><path d="M 194,134 L 195,137 L 198,138 L 195,139 L 194,142 L 193,139 L 190,138 L 193,137 Z" fill="#FFF" opacity="0.9"/>`
                    },
                    C4: {
                        id: 'C4',
                        name: 'Rainbow Confetti Fiesta',
                        standGold: { c0: '#B8860B', c18: '#FFD700', c42: '#FFFFE0', c65: '#FFC800', c85: '#DAA520', c100: '#8B6508', topStroke: '#FFD700', highlight: '#FFFFE0' },
                        porcelainTop: { c0: '#FFFFFF', c60: '#F8F9FA', c100: '#E9ECEF' },
                        spongeGrad: { c0: '#E0E7FF', c12: '#F3E8FF', c32: '#FFF1F2', c52: '#FEFCE8', c78: '#ECFDF5', c100: '#EDE9FE', stroke: '#DDD6FE' },
                        biscuitFill: { c0: '#FF1744', c50: '#FFEA00', c100: '#00E676' },
                        spongeJam: '#00B0FF',
                        glazeBody: { c0: '#00B0FF', c12: '#651FFF', c38: '#FF1744', c68: '#FFEA00', c88: '#00E676', c100: '#00B0FF' },
                        glazePool: { c0: '#FFFFFF', c60: '#E0F2FE', c100: '#BAE6FD' },
                        creamRosette: { c0: '#FFFFFF', c60: '#FFFDE7', c100: '#FFF59D' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFD54F', c65: '#FF1744', c100: '#651FFF' },
                        candleWax: { c0: '#FFFFFF', c35: '#FFF9C4', c70: '#FFFFFF', c100: '#FFE082' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(255, 235, 59, 0.25) 0%, rgba(233, 30, 99, 0.18) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(0, 229, 255, 0.2) 0%, rgba(124, 77, 255, 0.22) 32%, transparent 65%), linear-gradient(168deg, #0e072b 0%, #1e0d4a 30%, #301369 60%, #160838 88%, #090317 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="-1" r="1.8" fill="#FF1744"/></g>
                            <g transform="translate(98, 196) rotate(-15)"><ellipse cx="0" cy="-1.5" rx="7.5" ry="3.8" fill="#00E5FF"/><ellipse cx="0" cy="0" rx="6.5" ry="1.2" fill="#FFEA00"/><ellipse cx="0" cy="1.5" rx="7.5" ry="3.8" fill="#FF4081"/></g>
                            <g transform="translate(70, 198)"><circle cx="0" cy="0" r="4.5" fill="#00E676"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="-1" r="1.8" fill="#00E5FF"/></g>
                            <g transform="translate(262, 196) rotate(15)"><ellipse cx="0" cy="-1.5" rx="7.5" ry="3.8" fill="#FF4081"/><ellipse cx="0" cy="0" rx="6.5" ry="1.2" fill="#FFEA00"/><ellipse cx="0" cy="1.5" rx="7.5" ry="3.8" fill="#00E5FF"/></g>
                            <g transform="translate(290, 198)"><circle cx="0" cy="0" r="4.5" fill="#FFD600"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        topToppingsLeft: `
                            <g><g transform="translate(118, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="#FF1744"/></g><g transform="translate(148, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="#00E676"/></g></g>
                            <g transform="translate(136, 114) rotate(-10)"><ellipse cx="0" cy="-2" rx="8" ry="4" fill="#00E5FF"/><ellipse cx="0" cy="0" rx="7" ry="1.2" fill="#FFEA00"/><ellipse cx="0" cy="2" rx="8" ry="4" fill="#FF1744"/></g>
                            <g transform="translate(158, 124)"><circle cx="0" cy="0" r="4.2" fill="#651FFF"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        topToppingsRight: `
                            <g><g transform="translate(212, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="#FFEA00"/></g><g transform="translate(242, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="#00B0FF"/></g></g>
                            <g transform="translate(224, 114) rotate(10)"><ellipse cx="0" cy="-2" rx="8" ry="4" fill="#FF1744"/><ellipse cx="0" cy="0" rx="7" ry="1.2" fill="#FFEA00"/><ellipse cx="0" cy="2" rx="8" ry="4" fill="#00E5FF"/></g>
                            <g transform="translate(202, 124)"><circle cx="0" cy="0" r="4.2" fill="#FF9100"/><circle cx="-1" cy="-1" r="1" fill="#FFF" opacity="0.8"/></g>`,
                        centerpiece: `
                            <g transform="translate(180, 120)"><ellipse cx="0" cy="12" rx="10" ry="4" fill="rgba(0,0,0,0.25)"/><ellipse cx="0" cy="-3" rx="12" ry="7" fill="#00E5FF"/><ellipse cx="0" cy="0" rx="11" ry="2.5" fill="#FFEA00"/><ellipse cx="0" cy="3" rx="12" ry="7" fill="#FF1744"/><ellipse cx="-3" cy="-4" rx="4" ry="1.5" fill="#FFF" opacity="0.7"/><g transform="translate(0, -12)"><polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#FFD700"/></g></g>`,
                        sparklesLeft: `<circle cx="125" cy="142" r="1.8" fill="#FF1744"/><circle cx="130" cy="145" r="1.8" fill="#FFEA00"/><circle cx="122" cy="146" r="1.8" fill="#00E676"/><circle cx="166" cy="138" r="1.8" fill="#00B0FF"/>`,
                        sparklesRight: `<circle cx="235" cy="142" r="1.8" fill="#651FFF"/><circle cx="240" cy="145" r="1.8" fill="#FF1744"/><circle cx="232" cy="146" r="1.8" fill="#FFEA00"/><circle cx="194" cy="138" r="1.8" fill="#00E676"/>`
                    },
                    C5: {
                        id: 'C5',
                        name: 'Royal Velvet Blueberry',
                        standGold: { c0: '#8A6818', c18: '#DFBA60', c42: '#FFF9D8', c65: '#E5C163', c85: '#B88E28', c100: '#6E4E0D', topStroke: '#F0D078', highlight: '#FFFBE8' },
                        porcelainTop: { c0: '#FFFFFF', c60: '#FAF5EE', c100: '#EDE0D0' },
                        spongeGrad: { c0: '#1F0B29', c12: '#351245', c32: '#4D1A63', c52: '#5C2275', c78: '#421657', c100: '#1D0A26', stroke: '#351245' },
                        biscuitFill: { c0: '#C88E46', c50: '#FFD180', c100: '#B57A30' },
                        spongeJam: '#4A0E4E',
                        glazeBody: { c0: '#2A063B', c12: '#5B117A', c38: '#9C27B0', c68: '#BA68C8', c88: '#7B1FA2', c100: '#230430' },
                        glazePool: { c0: '#CE93D8', c60: '#AB47BC', c100: '#6A1B9A' },
                        creamRosette: { c0: '#FFFFFF', c60: '#FFFDF9', c100: '#F5E8DC' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFF2B2', c65: '#FFD700', c100: '#997000' },
                        candleWax: { c0: '#FAF1E0', c35: '#FFFFFF', c70: '#FFFDF6', c100: '#E8DAC2' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(186, 85, 211, 0.22) 0%, rgba(106, 27, 154, 0.16) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.28) 0%, rgba(142, 36, 170, 0.18) 32%, transparent 65%), linear-gradient(168deg, #12031a 0%, #20062e 30%, #340c49 60%, #190524 88%, #0d0213 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)">
                                <path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/>
                                <path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/>
                                <circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/>
                            </g>
                            <g transform="translate(98, 196) rotate(-15)">
                                <ellipse cx="0" cy="0" rx="6.5" ry="5.5" fill="#240733"/>
                                <circle cx="-2.5" cy="-2" r="2.2" fill="#5E187D"/><circle cx="2.5" cy="-2" r="2.2" fill="#430E5C"/>
                                <circle cx="-3" cy="2" r="2.2" fill="#36084D"/><circle cx="2" cy="2.5" r="2.2" fill="#6A1B9A"/>
                                <circle cx="0" cy="0" r="2" fill="#7B1FA2"/>
                                <ellipse cx="-1.5" cy="-2.5" rx="0.8" ry="0.5" fill="#FFF" opacity="0.8"/>
                                <path d="M 0,-5.5 L -2,-8 L 0,-7 L 2,-8 Z" fill="#66BB6A"/>
                            </g>
                            <g transform="translate(72, 198)">
                                <circle cx="0" cy="0" r="4.5" fill="url(#vc-blueberry-grad)"/>
                                <circle cx="-1.2" cy="-1.2" r="1.1" fill="#FFFFFF" opacity="0.85"/>
                                <polygon points="0,-1.5 0.7,-0.5 1.6,-0.8 1.1,0.2 1.5,1.1 0.5,0.7 0,1.6 -0.5,0.7 -1.5,1.1 -1.1,0.2 -1.6,-0.8 -0.7,-0.5" fill="#1A1C3B" transform="scale(0.8)"/>
                            </g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)">
                                <path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/>
                                <path d="M -5,-1 C -7,-5 -2,-7 0,-4 C 2,-7 7,-5 5,-1 Z" fill="#FFFFFF"/>
                                <circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/>
                            </g>
                            <g transform="translate(262, 196) rotate(15)">
                                <ellipse cx="0" cy="0" rx="6.5" ry="5.5" fill="#240733"/>
                                <circle cx="-2.5" cy="-2" r="2.2" fill="#5E187D"/><circle cx="2.5" cy="-2" r="2.2" fill="#430E5C"/>
                                <circle cx="-3" cy="2" r="2.2" fill="#36084D"/><circle cx="2" cy="2.5" r="2.2" fill="#6A1B9A"/>
                                <circle cx="0" cy="0" r="2" fill="#7B1FA2"/>
                                <ellipse cx="1.5" cy="-2.5" rx="0.8" ry="0.5" fill="#FFF" opacity="0.8"/>
                                <path d="M 0,-5.5 L -2,-8 L 0,-7 L 2,-8 Z" fill="#66BB6A"/>
                            </g>
                            <g transform="translate(288, 198)">
                                <circle cx="0" cy="0" r="4.5" fill="url(#vc-blueberry-grad)"/>
                                <circle cx="-1.2" cy="-1.2" r="1.1" fill="#FFFFFF" opacity="0.85"/>
                                <polygon points="0,-1.5 0.7,-0.5 1.6,-0.8 1.1,0.2 1.5,1.1 0.5,0.7 0,1.6 -0.5,0.7 -1.5,1.1 -1.1,0.2 -1.6,-0.8 -0.7,-0.5" fill="#1A1C3B" transform="scale(0.8)"/>
                            </g>`,
                        topToppingsLeft: `
                            <g>
                                <g transform="translate(118, 126)">
                                    <path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/>
                                    <path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/>
                                    <circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/>
                                </g>
                                <g transform="translate(148, 123)">
                                    <path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/>
                                    <path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/>
                                    <circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/>
                                </g>
                            </g>
                            <g transform="translate(136, 114) rotate(-12)">
                                <polygon points="-6,-7 6,-7 8,7 -4,7" fill="url(#vc-stand-gold)" stroke="#8A5A1A" stroke-width="0.8"/>
                                <line x1="-3" y1="-6" x2="1" y2="6" stroke="#8A5A1A" stroke-width="0.6"/>
                            </g>
                            <g transform="translate(156, 124)">
                                <circle cx="0" cy="0" r="5" fill="url(#vc-blueberry-grad)"/>
                                <circle cx="-1.5" cy="-1.5" r="1.2" fill="#FFFFFF" opacity="0.85"/>
                                <polygon points="0,-1.8 0.9,-0.6 2.1,-1 1.4,0.3 1.9,1.4 0.7,0.9 0,2.1 -0.7,0.9 -1.9,1.4 -1.4,0.3 -2.1,-1 -0.9,-0.6" fill="#1A1C3B" transform="scale(0.8)"/>
                            </g>`,
                        topToppingsRight: `
                            <g>
                                <g transform="translate(212, 123)">
                                    <path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/>
                                    <path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/>
                                    <circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/>
                                </g>
                                <g transform="translate(242, 126)">
                                    <path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/>
                                    <path d="M -6,0 C -8,-4 -3,-7 0,-4 C 3,-7 8,-4 6,0 Z" fill="#FFFFFF"/>
                                    <circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/>
                                </g>
                            </g>
                            <g transform="translate(224, 114) rotate(12)">
                                <polygon points="-6,-7 6,-7 8,7 -4,7" fill="url(#vc-stand-gold)" stroke="#8A5A1A" stroke-width="0.8"/>
                                <line x1="-3" y1="-6" x2="1" y2="6" stroke="#8A5A1A" stroke-width="0.6"/>
                            </g>
                            <g transform="translate(204, 124)">
                                <circle cx="0" cy="0" r="5" fill="url(#vc-blueberry-grad)"/>
                                <circle cx="-1.5" cy="-1.5" r="1.2" fill="#FFFFFF" opacity="0.85"/>
                                <polygon points="0,-1.8 0.9,-0.6 2.1,-1 1.4,0.3 1.9,1.4 0.7,0.9 0,2.1 -0.7,0.9 -1.9,1.4 -1.4,0.3 -2.1,-1 -0.9,-0.6" fill="#1A1C3B" transform="scale(0.8)"/>
                            </g>`,
                        centerpiece: `
                            <g transform="translate(180, 120)">
                                <ellipse cx="0" cy="12" rx="11" ry="4.5" fill="rgba(0,0,0,0.3)"/>
                                <path d="M -11,6 L -9,-9 L -3,1 L 0,-13 L 3,1 L 9,-9 L 11,6 Z" fill="url(#vc-stand-gold)" stroke="#8A5A1A" stroke-width="0.8"/>
                                <circle cx="-9" cy="-9" r="1.6" fill="#FFF"/><circle cx="0" cy="-13" r="2.2" fill="#FFF"/><circle cx="9" cy="-9" r="1.6" fill="#FFF"/>
                                <circle cx="0" cy="1" r="3.2" fill="#AB47BC"/>
                                <circle cx="-14" cy="5" r="3.5" fill="#3A0E4E"/>
                                <circle cx="14" cy="5" r="3.5" fill="#3A0E4E"/>
                                <ellipse cx="-15" cy="4" rx="0.8" ry="0.5" fill="#FFF" opacity="0.8"/>
                                <ellipse cx="13" cy="4" rx="0.8" ry="0.5" fill="#FFF" opacity="0.8"/>
                            </g>`,
                        sparklesLeft: `<path d="M 125,138 L 126.5,142 L 130.5,143.5 L 126.5,145 L 125,149 L 123.5,145 L 119.5,143.5 L 123.5,142 Z" fill="#FFD700" opacity="0.88"/><path d="M 166,134 L 167,137 L 170,138 L 167,139 L 166,142 L 165,139 L 162,138 L 165,137 Z" fill="#FFE082" opacity="0.95"/>`,
                        sparklesRight: `<path d="M 235,138 L 236.5,142 L 240.5,143.5 L 236.5,145 L 235,149 L 233.5,145 L 229.5,143.5 L 233.5,142 Z" fill="#FFD700" opacity="0.88"/><path d="M 194,134 L 195,137 L 198,138 L 195,139 L 194,142 L 193,139 L 190,138 L 193,137 Z" fill="#FFE082" opacity="0.95"/>`
                    },
                    C6: {
                        id: 'C6',
                        name: 'Salted Caramel Crunch',
                        standGold: { c0: '#8A5A1A', c18: '#DDA059', c42: '#FFF3D6', c65: '#D18D3A', c85: '#9E641B', c100: '#54340A', topStroke: '#DDA059', highlight: '#FFF3D6' },
                        porcelainTop: { c0: '#FFFFFF', c60: '#FFF8E7', c100: '#FFE0B2' },
                        spongeGrad: { c0: '#D7B48C', c12: '#EDD6B8', c32: '#FFF6E9', c52: '#FFFFFF', c78: '#F5E2C9', c100: '#C9A375', stroke: '#C29868' },
                        biscuitFill: { c0: '#BF6E00', c50: '#FFB300', c100: '#804400' },
                        spongeJam: '#FF8F00',
                        glazeBody: { c0: '#663300', c12: '#A85800', c38: '#E67E00', c68: '#FF9900', c88: '#B35900', c100: '#4D2600' },
                        glazePool: { c0: '#FFA726', c60: '#E65100', c100: '#7A2E00' },
                        creamRosette: { c0: '#FFFFFF', c60: '#FFF8E1', c100: '#FFE082' },
                        pearlGrad: { c0: '#FFFFFF', c28: '#FFE082', c65: '#FFB300', c100: '#8D4600' },
                        candleWax: { c0: '#FFF8E1', c35: '#FFFFFF', c70: '#FFECB3', c100: '#FFE082' },
                        cardBg: 'radial-gradient(ellipse at 50% 50%, rgba(255, 167, 38, 0.28) 0%, rgba(139, 69, 19, 0.18) 35%, transparent 68%), radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.25) 0%, rgba(230, 81, 0, 0.2) 32%, transparent 65%), linear-gradient(168deg, #190e04 0%, #2e1a07 30%, #452608 60%, #211204 88%, #0f0701 100%)',
                        ledgeLeft: `
                            <g transform="translate(82, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(98, 196) rotate(-15)"><polygon points="-6,-6 6,-6 8,6 -4,6" fill="#DDA059" stroke="#8A5A1A" stroke-width="0.8"/><line x1="-3" y1="-5" x2="1" y2="5" stroke="#8A5A1A" stroke-width="0.6"/><line x1="2" y1="-5" x2="6" y2="5" stroke="#8A5A1A" stroke-width="0.6"/></g>
                            <g transform="translate(70, 198)"><circle cx="0" cy="0" r="4.5" fill="#8A5A1A"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        ledgeRight: `
                            <g transform="translate(278, 192)"><path d="M -8,2 C -11,-4 -5,-9 0,-6 C 5,-9 11,-4 8,2 C 4,7 -4,7 -8,2 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="-1" r="1.8" fill="url(#vc-gold-pearl)"/></g>
                            <g transform="translate(262, 196) rotate(15)"><polygon points="-6,-6 6,-6 8,6 -4,6" fill="#DDA059" stroke="#8A5A1A" stroke-width="0.8"/><line x1="-3" y1="-5" x2="1" y2="5" stroke="#8A5A1A" stroke-width="0.6"/><line x1="2" y1="-5" x2="6" y2="5" stroke="#8A5A1A" stroke-width="0.6"/></g>
                            <g transform="translate(290, 198)"><circle cx="0" cy="0" r="4.5" fill="#8A5A1A"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        topToppingsLeft: `
                            <g><g transform="translate(118, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(148, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(136, 114) rotate(-10)"><polygon points="-6,-6 6,-6 8,6 -4,6" fill="#DDA059" stroke="#8A5A1A" stroke-width="0.8"/><line x1="-3" y1="-5" x2="1" y2="5" stroke="#8A5A1A" stroke-width="0.6"/></g>
                            <g transform="translate(158, 124)"><circle cx="0" cy="0" r="4.5" fill="#8A5A1A"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        topToppingsRight: `
                            <g><g transform="translate(212, 123)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g><g transform="translate(242, 126)"><path d="M -9,3 C -13,-4 -6,-10 0,-7 C 6,-10 13,-4 9,3 C 5,8 -5,8 -9,3 Z" fill="url(#vc-cream-rosette)"/><circle cx="0" cy="0" r="1.5" fill="url(#vc-gold-pearl)"/></g></g>
                            <g transform="translate(224, 114) rotate(10)"><polygon points="-6,-6 6,-6 8,6 -4,6" fill="#DDA059" stroke="#8A5A1A" stroke-width="0.8"/><line x1="-3" y1="-5" x2="1" y2="5" stroke="#8A5A1A" stroke-width="0.6"/></g>
                            <g transform="translate(202, 124)"><circle cx="0" cy="0" r="4.5" fill="#8A5A1A"/><ellipse cx="-1" cy="-1" rx="1.5" ry="1" fill="#FFF" opacity="0.6"/></g>`,
                        centerpiece: `
                            <g transform="translate(180, 120)"><ellipse cx="0" cy="12" rx="10" ry="4" fill="rgba(0,0,0,0.3)"/><path d="M -10,6 L -8,-8 L -3,0 L 0,-12 L 3,0 L 8,-8 L 10,6 Z" fill="url(#vc-stand-gold)" stroke="#8A5A1A" stroke-width="0.8"/><circle cx="-8" cy="-8" r="1.5" fill="#FFF"/><circle cx="0" cy="-12" r="2" fill="#FFF"/><circle cx="8" cy="-8" r="1.5" fill="#FFF"/><circle cx="0" cy="2" r="3" fill="#DDA059"/></g>`,
                        sparklesLeft: `<path d="M 125,138 L 126.5,142 L 130.5,143.5 L 126.5,145 L 125,149 L 123.5,145 L 119.5,143.5 L 123.5,142 Z" fill="#FFA726" opacity="0.85"/><path d="M 166,134 L 167,137 L 170,138 L 167,139 L 166,142 L 165,139 L 162,138 L 165,137 Z" fill="#FFE082" opacity="0.9"/>`,
                        sparklesRight: `<path d="M 235,138 L 236.5,142 L 240.5,143.5 L 236.5,145 L 235,149 L 233.5,145 L 229.5,143.5 L 233.5,142 Z" fill="#FFA726" opacity="0.85"/><path d="M 194,134 L 195,137 L 198,138 L 195,139 L 194,142 L 193,139 L 190,138 L 193,137 Z" fill="#FFE082" opacity="0.9"/>`
                    }
                };

                let cakeId = 'C1';
                if (typeof customCakeId === 'string' && customCakeId.trim().startsWith('C')) {
                    cakeId = customCakeId.trim();
                } else if (typeof images === 'string' && images.trim().startsWith('C')) {
                    cakeId = images.trim();
                }
                if (!CAKE_THEMES[cakeId]) cakeId = 'C1';
                const theme = CAKE_THEMES[cakeId];

                const recipient = userName || 'Someone Special';
                const wishMsg = customText && customText.trim()
                    ? customText.trim()
                    : `Happy Birthday, ${recipient}!`;

                const section = d.createElement('section');
                section.id = 'magic-virtual-cake-section';
                section.className = 'vc-section';
                section.setAttribute('data-cake-id', cakeId);
                section.style.setProperty('background', theme.cardBg, 'important');

                section.innerHTML = `
                <!-- Ambient Glowing Orbs -->
                <div class="vc-orb vc-orb-1"></div>
                <div class="vc-orb vc-orb-2"></div>
                <div class="vc-orb vc-orb-3"></div>

                <!-- Twinkling Corner & Margin Stars -->
                <i class="fas fa-star vc-star" style="top:12%;left:7%;animation-delay:0s"></i>
                <i class="fas fa-star vc-star" style="top:18%;right:9%;animation-delay:0.7s;font-size:11px"></i>
                <i class="fas fa-star vc-star" style="bottom:22%;left:6%;animation-delay:1.2s;font-size:13px"></i>
                <i class="fas fa-star vc-star" style="bottom:15%;right:8%;animation-delay:0.4s;font-size:10px"></i>
                <i class="fas fa-star vc-star" style="top:48%;left:4%;animation-delay:1.6s;font-size:10px"></i>
                <i class="fas fa-star vc-star" style="top:52%;right:5%;animation-delay:1.1s;font-size:11px"></i>

                <!-- Header Title & Subtitle -->
                <div class="vc-header">
                    <h2 class="vc-title">
                        <i class="fas fa-birthday-cake" style="color:#FFD700;margin-right:8px;"></i><span class="vc-title-text">Cut the Cake</span> <span class="vc-emoji">&#129392;</span><i class="fas fa-crown" style="color:#FFD700;margin-left:8px;font-size:0.75em;vertical-align:middle;"></i>
                    </h2>
                    <p class="vc-subtitle">Tap the button to blow out the candles &amp; make a wish!</p>
                </div>

                <!-- Personalised Wish Ribbon -->
                <div class="vc-ribbon">
                    <i class="fas fa-heart vc-ribbon-icon"></i>
                    <span class="vc-ribbon-text">${wishMsg}</span>
                    <i class="fas fa-heart vc-ribbon-icon"></i>
                </div>

                <div class="vc-scene" id="vc-cake-stage">
                    <!-- Dynamic Turntable Floor Shadow with Breath Pulse -->
                    <div class="vc-turntable-shadow" id="vc-turntable-shadow"></div>

                    <!-- Gold Sparkle Dust Trail underneath pedestal as cake rolls -->
                    <div class="vc-roll-trail" id="vc-roll-trail">
                        <span class="vc-roll-sparkle-dot" style="--i:0">✨</span>
                        <span class="vc-roll-sparkle-dot" style="--i:1">⭐</span>
                        <span class="vc-roll-sparkle-dot" style="--i:2">✨</span>
                        <span class="vc-roll-sparkle-dot" style="--i:3">⭐</span>
                        <span class="vc-roll-sparkle-dot" style="--i:4">✨</span>
                    </div>

                    <!-- Vertical center red cut line & Knife -->
                    <div class="vc-cut-line" id="vc-cut-line"></div>
                    <div class="vc-knife-wrap" id="vc-knife-wrap"><i class="fas fa-utensils"></i></div>

                    <!-- SVG Vector Cake -->
                    
                    <!-- 360 Degree Continuous Rotating Cake (Vertical Center Axis Earth Spin) -->
                    <div class="vc-cake-rotator" id="vc-cake-rotator">
<svg class="vc-cake-svg" viewBox="0 0 360 325" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <!-- Stand Gold Gradient -->
                            <linearGradient id="vc-stand-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${theme.standGold.c0}"/>
                                <stop offset="18%" stop-color="${theme.standGold.c18}"/>
                                <stop offset="42%" stop-color="${theme.standGold.c42}"/>
                                <stop offset="65%" stop-color="${theme.standGold.c65}"/>
                                <stop offset="85%" stop-color="${theme.standGold.c85}"/>
                                <stop offset="100%" stop-color="${theme.standGold.c100}"/>
                            </linearGradient>

                            <linearGradient id="vc-stand-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${theme.standGold.highlight}"/>
                                <stop offset="50%" stop-color="${theme.standGold.c18}"/>
                                <stop offset="100%" stop-color="${theme.standGold.c100}"/>
                            </linearGradient>

                            <!-- Fine Porcelain Platter Top -->
                            <linearGradient id="vc-porcelain-top" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${theme.porcelainTop.c0}"/>
                                <stop offset="60%" stop-color="${theme.porcelainTop.c60}"/>
                                <stop offset="100%" stop-color="${theme.porcelainTop.c100}"/>
                            </linearGradient>

                            <!-- Sponge Cylindrical 3D Shading -->
                            <linearGradient id="vc-sponge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${theme.spongeGrad.c0}"/>
                                <stop offset="12%" stop-color="${theme.spongeGrad.c12}"/>
                                <stop offset="32%" stop-color="${theme.spongeGrad.c32}"/>
                                <stop offset="52%" stop-color="${theme.spongeGrad.c52}"/>
                                <stop offset="78%" stop-color="${theme.spongeGrad.c78}"/>
                                <stop offset="100%" stop-color="${theme.spongeGrad.c100}"/>
                            </linearGradient>

                            <!-- Biscuit Sponge Filling -->
                            <linearGradient id="vc-biscuit-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${theme.biscuitFill.c0}"/>
                                <stop offset="50%" stop-color="${theme.biscuitFill.c50}"/>
                                <stop offset="100%" stop-color="${theme.biscuitFill.c100}"/>
                            </linearGradient>

                            <!-- Mirror Glaze (Body & Drips) -->
                            <linearGradient id="vc-glaze-body" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${theme.glazeBody.c0}"/>
                                <stop offset="12%" stop-color="${theme.glazeBody.c12}"/>
                                <stop offset="38%" stop-color="${theme.glazeBody.c38}"/>
                                <stop offset="68%" stop-color="${theme.glazeBody.c68}"/>
                                <stop offset="88%" stop-color="${theme.glazeBody.c88}"/>
                                <stop offset="100%" stop-color="${theme.glazeBody.c100}"/>
                            </linearGradient>

                            <!-- Glaze Pool on Top Surface -->
                            <radialGradient id="vc-glaze-pool" cx="50%" cy="40%" r="60%">
                                <stop offset="0%" stop-color="${theme.glazePool.c0}"/>
                                <stop offset="60%" stop-color="${theme.glazePool.c60}"/>
                                <stop offset="100%" stop-color="${theme.glazePool.c100}"/>
                            </radialGradient>

                            <!-- Fresh Glazed Strawberry Gradient -->
                            <radialGradient id="vc-berry-grad" cx="38%" cy="28%" r="68%">
                                <stop offset="0%" stop-color="#FF6B7A"/>
                                <stop offset="30%" stop-color="#FF1744"/>
                                <stop offset="72%" stop-color="#D50000"/>
                                <stop offset="100%" stop-color="#550015"/>
                            </radialGradient>

                            <!-- Indigo Blueberry Gradient -->
                            <radialGradient id="vc-blueberry-grad" cx="35%" cy="30%" r="68%">
                                <stop offset="0%" stop-color="#7986CB"/>
                                <stop offset="40%" stop-color="#303F9F"/>
                                <stop offset="80%" stop-color="#1A237E"/>
                                <stop offset="100%" stop-color="#0A0E32"/>
                            </radialGradient>

                            <!-- Calyx Leaf Gradient -->
                            <linearGradient id="vc-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#81C784"/>
                                <stop offset="50%" stop-color="#388E3C"/>
                                <stop offset="100%" stop-color="#1B5E20"/>
                            </linearGradient>

                            <!-- Chantilly Cream Rosette Gradient -->
                            <linearGradient id="vc-cream-rosette" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${theme.creamRosette.c0}"/>
                                <stop offset="60%" stop-color="${theme.creamRosette.c60}"/>
                                <stop offset="100%" stop-color="${theme.creamRosette.c100}"/>
                            </linearGradient>

                            <!-- 3D Pearl / Dragee Bead -->
                            <radialGradient id="vc-gold-pearl" cx="32%" cy="28%" r="68%">
                                <stop offset="0%" stop-color="${theme.pearlGrad.c0}"/>
                                <stop offset="28%" stop-color="${theme.pearlGrad.c28}"/>
                                <stop offset="65%" stop-color="${theme.pearlGrad.c65}"/>
                                <stop offset="100%" stop-color="${theme.pearlGrad.c100}"/>
                            </radialGradient>

                            <!-- Candle Wax Cylinder -->
                            <linearGradient id="vc-candle-wax" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${theme.candleWax.c0}"/>
                                <stop offset="35%" stop-color="${theme.candleWax.c35}"/>
                                <stop offset="70%" stop-color="${theme.candleWax.c70}"/>
                                <stop offset="100%" stop-color="${theme.candleWax.c100}"/>
                            </linearGradient>

                            <!-- Multi-tone Candle Flame Core Fallback -->
                            <radialGradient id="vc-flame-core" cx="50%" cy="75%" r="68%">
                                <stop offset="0%" stop-color="#FFFFFF"/>
                                <stop offset="22%" stop-color="#FFF9C4"/>
                                <stop offset="52%" stop-color="#FFCA28"/>
                                <stop offset="78%" stop-color="#FF9100"/>
                                <stop offset="100%" stop-color="#FF3D00"/>
                            </radialGradient>

                            <!-- Layered Radiant Candle Flame Gradients -->
                            <radialGradient id="vc-flame-outer" cx="50%" cy="65%" r="60%">
                                <stop offset="0%" stop-color="#FFF9C4"/>
                                <stop offset="25%" stop-color="#FFD54F"/>
                                <stop offset="55%" stop-color="#FF9100"/>
                                <stop offset="85%" stop-color="#FF3D00"/>
                                <stop offset="100%" stop-color="#D50000" stop-opacity="0.95"/>
                            </radialGradient>

                            <linearGradient id="vc-flame-inner" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stop-color="#FF9100"/>
                                <stop offset="35%" stop-color="#FFD54F"/>
                                <stop offset="75%" stop-color="#FFF9C4"/>
                                <stop offset="100%" stop-color="#FFFFFF"/>
                            </linearGradient>

                            <radialGradient id="vc-ambient-candlelight" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#FFE082" stop-opacity="0.55"/>
                                <stop offset="35%" stop-color="#FF9100" stop-opacity="0.25"/>
                                <stop offset="70%" stop-color="#FF3D00" stop-opacity="0.06"/>
                                <stop offset="100%" stop-color="#FF3D00" stop-opacity="0"/>
                            </radialGradient>

                            <filter id="vc-ambient-glow-blur" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="16"/>
                            </filter>

                            <filter id="vc-flame-glow" x="-80%" y="-80%" width="260%" height="260%">
                                <feGaussianBlur stdDeviation="3" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>

                            <filter id="vc-shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4"/>
                            </filter>

                            <clipPath id="vc-cut-clip-left">
                                <rect x="-100" y="0" width="282" height="360"/>
                            </clipPath>
                            <clipPath id="vc-cut-clip-right">
                                <rect x="178" y="0" width="282" height="360"/>
                            </clipPath>
                        </defs>

                        <!-- Ambient Candlelight Illumination across the top of the cake -->
                        <ellipse cx="180" cy="108" rx="150" ry="65" fill="url(#vc-ambient-candlelight)" filter="url(#vc-ambient-glow-blur)" class="vc-ambient-candlelight-glow"/>

                        <!-- ================= BASE PEDESTAL STAND (Static) ================= -->
                        <g class="vc-stand">
                            <!-- Soft Contact Shadow on Table Surface -->
                            <ellipse cx="180" cy="312" rx="146" ry="10" fill="rgba(0,0,0,0.35)" filter="url(#vc-shadow-blur)"/>
                            <!-- Pedestal Base Foot Gold -->
                            <ellipse cx="180" cy="305" rx="72" ry="11" fill="url(#vc-stand-gold)"/>
                            <ellipse cx="180" cy="303" rx="66" ry="9" fill="url(#vc-stand-gold-v)"/>
                            <ellipse cx="180" cy="301" rx="58" ry="6" fill="${theme.standGold.highlight}" opacity="0.4"/>
                            <!-- Fluted Pedestal Stem -->
                            <path d="M 166,270 C 166,285 160,296 156,303 L 204,303 C 200,296 194,285 194,270 Z" fill="url(#vc-stand-gold)"/>
                            <path d="M 176,270 C 176,285 174,296 172,303 L 188,303 C 186,296 184,285 184,270 Z" fill="${theme.standGold.highlight}" opacity="0.45"/>
                            <!-- Platter Rim Base Collar -->
                            <ellipse cx="180" cy="272" rx="158" ry="17" fill="url(#vc-stand-gold)"/>
                            <!-- Beveled Porcelain Platter Top -->
                            <ellipse cx="180" cy="269" rx="152" ry="15" fill="url(#vc-porcelain-top)" stroke="${theme.standGold.topStroke}" stroke-width="1.8"/>
                            <!-- Platter Inner Ambient Occlusion Shadow under Cake -->
                            <ellipse cx="180" cy="264" rx="126" ry="10" fill="rgba(0, 0, 0, 0.28)"/>
                        </g>

                        <!-- ================= LEFT HALF (Transforms on Cut) ================= -->
                        <g class="vc-half vc-left" clip-path="url(#vc-cut-clip-left)">
                            <!-- --- BOTTOM TIER (Tier 1) --- -->
                            <!-- Tier 1 Body (Cylindrical 3D Shading) -->
                            <path d="M 60,195 L 60,258 C 60,274 300,274 300,258 L 300,195 Z" fill="url(#vc-sponge-grad)" stroke="${theme.spongeGrad.stroke}" stroke-width="0.8"/>
                            <!-- Tier 1 Baked Sponge Cake Layer Divider -->
                            <path d="M 60,227 C 120,242 240,242 300,227 L 300,231 C 240,246 120,246 60,231 Z" fill="url(#vc-biscuit-fill)" opacity="0.85"/>
                            <path d="M 60,231 C 120,246 240,246 300,231 L 300,234 C 240,249 120,249 60,234 Z" fill="${theme.spongeJam}" opacity="0.9"/>
                            <!-- Tier 1 Top Surface -->
                            <ellipse cx="180" cy="195" rx="120" ry="18" fill="${theme.spongeGrad.c32 || '#FFF9F2'}"/>

                            <!-- Tier 1 Shadow Under Drips -->
                            <path d="M 60,197 C 63,210 67,226 74,226 C 80,226 83,212 87,204 C 90,201 93,201 96,204 C 100,214 105,240 114,240 C 122,240 126,216 130,205 C 133,202 137,202 140,205 C 144,213 148,228 155,228 C 161,228 164,215 168,206 C 171,203 175,203 178,206 C 182,216 187,244 195,244 C 203,244 207,218 211,206 C 214,203 218,203 221,206 C 225,214 229,230 236,230 C 242,230 245,216 249,205 C 252,202 256,202 259,205 C 263,214 268,238 276,238 C 283,238 287,217 291,204 C 294,201 297,202 300,197 C 240,215 120,215 60,197 Z" fill="rgba(0, 0, 0, 0.22)"/>

                            <!-- Tier 1 Luscious Organic Drips -->
                            <path d="M 60,195 C 63,208 67,224 74,224 C 80,224 83,210 87,202 C 90,199 93,199 96,202 C 100,212 105,238 114,238 C 122,238 126,214 130,203 C 133,200 137,200 140,203 C 144,211 148,226 155,226 C 161,226 164,213 168,204 C 171,201 175,201 178,204 C 182,214 187,242 195,242 C 203,242 207,216 211,204 C 214,201 218,201 221,204 C 225,212 229,228 236,228 C 242,228 245,214 249,203 C 252,200 256,200 259,203 C 263,212 268,236 276,236 C 283,236 287,215 291,202 C 294,199 297,200 300,195 C 240,213 120,213 60,195 Z" fill="url(#vc-glaze-body)"/>

                            <!-- Tier 1 Drip Bulbs Glossy Specular Highlights -->
                            <ellipse cx="74" cy="221" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="114" cy="235" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="155" cy="223" rx="3.8" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="195" cy="239" rx="4.5" ry="2.2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="236" cy="225" rx="3.8" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="276" cy="233" rx="4" ry="2" fill="rgba(255,255,255,0.75)"/>

                            <!-- Tier 1 Base Pearl Dragees Border -->
                            <g>
                                <ellipse cx="66" cy="261" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="80" cy="265" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="97" cy="268" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="116" cy="270" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="136" cy="272" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="157" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="180" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="203" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="224" cy="272" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="244" cy="270" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="263" cy="268" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="280" cy="265" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="294" cy="261" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
                                <circle cx="66" cy="258" r="4.6" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="80" cy="262" r="4.8" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="97" cy="265" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="116" cy="267" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="136" cy="269" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="157" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="180" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="203" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="224" cy="269" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="244" cy="267" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="263" cy="265" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="280" cy="262" r="4.8" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="294" cy="258" r="4.6" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                            </g>

                            <!-- --- Tier 1 Ledge Decorations (Left Side) --- -->
                            ${theme.ledgeLeft}

                            <!-- Ambient Shadow Cast by Top Tier onto Bottom Tier Top -->
                            <ellipse cx="180" cy="194" rx="82" ry="12" fill="rgba(0, 0, 0, 0.35)"/>

                            <!-- --- TOP TIER (Tier 2) --- -->
                            <!-- Tier 2 Body (Cylindrical 3D Shading) -->
                            <path d="M 100,132 L 100,192 C 100,205 260,205 260,192 L 260,132 Z" fill="url(#vc-sponge-grad)" stroke="${theme.spongeGrad.stroke}" stroke-width="0.8"/>
                            <!-- Tier 2 Sponge Layer Divider -->
                            <path d="M 100,158 C 140,169 220,169 260,158 L 260,161 C 220,172 140,172 100,161 Z" fill="url(#vc-biscuit-fill)" opacity="0.85"/>
                            <path d="M 100,161 C 140,172 220,172 260,161 L 260,163 C 220,174 140,174 100,163 Z" fill="${theme.spongeJam}" opacity="0.9"/>
                            <!-- Tier 2 Top Surface with Mirror Glaze Pool -->
                            <ellipse cx="180" cy="132" rx="80" ry="14" fill="url(#vc-glaze-pool)"/>
                            <!-- Specular Mirror Gloss Sheen -->
                            <ellipse cx="170" cy="129" rx="55" ry="6.5" fill="rgba(255,255,255,0.4)"/>
                            <!-- Warm Candlelight Reflections in Glaze Pool -->
                            <ellipse cx="118" cy="130" rx="9" ry="2.2" fill="#FFE082" opacity="0.6"/>
                            <ellipse cx="148" cy="131" rx="10" ry="2.4" fill="#FFE082" opacity="0.65"/>
                            <ellipse cx="180" cy="132" rx="11" ry="2.6" fill="#FFF9C4" opacity="0.7"/>

                            <!-- Tier 2 Shadow Under Drips -->
                            <path d="M 100,134 C 102,144 106,157 112,157 C 117,157 119,144 122,138 C 125,136 128,136 130,138 C 133,146 136,170 143,170 C 149,170 152,148 156,139 C 159,137 162,137 165,139 C 168,145 171,154 176,154 C 180,154 183,145 186,139 C 189,137 192,137 195,139 C 198,147 202,167 208,167 C 214,167 217,149 221,139 C 224,137 227,137 230,139 C 233,145 236,156 241,156 C 246,156 249,146 252,138 C 255,136 258,137 260,134 C 220,148 140,148 100,134 Z" fill="rgba(0, 0, 0, 0.25)"/>

                            <!-- Tier 2 Organic Drips -->
                            <path d="M 100,132 C 102,142 106,155 112,155 C 117,155 119,142 122,136 C 125,134 128,134 130,136 C 133,144 136,168 143,168 C 149,168 152,146 156,137 C 159,135 162,135 165,137 C 168,143 171,152 176,152 C 180,152 183,143 186,137 C 189,135 192,135 195,137 C 198,145 202,165 208,165 C 214,165 217,147 221,137 C 224,135 227,135 230,137 C 233,143 236,154 241,154 C 246,154 249,144 252,136 C 255,134 258,135 260,132 C 220,146 140,146 100,132 Z" fill="url(#vc-glaze-body)"/>

                            <!-- Tier 2 Drip Bulbs Specular Gloss Highlights -->
                            <ellipse cx="112" cy="152" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="143" cy="165" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="176" cy="149" rx="3.6" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="208" cy="162" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="241" cy="151" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>

                            <!-- --- TOP TIER GOURMET TOPPINGS (Left Side & Center) --- -->
                            ${theme.topToppingsLeft}
                            ${theme.centerpiece}
                            ${theme.sparklesLeft}

                            <!-- --- CANDLES 0 & 1 (Left Half) --- -->
                            <!-- Candle 0 (x=118) -->
                            <g id="vc-candle-0" class="vc-candle-group" transform="translate(118, 84)">
                                <ellipse cx="0" cy="44" rx="5.5" ry="2.2" fill="url(#vc-stand-gold)"/>
                                <rect x="-4" y="0" width="8" height="44" rx="2.5" fill="url(#vc-candle-wax)"/>
                                <path d="M -4,8 L 4,15 M -4,18 L 4,25 M -4,28 L 4,35" stroke="url(#vc-stand-gold)" stroke-width="2.6" stroke-linecap="round"/>
                                <path d="M 0,0 L 0,-6" stroke="#2B1810" stroke-width="1.6" stroke-linecap="round"/>
                                <circle cx="0" cy="-5" r="1.3" fill="#FF3D00"/>
                                <g id="vc-flame-0" class="vc-flame-item vc-flame-item-1">
                                    <path d="M 0,-5 C -6.2,-13 -5.2,-23 0,-32 C 5.2,-23 6.2,-13 0,-5 Z" fill="url(#vc-flame-outer)" filter="url(#vc-flame-glow)"/>
                                    <path d="M 0,-6 C -3.8,-13 -3.2,-21 0,-27 C 3.2,-21 3.8,-13 0,-6 Z" fill="url(#vc-flame-inner)"/>
                                    <ellipse cx="0" cy="-14" rx="1.8" ry="6.5" fill="#FFFFFF" opacity="0.98"/>
                                    <ellipse cx="0" cy="-6" rx="2" ry="1.2" fill="#2979FF" opacity="0.6"/>
                                </g>
                                <circle id="vc-smoke-0" class="vc-smoke-item" cx="0" cy="-22" r="5" fill="rgba(255,255,255,0.75)" style="display:none;opacity:0;" />
                            </g>

                            <!-- Candle 1 (x=148) -->
                            <g id="vc-candle-1" class="vc-candle-group" transform="translate(148, 77)">
                                <ellipse cx="0" cy="48" rx="5.5" ry="2.2" fill="url(#vc-stand-gold)"/>
                                <rect x="-4" y="0" width="8" height="48" rx="2.5" fill="url(#vc-candle-wax)"/>
                                <path d="M -4,8 L 4,15 M -4,18 L 4,25 M -4,28 L 4,35 M -4,38 L 4,45" stroke="url(#vc-stand-gold)" stroke-width="2.6" stroke-linecap="round"/>
                                <path d="M 0,0 L 0,-6" stroke="#2B1810" stroke-width="1.6" stroke-linecap="round"/>
                                <circle cx="0" cy="-5" r="1.3" fill="#FF3D00"/>
                                <g id="vc-flame-1" class="vc-flame-item vc-flame-item-2">
                                    <path d="M 0,-5 C -6.5,-13 -5.5,-23 0,-33 C 5.5,-23 6.5,-13 0,-5 Z" fill="url(#vc-flame-outer)" filter="url(#vc-flame-glow)"/>
                                    <path d="M 0,-6 C -4,-13 -3.4,-21 0,-28 C 3.4,-21 4,-13 0,-6 Z" fill="url(#vc-flame-inner)"/>
                                    <ellipse cx="0" cy="-14" rx="2" ry="7" fill="#FFFFFF" opacity="0.98"/>
                                    <ellipse cx="0" cy="-6" rx="2.2" ry="1.2" fill="#2979FF" opacity="0.6"/>
                                </g>
                                <circle id="vc-smoke-1" class="vc-smoke-item" cx="0" cy="-22" r="5" fill="rgba(255,255,255,0.75)" style="display:none;opacity:0;" />
                            </g>
                        </g>

                        <!-- ================= RIGHT HALF (Transforms on Cut) ================= -->
                        <g class="vc-half vc-right" clip-path="url(#vc-cut-clip-right)">
                            <!-- --- BOTTOM TIER (Tier 1) --- -->
                            <path d="M 60,195 L 60,258 C 60,274 300,274 300,258 L 300,195 Z" fill="url(#vc-sponge-grad)" stroke="${theme.spongeGrad.stroke}" stroke-width="0.8"/>
                            <path d="M 60,227 C 120,242 240,242 300,227 L 300,231 C 240,246 120,246 60,231 Z" fill="url(#vc-biscuit-fill)" opacity="0.85"/>
                            <path d="M 60,231 C 120,246 240,246 300,231 L 300,234 C 240,249 120,249 60,234 Z" fill="${theme.spongeJam}" opacity="0.9"/>
                            <ellipse cx="180" cy="195" rx="120" ry="18" fill="${theme.spongeGrad.c32 || '#FFF9F2'}"/>

                            <path d="M 60,197 C 63,210 67,226 74,226 C 80,226 83,212 87,204 C 90,201 93,201 96,204 C 100,214 105,240 114,240 C 122,240 126,216 130,205 C 133,202 137,202 140,205 C 144,213 148,228 155,228 C 161,228 164,215 168,206 C 171,203 175,203 178,206 C 182,216 187,244 195,244 C 203,244 207,218 211,206 C 214,203 218,203 221,206 C 225,214 229,230 236,230 C 242,230 245,216 249,205 C 252,202 256,202 259,205 C 263,214 268,238 276,238 C 283,238 287,217 291,204 C 294,201 297,202 300,197 C 240,215 120,215 60,197 Z" fill="rgba(0, 0, 0, 0.22)"/>

                            <path d="M 60,195 C 63,208 67,224 74,224 C 80,224 83,210 87,202 C 90,199 93,199 96,202 C 100,212 105,238 114,238 C 122,238 126,214 130,203 C 133,200 137,200 140,203 C 144,211 148,226 155,226 C 161,226 164,213 168,204 C 171,201 175,201 178,204 C 182,214 187,242 195,242 C 203,242 207,216 211,204 C 214,201 218,201 221,204 C 225,212 229,228 236,228 C 242,228 245,214 249,203 C 252,200 256,200 259,203 C 263,212 268,236 276,236 C 283,236 287,215 291,202 C 294,199 297,200 300,195 C 240,213 120,213 60,195 Z" fill="url(#vc-glaze-body)"/>

                            <ellipse cx="74" cy="221" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="114" cy="235" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="155" cy="223" rx="3.8" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="195" cy="239" rx="4.5" ry="2.2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="236" cy="225" rx="3.8" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="276" cy="233" rx="4" ry="2" fill="rgba(255,255,255,0.75)"/>

                            <!-- Pearl Drop Shadows & Pearls (Right Half) -->
                            <g>
                                <ellipse cx="66" cy="261" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="80" cy="265" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="97" cy="268" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="116" cy="270" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="136" cy="272" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="157" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="180" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="203" cy="273" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="224" cy="272" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="244" cy="270" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="263" cy="268" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="280" cy="265" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/><ellipse cx="294" cy="261" rx="4.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
                                <circle cx="66" cy="258" r="4.6" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="80" cy="262" r="4.8" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="97" cy="265" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="116" cy="267" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="136" cy="269" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="157" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="180" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="203" cy="270" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="224" cy="269" r="5.2" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="244" cy="267" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="263" cy="265" r="5" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="280" cy="262" r="4.8" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                                <circle cx="294" cy="258" r="4.6" fill="url(#vc-gold-pearl)" stroke="#FFFFFF" stroke-width="0.6"/>
                            </g>

                            <!-- --- Tier 1 Ledge Decorations (Right Side) --- -->
                            ${theme.ledgeRight}

                            <!-- Ambient Shadow Under Top Tier -->
                            <ellipse cx="180" cy="194" rx="82" ry="12" fill="rgba(0, 0, 0, 0.35)"/>

                            <!-- --- TOP TIER (Tier 2) --- -->
                            <path d="M 100,132 L 100,192 C 100,205 260,205 260,192 L 260,132 Z" fill="url(#vc-sponge-grad)" stroke="${theme.spongeGrad.stroke}" stroke-width="0.8"/>
                            <path d="M 100,158 C 140,169 220,169 260,158 L 260,161 C 220,172 140,172 100,161 Z" fill="url(#vc-biscuit-fill)" opacity="0.85"/>
                            <path d="M 100,161 C 140,172 220,172 260,161 L 260,163 C 220,174 140,174 100,163 Z" fill="${theme.spongeJam}" opacity="0.9"/>
                            <ellipse cx="180" cy="132" rx="80" ry="14" fill="url(#vc-glaze-pool)"/>
                            <ellipse cx="170" cy="129" rx="55" ry="6.5" fill="rgba(255,255,255,0.4)"/>
                            <!-- Warm Candlelight Reflections in Glaze Pool -->
                            <ellipse cx="180" cy="132" rx="11" ry="2.6" fill="#FFF9C4" opacity="0.7"/>
                            <ellipse cx="212" cy="131" rx="10" ry="2.4" fill="#FFE082" opacity="0.65"/>
                            <ellipse cx="242" cy="130" rx="9" ry="2.2" fill="#FFE082" opacity="0.6"/>

                            <path d="M 100,134 C 102,144 106,157 112,157 C 117,157 119,144 122,138 C 125,136 128,136 130,138 C 133,146 136,170 143,170 C 149,170 152,148 156,139 C 159,137 162,137 165,139 C 168,145 171,154 176,154 C 180,154 183,145 186,139 C 189,137 192,137 195,139 C 198,147 202,167 208,167 C 214,167 217,149 221,139 C 224,137 227,137 230,139 C 233,145 236,156 241,156 C 246,156 249,146 252,138 C 255,136 258,137 260,134 C 220,148 140,148 100,134 Z" fill="rgba(0, 0, 0, 0.25)"/>

                            <path d="M 100,132 C 102,142 106,155 112,155 C 117,155 119,142 122,136 C 125,134 128,134 130,136 C 133,144 136,168 143,168 C 149,168 152,146 156,137 C 159,135 162,135 165,137 C 168,143 171,152 176,152 C 180,152 183,143 186,137 C 189,135 192,135 195,137 C 198,145 202,165 208,165 C 214,165 217,147 221,137 C 224,135 227,135 230,137 C 233,143 236,154 241,154 C 246,154 249,144 252,136 C 255,134 258,135 260,132 C 220,146 140,146 100,132 Z" fill="url(#vc-glaze-body)"/>

                            <ellipse cx="112" cy="152" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="143" cy="165" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="176" cy="149" rx="3.6" ry="1.8" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="208" cy="162" rx="4.2" ry="2" fill="rgba(255,255,255,0.75)"/>
                            <ellipse cx="241" cy="151" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.75)"/>

                            <!-- --- TOP TIER GOURMET TOPPINGS (Right Side & Center) --- -->
                            ${theme.topToppingsRight}
                            ${theme.centerpiece}
                            ${theme.sparklesRight}

                            <!-- --- CANDLES 3 & 4 (Right Half) --- -->
                            <!-- Candle 3 (x=212) -->
                            <g id="vc-candle-3" class="vc-candle-group" transform="translate(212, 77)">
                                <ellipse cx="0" cy="48" rx="5.5" ry="2.2" fill="url(#vc-stand-gold)"/>
                                <rect x="-4" y="0" width="8" height="48" rx="2.5" fill="url(#vc-candle-wax)"/>
                                <path d="M -4,8 L 4,15 M -4,18 L 4,25 M -4,28 L 4,35 M -4,38 L 4,45" stroke="url(#vc-stand-gold)" stroke-width="2.6" stroke-linecap="round"/>
                                <path d="M 0,0 L 0,-6" stroke="#2B1810" stroke-width="1.6" stroke-linecap="round"/>
                                <circle cx="0" cy="-5" r="1.3" fill="#FF3D00"/>
                                <g id="vc-flame-3" class="vc-flame-item vc-flame-item-4">
                                    <path d="M 0,-5 C -6.5,-13 -5.5,-23 0,-33 C 5.5,-23 6.5,-13 0,-5 Z" fill="url(#vc-flame-outer)" filter="url(#vc-flame-glow)"/>
                                    <path d="M 0,-6 C -4,-13 -3.4,-21 0,-28 C 3.4,-21 4,-13 0,-6 Z" fill="url(#vc-flame-inner)"/>
                                    <ellipse cx="0" cy="-14" rx="2" ry="7" fill="#FFFFFF" opacity="0.98"/>
                                    <ellipse cx="0" cy="-6" rx="2.2" ry="1.2" fill="#2979FF" opacity="0.6"/>
                                </g>
                                <circle id="vc-smoke-3" class="vc-smoke-item" cx="0" cy="-22" r="5" fill="rgba(255,255,255,0.75)" style="display:none;opacity:0;" />
                            </g>

                            <!-- Candle 4 (x=242) -->
                            <g id="vc-candle-4" class="vc-candle-group" transform="translate(242, 84)">
                                <ellipse cx="0" cy="44" rx="5.5" ry="2.2" fill="url(#vc-stand-gold)"/>
                                <rect x="-4" y="0" width="8" height="44" rx="2.5" fill="url(#vc-candle-wax)"/>
                                <path d="M -4,8 L 4,15 M -4,18 L 4,25 M -4,28 L 4,35" stroke="url(#vc-stand-gold)" stroke-width="2.6" stroke-linecap="round"/>
                                <path d="M 0,0 L 0,-6" stroke="#2B1810" stroke-width="1.6" stroke-linecap="round"/>
                                <circle cx="0" cy="-5" r="1.3" fill="#FF3D00"/>
                                <g id="vc-flame-4" class="vc-flame-item vc-flame-item-5">
                                    <path d="M 0,-5 C -6.2,-13 -5.2,-23 0,-32 C 5.2,-23 6.2,-13 0,-5 Z" fill="url(#vc-flame-outer)" filter="url(#vc-flame-glow)"/>
                                    <path d="M 0,-6 C -3.8,-13 -3.2,-21 0,-27 C 3.2,-21 3.8,-13 0,-6 Z" fill="url(#vc-flame-inner)"/>
                                    <ellipse cx="0" cy="-14" rx="1.8" ry="6.5" fill="#FFFFFF" opacity="0.98"/>
                                    <ellipse cx="0" cy="-6" rx="2" ry="1.2" fill="#2979FF" opacity="0.6"/>
                                </g>
                                <circle id="vc-smoke-4" class="vc-smoke-item" cx="0" cy="-22" r="5" fill="rgba(255,255,255,0.75)" style="display:none;opacity:0;" />
                            </g>
                        </g>

                        <!-- ================= CENTERPIECE CANDLE 2 (Center X=180, vanishes cleanly on cut) ================= -->
                        <g id="vc-candle-2" class="vc-candle-group" transform="translate(180, 70)">
                            <ellipse cx="0" cy="52" rx="5.5" ry="2.2" fill="url(#vc-stand-gold)"/>
                            <rect x="-4" y="0" width="8" height="52" rx="2.5" fill="url(#vc-candle-wax)"/>
                            <path d="M -4,8 L 4,15 M -4,18 L 4,25 M -4,28 L 4,35 M -4,38 L 4,45" stroke="url(#vc-stand-gold)" stroke-width="2.6" stroke-linecap="round"/>
                            <path d="M 0,0 L 0,-6" stroke="#2B1810" stroke-width="1.6" stroke-linecap="round"/>
                            <circle cx="0" cy="-5" r="1.3" fill="#FF3D00"/>
                            <g id="vc-flame-2" class="vc-flame-item vc-flame-item-3">
                                <path d="M 0,-5 C -7,-14 -5.8,-25 0,-35 C 5.8,-25 7,-14 0,-5 Z" fill="url(#vc-flame-outer)" filter="url(#vc-flame-glow)"/>
                                <path d="M 0,-6 C -4.4,-14 -3.6,-22 0,-30 C 3.6,-22 4.4,-14 0,-6 Z" fill="url(#vc-flame-inner)"/>
                                <ellipse cx="0" cy="-15" rx="2.2" ry="7.5" fill="#FFFFFF" opacity="0.98"/>
                                <ellipse cx="0" cy="-6" rx="2.4" ry="1.3" fill="#2979FF" opacity="0.6"/>
                            </g>
                            <circle id="vc-smoke-2" class="vc-smoke-item" cx="0" cy="-22" r="5" fill="rgba(255,255,255,0.75)" style="display:none;opacity:0;" />
                        </g>
                    </svg>
                    </div>
                </div>

                <!-- Blow & Cut Button -->
                <div class="vc-btn-wrap" style="margin-top: 16px;">
                    <button class="vc-btn" id="vc-blow-btn" type="button">
                        <i class="fas fa-wind"></i>
                        <span>Blow Candles &amp; Cut Cake!</span>
                    </button>
                </div>

                <!-- Wish Card -->
                <div class="vc-wish-card" id="vc-wish-card">
                    <h3 class="vc-wish-title"><i class="fas fa-star" style="color:#FFD700;"></i> Make a Wish! <i class="fas fa-star" style="color:#FFD700;"></i></h3>
                    <p class="vc-wish-desc">May all your dreams and sweetest wishes come true this year! 🌟🎂</p>
                </div>

                <!-- Cake Slices Sharing -->
                <div class="vc-slices-wrapper" id="vc-slices-wrapper">
                    <h3 class="vc-slices-heading"><i class="fas fa-utensils" style="color:#FFE082;"></i> Here is your Cake Slice Sharing! 🍰</h3>
                    <p class="vc-slices-sub">Tap any slice to take a bite!</p>
                    <div class="vc-slices-grid">
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">🍰🍓</div>
                            <div class="vc-slice-badge">FOR YOU</div>
                            <div class="vc-slice-label">Here is a slice for <strong>You</strong>! 😋</div>
                            <div class="vc-slice-toast">Yum! Delicious! 😋</div>
                        </div>
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">🍰🍒</div>
                            <div class="vc-slice-badge">FOR ME</div>
                            <div class="vc-slice-label">Here is a slice for <strong>Me</strong>! 🎂</div>
                            <div class="vc-slice-toast">Save me a bite! 🎂</div>
                        </div>
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">🍰🌟</div>
                            <div class="vc-slice-badge">FOR EVERYONE</div>
                            <div class="vc-slice-label">A big slice for <strong>Everyone</strong>! 🎉</div>
                            <div class="vc-slice-toast">Party Time! 🎉</div>
                        </div>
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">🍰💖</div>
                            <div class="vc-slice-badge">EXTRA SLICE</div>
                            <div class="vc-slice-label">An extra slice of <strong>Love</strong>! 💕</div>
                            <div class="vc-slice-toast">Made with Love! 💖</div>
                        </div>
                    </div>
                </div>

                <audio id="vc-audio"
                    src="/assets/sounds/crackers-mini.mp3"
                    preload="auto" style="display:none;"></audio>
                `;

                if (w.insertSectionBeforeFinal) {
                    w.insertSectionBeforeFinal(d, section);
                } else {
                    const container = d.getElementById('sections-container') || d.body;
                    const finalMessage = d.getElementById('magic-final-surprise-section');
                    const cta = d.getElementById('magic-cta-section');
                    const anchor = finalMessage || cta;
                    if (anchor && anchor.parentNode === container) {
                        container.insertBefore(section, anchor);
                    } else {
                        container.appendChild(section);
                    }
                }

                // Ambient floating petals
                (function createAmbientPetals() {
                    const petalColors = [
                        'rgba(255,105,180,0.7)', 'rgba(255,182,193,0.8)', 'rgba(219,112,147,0.7)',
                        'rgba(255,215,0,0.5)', 'rgba(255,160,180,0.65)'
                    ];
                    const count = 14;
                    for (let i = 0; i < count; i++) {
                        const p = d.createElement('div');
                        p.className = 'vc-petal';
                        const size = 7 + Math.random() * 11;
                        const left = Math.random() * 95;
                        const bottom = -(size + 10);
                        const color = petalColors[Math.floor(Math.random() * petalColors.length)];
                        const dur = 5 + Math.random() * 7;
                        const delay = Math.random() * -10;
                        const dx = (Math.random() - 0.5) * 60;
                        const rot = Math.random() * 540 - 270;
                        p.style.cssText = 'width:' + size + 'px; height:' + (size * 0.75) + 'px; left:' + left + '%; bottom:' + bottom + 'px; background:' + color + '; border-radius: 50% 0 50% 0; filter: blur(' + (Math.random() < 0.3 ? '1px' : '0px') + '); --vc-petal-dur:' + dur + 's; --vc-petal-delay:' + delay + 's; --vc-petal-dx:' + dx + 'px; --vc-petal-rot:' + rot + 'deg;';
                        section.appendChild(p);
                    }
                })();

                // Slice tapping interactions
                const sliceCards = section.querySelectorAll('.vc-slice-card');
                sliceCards.forEach(cardEl => {
                    cardEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const toast = cardEl.querySelector('.vc-slice-toast');
                        if (toast) {
                            toast.classList.remove('pop');
                            void toast.offsetWidth;
                            toast.classList.add('pop');
                        }
                        const cfn = w.confetti || w.canvasConfetti || (typeof window !== 'undefined' && (window.confetti || window.canvasConfetti));
                        if (cfn) {
                            const rect = cardEl.getBoundingClientRect();
                            const x = (rect.left + rect.width / 2) / (w.innerWidth || 800);
                            const y = (rect.top + rect.height / 2) / (w.innerHeight || 600);
                            cfn({ particleCount: 35, spread: 60, origin: { x, y: Math.max(0.2, y) }, zIndex: 99999 });
                        }
                    });
                });

                const btn = section.querySelector('#vc-blow-btn');
                const stage = section.querySelector('#vc-cake-stage');
                const rotator = section.querySelector('#vc-cake-rotator');
                const blowAndCutHandler = () => {
                    if (rollTimer) {
                        clearTimeout(rollTimer);
                        rollTimer = null;
                    }
                    if (stage) {
                        stage.classList.remove('rolling-in');
                        stage.classList.remove('is-swaying');
                    }
                    if (rotator) {
                        rotator.classList.remove('is-idle-swaying');
                    }
                    triggerBlowAndCutCake(section);
                };
                if (btn) btn.addEventListener('click', blowAndCutHandler);
                if (stage) stage.addEventListener('click', blowAndCutHandler);

                // Rolling entrance & luxury idle swaying
                let rollTimer = null;
                let hasRolled = false;
                let rollObserver = null;

                const startRollingEntrance = () => {
                    if (hasRolled) return;
                    hasRolled = true;
                    if (stage) {
                        stage.classList.remove('rolling-in');
                        if (rotator) rotator.classList.remove('is-idle-swaying');
                        void stage.offsetWidth;
                        stage.classList.add('rolling-in');
                        rollTimer = setTimeout(() => {
                            if (stage) {
                                stage.classList.remove('rolling-in');
                                stage.classList.add('is-swaying');
                            }
                            if (rotator && !section.getAttribute('data-cake-done')) {
                                rotator.classList.add('is-idle-swaying');
                            }
                            rollTimer = null;
                        }, 1380);
                    }
                };

                try {
                    const rect = (stage || section).getBoundingClientRect ? (stage || section).getBoundingClientRect() : null;
                    const inView = rect && (rect.top < (w.innerHeight || 800) && rect.bottom > 0);
                    const WinObserver = w.IntersectionObserver || (typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : null);

                    if (inView) {
                        startRollingEntrance();
                    } else if (WinObserver) {
                        rollObserver = new WinObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    startRollingEntrance();
                                    if (rollObserver) {
                                        rollObserver.disconnect();
                                        rollObserver = null;
                                    }
                                }
                            });
                        }, { threshold: 0.15 });
                        rollObserver.observe(stage || section);
                    } else {
                        startRollingEntrance();
                    }
                } catch (e) {
                    startRollingEntrance();
                }

                return {
                    cleanup: () => {
                        if (rollTimer) {
                            clearTimeout(rollTimer);
                            rollTimer = null;
                        }
                        if (rollObserver) {
                            rollObserver.disconnect();
                            rollObserver = null;
                        }
                        section.remove();
                    }
                };
            },
            disable(d) {
                d?.getElementById('magic-virtual-cake-section')?.remove();
            }
        },
        virtualHug: {
            enable(d, w, userName, customText) {
                const existingHug = d.getElementById('magic-virtual-hug-section');
                if (existingHug) existingHug.remove();

                // Ensure fonts
                if (!d.getElementById('magic-virtual-hug-fonts')) {
                    const link = d.createElement('link');
                    link.id = 'magic-virtual-hug-fonts';
                    link.rel = 'stylesheet';
                    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Lora:ital,wght@0,500;1,400&family=Quicksand:wght@600;700&family=Outfit:wght@600;700;800&display=swap';
                    (d.head || d.body)?.appendChild(link);
                }

                // Ensure FontAwesome
                if (!d.getElementById('greeter-font-awesome')) {
                    const fa = d.createElement('link');
                    fa.id = 'greeter-font-awesome';
                    fa.rel = 'stylesheet';
                    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
                    d.head.appendChild(fa);
                }

                // Styles
                if (!d.getElementById('magic-virtual-hug-styles')) {
                    const s = d.createElement('style');
                    s.id = 'magic-virtual-hug-styles';
                    s.textContent = `
                .vh-section {
                    position: relative;
                    padding: clamp(24px, 3vw, 36px) clamp(16px, 2.5vw, 26px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    overflow: hidden;
                    border-radius: clamp(20px, 2.5vw, 30px);
                    margin: clamp(18px, 2.5vw, 28px) auto !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    max-width: 560px;
                    width: 92%;
                    align-self: center;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 240, 245, 0.96) 100%);
                    border: 2px solid rgba(255, 105, 180, 0.3);
                    box-shadow: 0 15px 35px rgba(255, 105, 180, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
                    box-sizing: border-box;
                    font-family: 'Quicksand', sans-serif;
                    z-index: 10;
                }
                .vh-anim {
                    font-size: clamp(3rem, 4.5vw, 3.8rem);
                    margin-bottom: 10px;
                    animation: vhHugPulse 2s ease-in-out infinite;
                    display: inline-block;
                    filter: drop-shadow(0 4px 12px rgba(255, 105, 180, 0.3));
                }
                @keyframes vhHugPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                .vh-lbl {
                    font-family: 'Cinzel', serif;
                    font-size: clamp(1.3rem, 3vw, 2.2rem);
                    font-weight: 800;
                    color: #8b1a5c;
                    margin-bottom: 12px;
                    letter-spacing: 0.5px;
                }
                .vh-desc {
                    font-family: 'Lora', serif;
                    font-size: clamp(1.02rem, 1.6vw, 1.25rem);
                    line-height: 1.8;
                    color: #6b4c5a;
                    font-style: italic;
                    margin-bottom: 24px;
                    max-width: 680px;
                }
                .vh-btn {
                    background: linear-gradient(135deg, #ff69b4, #e83a59);
                    color: white;
                    border: none;
                    padding: clamp(14px, 2vw, 18px) clamp(28px, 3.5vw, 48px);
                    border-radius: 50px;
                    font-size: clamp(1.02rem, 1.5vw, 1.22rem);
                    font-weight: 700;
                    font-family: 'Quicksand', sans-serif;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(255, 105, 180, 0.35);
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    text-decoration: none;
                }
                .vh-btn:hover {
                    transform: translateY(-3px) scale(1.03);
                    box-shadow: 0 12px 25px rgba(255, 105, 180, 0.5);
                    filter: brightness(1.05);
                }
                .vh-btn:active {
                    transform: translateY(0) scale(0.98);
                }
                .vh-heart-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    z-index: 100000;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.5s ease;
                }
                .vh-heart-overlay.show {
                    opacity: 1;
                    pointer-events: auto;
                }
                `;
                    d.head.appendChild(s);
                }

                const recipient = userName || 'You';
                const defaultMsg = `Whenever you need a smile, a little comfort, or a gentle reminder of how special you are \u2014 this warm hug is always here for you. Distance means so little when you mean so much! &#129303;`;
                let hugText = (customText && customText.trim()) ? customText.trim() : defaultMsg;
                if (hugText.includes("Send a warm and loving virtual hug") || hugText.includes("प्यारा और प्यार भरा")) {
                    hugText = defaultMsg;
                }

                const section = d.createElement('section');
                section.id = 'magic-virtual-hug-section';
                section.className = 'vh-section';

                section.innerHTML = `
                <div class="vh-anim">&#129303;</div>
                <div class="vh-lbl" id="vhTitle">A Warm Hug For ${recipient}</div>
                <div class="vh-desc" id="vhDesc">${hugText}</div>
                <button class="vh-btn" id="vhBtn">
                    <i class="fas fa-heart"></i>
                    <span id="vhBtnText">Hug For You &#129303;</span>
                </button>
            `;

                // Insert into DOM
                if (w.insertSectionBeforeFinal) {
                    w.insertSectionBeforeFinal(d, section);
                } else {
                    const container = d.getElementById('sections-container') || d.body;
                    const finalMessage = d.getElementById('magic-final-surprise-section');
                    const cta = d.getElementById('magic-cta-section');
                    const anchor = finalMessage || cta;
                    if (anchor && anchor.parentNode === container) { container.insertBefore(section, anchor); } else { container.appendChild(section); }
                }

                const scrollFn = w.scrollToElement || (w.parent && w.parent.scrollToElement);
                if (scrollFn) scrollFn(d, section);

                // Overlay element for petal animation
                let overlay = d.getElementById('magic-vh-overlay');
                if (!overlay) {
                    overlay = d.createElement('div');
                    overlay.id = 'magic-vh-overlay';
                    overlay.className = 'vh-heart-overlay';
                    d.body.appendChild(overlay);
                }

                // Animation function
                const btn = section.querySelector('#vhBtn');
                let isAnimating = false;

                const createRosePetalHeart = () => {
                    triggerVirtualHug(section);
                };

                if (btn) btn.addEventListener('click', createRosePetalHeart);

                return {
                    cleanup: () => {
                        section.remove();
                        d.getElementById('magic-vh-overlay')?.remove();
                    }
                };
            },
            disable(d) {
                d?.getElementById('magic-virtual-hug-section')?.remove();
                d?.getElementById('magic-vh-overlay')?.remove();
            }
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // 🌸 FLOWER BOUQUET – PRO Feature
    // Full-width slide-in section with flippable bouquet card
    // ══════════════════════════════════════════════════════════════════
    featureMap.flowerBouquet = {
        enable: function (d, w, userName, customText, images, customEmoji) {
            if (!d || !w) return;
            injectFontsIfNeeded(d);

            let section = d.getElementById('magic-flower-bouquet-section');
            if (section) section.remove();

            // Selected bouquet index from customEmoji field (used as bouquet ID)
            const bouquetId = (customEmoji && customEmoji.trim()) ? customEmoji.trim() : 'F2';
            // Custom back-of-card message
            const cardMsg = (customText && customText.trim()) ? customText.trim()
                : (userName ? `A bouquet of love for ${userName} 🌹` : 'A bouquet of love for you 🌹');

            // Inject or update styles
            let s = d.getElementById('magic-fb-styles');
            if (!s) {
                s = d.createElement('style');
                s.id = 'magic-fb-styles';
                (d.head || d.body).appendChild(s);
            }
            s.textContent = `
                @keyframes fb-slide-in {
                    0% { opacity: 0; transform: translateY(80px) scale(0.95); }
                    70% { opacity: 1; transform: translateY(-8px) scale(1.01); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fb-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes fb-glow-pulse {
                    0%, 100% { box-shadow: 0 0 24px rgba(255,120,150,0.35), 0 8px 32px rgba(255,160,100,0.2); }
                    50% { box-shadow: 0 0 48px rgba(255,120,150,0.65), 0 16px 48px rgba(255,160,100,0.4); }
                }
                @keyframes fb-petal-float {
                    0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.85; }
                    50% { transform: translateY(-14px) rotate(18deg) scale(1.08); opacity: 1; }
                    100% { transform: translateY(0) rotate(-8deg) scale(0.97); opacity: 0.85; }
                }
                @keyframes fb-card-shine {
                    0% { left: -130%; }
                    60%, 100% { left: 140%; }
                }
                #magic-flower-bouquet-section {
                    width: 92% !important;
                    max-width: 580px !important;
                    min-height: auto !important;
                    height: auto !important;
                    margin: 40px auto 60px auto !important;
                    padding: 40px 24px 36px 24px !important;
                    text-align: center !important;
                    border-radius: 36px !important;
                    background: linear-gradient(145deg, rgba(255,242,250,0.92) 0%, rgba(255,249,235,0.88) 100%) !important;
                    border: 1.5px solid rgba(255,160,185,0.4) !important;
                    box-sizing: border-box !important;
                    animation: fb-slide-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) both, fb-glow-pulse 3.5s ease-in-out 1s infinite !important;
                    position: relative !important;
                    overflow: visible !important;
                    clear: both !important;
                }
                .fb-header-label {
                    font-size: 0.76rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    color: #e85c8a;
                    margin-bottom: 6px;
                    opacity: 0.9;
                    font-family: 'Inter', sans-serif;
                }
                .fb-title {
                    font-family: 'Dancing Script', cursive;
                    font-size: clamp(1.8rem, 4.5vw, 2.3rem);
                    font-weight: 700;
                    color: #c23b6e;
                    margin-bottom: 22px;
                    line-height: 1.25;
                    text-shadow: 0 2px 8px rgba(194, 59, 110, 0.12);
                }
                .fb-flip-scene {
                    width: min(340px, 86vw) !important;
                    height: 390px !important;
                    margin: 0 auto 20px auto !important;
                    perspective: 1200px !important;
                    cursor: pointer !important;
                    user-select: none !important;
                    transition: transform 0.3s ease !important;
                    position: relative !important;
                }
                .fb-flip-scene:hover {
                    transform: translateY(-4px) scale(1.015);
                }
                .fb-flip-card {
                    width: 100% !important;
                    height: 100% !important;
                    position: relative !important;
                    transform-style: preserve-3d !important;
                    transition: transform 0.72s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
                    border-radius: 28px !important;
                }
                .fb-flip-scene.flipped .fb-flip-card {
                    transform: rotateY(180deg) !important;
                }
                .fb-face {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 28px !important;
                    backface-visibility: hidden !important;
                    -webkit-backface-visibility: hidden !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }
                .fb-front {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: radial-gradient(circle at 50% 36%, #ffffff 0%, #fff7fa 55%, #ffeaf2 100%);
                    border: 2px solid rgba(255, 140, 175, 0.6);
                    box-shadow: 0 20px 48px rgba(232, 92, 138, 0.22), 0 6px 18px rgba(255, 180, 205, 0.28), inset 0 0 28px rgba(255, 255, 255, 0.9);
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px 20px 40px 20px !important;
                    box-sizing: border-box !important;
                }
                .fb-front::before {
                    content: '';
                    position: absolute;
                    inset: 10px;
                    border: 1px dashed rgba(255, 150, 180, 0.35);
                    border-radius: 20px;
                    pointer-events: none;
                }
                .fb-front::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -130%;
                    width: 60%;
                    height: 100%;
                    background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.65) 50%, transparent 75%);
                    animation: fb-card-shine 4s ease 1.5s infinite;
                    pointer-events: none;
                    border-radius: 28px;
                }
                .fb-front img {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: contain !important;
                    object-position: center center !important;
                    border-radius: 16px;
                    display: block !important;
                    filter: drop-shadow(0 14px 26px rgba(180, 40, 80, 0.22)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
                    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                    pointer-events: none;
                }
                .fb-flip-scene:hover .fb-front img {
                    transform: scale(1.035);
                }
                .fb-front-badge {
                    position: absolute;
                    bottom: 12px;
                    right: 14px;
                    background: rgba(255, 255, 255, 0.94);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 130, 165, 0.5);
                    border-radius: 20px;
                    padding: 5px 12px;
                    font-size: 0.74rem;
                    font-weight: 700;
                    color: #c23b6e;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 4px 12px rgba(214, 51, 108, 0.16);
                    pointer-events: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    letter-spacing: 0.2px;
                }
                .fb-back {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: linear-gradient(150deg, #fff2f8 0%, #fffaf0 50%, #ffeef5 100%);
                    border: 2px solid rgba(255, 150, 180, 0.55);
                    box-shadow: 0 16px 36px rgba(255, 95, 140, 0.18), inset 0 0 30px rgba(255, 255, 255, 0.9);
                    transform: rotateY(180deg) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 28px 22px !important;
                    gap: 14px !important;
                    box-sizing: border-box !important;
                }
                .fb-back::before {
                    content: '';
                    position: absolute;
                    inset: 12px;
                    border: 1.5px dashed rgba(255, 140, 175, 0.45);
                    border-radius: 20px;
                    pointer-events: none;
                }
                .fb-back-icon {
                    font-size: 2.8rem;
                    animation: fb-petal-float 2.4s ease-in-out infinite;
                    display: block;
                    filter: drop-shadow(0 6px 12px rgba(220, 50, 100, 0.2));
                    z-index: 1;
                }
                .fb-back-msg {
                    font-family: 'Dancing Script', cursive;
                    font-size: clamp(1.15rem, 3.5vw, 1.45rem);
                    color: #9c2055;
                    line-height: 1.45;
                    font-weight: 700;
                    text-align: center;
                    max-width: 90%;
                    word-break: break-word;
                    z-index: 1;
                }
                .fb-back-hint {
                    font-size: 0.72rem;
                    color: #c25983;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    letter-spacing: 0.4px;
                    z-index: 1;
                    opacity: 0.85;
                }
                .fb-hint {
                    font-size: 0.76rem;
                    color: #b86088;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }
                .fb-floating-petal {
                    position: absolute;
                    font-size: 1.35rem;
                    pointer-events: none;
                    animation: fb-petal-float 2.8s ease-in-out infinite;
                    opacity: 0.75;
                }
                `;

            section = d.createElement('section');
            section.id = 'magic-flower-bouquet-section';
            section.setAttribute('data-bouquet-id', bouquetId);

            // Decorative floating petals
            const petalEmojis = ['🌸', '🌺', '🌹', '✨', '💮'];
            const petalPositions = [
                { top: '-18px', left: '-10px', delay: '0s' },
                { top: '-12px', right: '8px', delay: '0.6s' },
                { bottom: '10px', left: '-14px', delay: '1.1s' },
                { bottom: '-14px', right: '-8px', delay: '0.3s' },
            ];
            petalPositions.forEach((pos, i) => {
                const p = d.createElement('span');
                p.className = 'fb-floating-petal';
                p.innerText = petalEmojis[i % petalEmojis.length];
                Object.assign(p.style, pos, { animationDelay: pos.delay });
                section.appendChild(p);
            });

            section.innerHTML += `
                <div class="fb-header-label">✨ A Gift For You</div>
                <div class="fb-title">Flowers for you 💐</div>
                <div class="fb-flip-scene" id="fb-flip-scene" title="Tap to flip">
                    <div class="fb-flip-card" id="fb-flip-card">
                        <div class="fb-face fb-front">
                            <img src="/assets/flowers/${bouquetId}.png" alt="Flower Bouquet" loading="lazy" onerror="this.src='/assets/flowers/F2.png'">
                            <span class="fb-front-badge">Tap to flip 🌸</span>
                        </div>
                        <div class="fb-face fb-back">
                            <span class="fb-back-icon">🌹</span>
                            <div class="fb-back-msg">${cardMsg}</div>
                            <div class="fb-back-hint">Tap to flip back ↺</div>
                        </div>
                    </div>
                </div>
                <div class="fb-hint">Tap the bouquet to reveal a special message</div>
            `;

            if (w.insertSectionBeforeFinal) {
                w.insertSectionBeforeFinal(d, section);
            } else {
                const container = d.getElementById('sections-container') || d.body;
                const finalMessage = d.getElementById('magic-final-surprise-section');
                const cta = d.getElementById('magic-cta-section');
                const anchor = finalMessage || cta;
                if (anchor && anchor.parentNode === container) {
                    container.insertBefore(section, anchor);
                } else {
                    container.appendChild(section);
                }
            }

            // Flip interaction
            const scene = d.getElementById('fb-flip-scene');
            if (scene) {
                scene.addEventListener('click', function () {
                    scene.classList.toggle('flipped');
                });
            }

            const scrollFn = w.scrollToElement || (w.parent && w.parent.scrollToElement);
            if (scrollFn) scrollFn(d, section);
        },
        disable: function (d) {
            d && d.getElementById('magic-flower-bouquet-section') && d.getElementById('magic-flower-bouquet-section').remove();
            const s = d && d.getElementById('magic-fb-styles');
            if (s) s.remove();
        }
    };

    // Global Event Delegation: Guarantees 100% button interactivity on generated & shared websites
    if (typeof document !== 'undefined') {
        const handleGlobalInteraction = function (e) {
            const target = e.target;
            if (!target) return;

            // 1. Virtual Cake: "Blow Candles & Cut Cake!" Button or Cake Stage
            const blowBtn = target.closest ? (target.closest('#vc-blow-btn') || target.closest('.vc-btn')) : null;
            const cakeStage = target.closest ? target.closest('#vc-cake-stage') : null;
            if (blowBtn || cakeStage) {
                const section = (blowBtn || cakeStage).closest('#magic-virtual-cake-section') || document.getElementById('magic-virtual-cake-section');
                if (section) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerBlowAndCutCake(section);
                    return;
                }
            }

            // 2. Interactive Cake Slice Tapping
            const sliceCard = target.closest ? target.closest('.vc-slice-card') : null;
            if (sliceCard) {
                e.stopPropagation();
                triggerCakeSliceTap(sliceCard);
                return;
            }

            // 3. Virtual Hug: "Hug For You 🤗" Button
            const hugBtn = target.closest ? (target.closest('#vhBtn') || target.closest('.vh-btn')) : null;
            if (hugBtn) {
                const doc = hugBtn.ownerDocument || document;
                const section = hugBtn.closest('#magic-virtual-hug-section') || doc.getElementById('magic-virtual-hug-section');
                e.preventDefault();
                e.stopPropagation();
                triggerVirtualHug(section || doc);
                return;
            }

            // 4. Cute Birthday Poster: "Tap to Celebrate" Badge or Poster Card
            const namedBadge = target.closest ? (target.closest('.magic-named-card-badge') || target.closest('#magic-named-card-wrap') || target.closest('.magic-named-card-wrap')) : null;
            if (namedBadge) {
                const doc = namedBadge.ownerDocument || document;
                const section = namedBadge.closest('#magic-named-birthday-card-section') || doc.getElementById('magic-named-birthday-card-section');
                e.preventDefault();
                e.stopPropagation();
                triggerNamedCardCelebration(section || doc, e);
                return;
            }

            // 5. Flower Bouquet: Tap to flip card
            const flipScene = target.closest ? target.closest('.fb-flip-scene') : null;
            if (flipScene) {
                flipScene.classList.toggle('flipped');
                return;
            }
        };

        // Attach capture-phase listener to catch clicks anywhere in DOM
        document.addEventListener('click', handleGlobalInteraction, true);
    }

    if (typeof window !== 'undefined') {
        window.FEATURE_MAP = featureMap;
    }

    return featureMap;
})();



