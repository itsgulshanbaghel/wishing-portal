(function() {
    // Helper to safely insert feature section before Final Surprise or CTA
    function insertSectionBeforeFinal(doc, sectionElement) {
        if (!doc || !sectionElement) return;
        if (typeof window !== 'undefined' && typeof window.insertSectionBeforeFinal === 'function' && window.insertSectionBeforeFinal !== insertSectionBeforeFinal) {
            try { window.insertSectionBeforeFinal(doc, sectionElement); return; } catch(e) {}
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
            try { window.scrollToElement(doc, element); return; } catch(e) {}
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

    // Expose helpers globally if not already present
    if (typeof window !== 'undefined') {
        if (!window.escapeHtml) window.escapeHtml = escapeHtml;
        if (!window.insertSectionBeforeFinal) window.insertSectionBeforeFinal = insertSectionBeforeFinal;
        if (!window.scrollToElement) window.scrollToElement = scrollToElement;
        if (!window.injectFontsIfNeeded) window.injectFontsIfNeeded = injectFontsIfNeeded;
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

    // Global runner for Virtual Cake blowout and cutting
    function triggerBlowAndCutCake(sectionEl) {
        const d = typeof document !== 'undefined' ? document : null;
        const w = typeof window !== 'undefined' ? window : null;
        if (!d) return;
        const section = sectionEl || d.getElementById('magic-virtual-cake-section');
        if (!section) return;

        const btn = section.querySelector('#vc-blow-btn');
        const stage = section.querySelector('#vc-cake-stage');
        const knife = section.querySelector('#vc-knife-wrap');
        const cutLine = section.querySelector('#vc-cut-line');
        const card = section.querySelector('#vc-wish-card');
        const slicesWrap = section.querySelector('#vc-slices-wrapper');
        const audio = section.querySelector('#vc-audio');

        if (section.dataset.cakeDone === 'true' || (btn && btn.classList.contains('done'))) return;
        section.dataset.cakeDone = 'true';

        ensureConfetti();

        /* PHASE 1: Light off / blow out ALL 5 candles FIRST (0ms - 450ms) */
        [0, 1, 2, 3, 4].forEach((i, idx) => {
            setTimeout(() => {
                const flame = section.querySelector(`#vc-flame-${i}`);
                const smoke = section.querySelector(`#vc-smoke-${i}`);
                if (flame) flame.classList.add('out');
                if (smoke) smoke.classList.add('puffing');
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

            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        }, 1250);

        /* PHASE 4: Confetti bursts, Wish Card & Slices Showcase reveal (1350ms - 1700ms) */
        ensureConfetti((cfn) => {
            if (!cfn) return;
            const burst = (opts) => cfn({ zIndex: 99999, ...opts });
            setTimeout(() => burst({ particleCount: 160, spread: 100, origin: { x: 0.5, y: 0.55 } }), 1350);
            setTimeout(() => burst({ particleCount: 110, spread: 85, origin: { x: 0.25, y: 0.5 }, angle: 60 }), 1550);
            setTimeout(() => burst({ particleCount: 110, spread: 85, origin: { x: 0.75, y: 0.5 }, angle: 120 }), 1700);
            setTimeout(() => burst({ particleCount: 220, spread: 130, origin: { x: 0.5, y: 0.4 },
                colors: ['#FFD700','#FF9100','#FF4D8F','#7B5DF6','#ffffff'] }), 1900);
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
        const d = typeof document !== 'undefined' ? document : null;
        const w = typeof window !== 'undefined' ? window : null;
        if (!d) return;
        const section = sectionEl || d.getElementById('magic-virtual-hug-section');

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
            z-index: 10001;
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
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));

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
                background-image: url('../assets/rose petal.png'), url('/assets/rose petal.png');
                background-size: contain;
                background-repeat: no-repeat;
                pointer-events: none;
                z-index: 10000;
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

    if (typeof window !== 'undefined') {
        window.triggerBlowAndCutCake = triggerBlowAndCutCake;
        window.triggerCakeSliceTap = triggerCakeSliceTap;
        window.triggerVirtualHug = triggerVirtualHug;
    }

    const featureMap = {
    lock: {
        enable(d, w, userName, customText) {
            if (d.getElementById("lock-overlay")) return {};
            if (window.lockUnlocked) return {};
            // Ensure Font Awesome is loaded
            if (!d.getElementById('greeter-font-awesome')) {
                const faLink = d.createElement('link');
                faLink.id = 'greeter-font-awesome';
                faLink.rel = 'stylesheet';
                faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
                (d.head || d.body)?.appendChild(faLink);
            }
            const password = customText || "";
            const overlay = d.createElement("div");
            overlay.id = "lock-overlay";
            overlay.style.cssText = "position:fixed; inset:0; background:linear-gradient(135deg, rgba(26, 16, 37, 0.95) 0%, rgba(123, 93, 246, 0.8) 50%, rgba(255, 122, 47, 0.8) 100%); z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Inter', sans-serif; color:white; backdrop-filter:blur(15px); opacity:0; transition:opacity 0.8s ease-in-out;";
            // Preload unlock audio
            const unlockAudio = d.createElement('audio');
            unlockAudio.src = 'https://www.dropbox.com/scl/fi/2fvwa7pe48d02xla74az0/unlocked.mp3?rlkey=w7gjgzekpt22kyly1c2pivyxq&st=eekkhktb&dl=1';
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
            overlay.appendChild(input);
            // Preload wrong password audio
            const wrongAudio = d.createElement('audio');
            wrongAudio.src = 'https://www.dropbox.com/scl/fi/2xafqlh97rmbmwmgdphcy/Wrong-input.mp3?rlkey=cwdu72jsm54f1n9vlfh4c7f6z&st=ec5jqt1g&dl=1';
            wrongAudio.volume = 0.5;
            wrongAudio.preload = 'auto';
            overlay.appendChild(wrongAudio);

            const btn = d.createElement('button');
            btn.innerHTML = '<i class="fas fa-key" style="margin-right:8px;"></i> Unlock Surprise <i class="fas fa-key" style="margin-left:8px;"></i>';
            btn.style.cssText = "background:linear-gradient(135deg, #7b5df6, #ff7a2f); border:none; color:white; padding:15px 30px; border-radius:40px; font-size:1.1rem; font-weight:700; cursor:pointer; box-shadow:0 8px 25px rgba(123, 93, 246, 0.4); transition:all 0.3s;";
            btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
            btn.onmouseout = () => btn.style.transform = 'translateY(0)';
            btn.onclick = () => {
                if (input.value.trim() === password.trim()) {
                    // Play unlock sound
                    unlockAudio.currentTime = 0;
                    unlockAudio.play().catch(e => console.log('Unlock audio failed:', e));
                    try { const bgAudio = d.getElementById('magic-bg-audio'); if (bgAudio && bgAudio.paused) bgAudio.play().catch(() => {}); } catch(e) {}
                    try { const bgAudio = d.getElementById('magic-bg-audio'); if (bgAudio && bgAudio.paused) bgAudio.play().catch(() => {}); } catch(e) {}
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        window.lockUnlocked = true;
                        window.dispatchEvent(new CustomEvent('lockUnlocked'));
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
    },    curtainReveal: {
        enable(d, w) {
            if (d.getElementById("magic-curtain-reveal-root")) return;
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

            const btn = cd.querySelector("#curtain-open-btn");
            let opened = false;
            const openCurtains = () => {
                if (opened) return;
                opened = true;
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
                } catch (err) {}
                
                // Dispatch event across all potential listeners
                try { if (w && typeof w.dispatchEvent === 'function') w.dispatchEvent(new CustomEvent('curtainOpened')); } catch(e){}
                try { if (typeof window !== 'undefined' && window !== w) window.dispatchEvent(new CustomEvent('curtainOpened')); } catch(e){}
                try { if (d && typeof d.dispatchEvent === 'function') d.dispatchEvent(new CustomEvent('curtainOpened')); } catch(e){}

                setTimeout(() => cd?.remove(), 3500);
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
                if (d.body && el._prevOverflow !== undefined) d.body.style.overflow = el._prevOverflow || "";
                el.remove();
            }
        }
    },

    welcomeTyping: {
        enable(d, w, userName, customText) {
            if (d.getElementById("magic-welcome-typing-root")) return;
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

                container.innerHTML = `<h1 style="font-family: 'Great Vibes', cursive; font-size: clamp(3rem, 10vw, 5.5rem); color: #fff !important; text-shadow: 0 0 20px rgba(255,255,255,0.5); margin-bottom: 20px;">Welcome ${escapeHtml(userName)} <span class="magic-emoji">\uD83D\uDC96</span></h1><p id="magic-typing-welcome-msg" style="margin-top: 20px; font-size: clamp(1.5rem, 5vw, 2.2rem); color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.3); font-family: 'Poppins', sans-serif;"></p>`;
                overlay.appendChild(container);
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
                        window.dispatchEvent(new CustomEvent('welcomeTypingFinished'));
                    }, 1200);
                };

                setTimeout(() => {
                    container.style.transform = "scale(1.2)";
                    container.style.opacity = "1";
                    
                    // Attempt audio playback gracefully
                    try {
                        const audio = d.createElement('audio');
                        audio.id = 'magic-welcome-audio';
                        audio.src = 'https://www.dropbox.com/scl/fi/chvq5b2ekx51h8e3tc4n0/Typing.mp3?rlkey=9vvndv4gkkrzdbiis2fnfin3k&e=1&st=pj2hwihs&dl=1';
                        audio.loop = true; audio.volume = 0.5; audio.preload = 'auto';
                        d.body.appendChild(audio);
                        audio.play().catch(() => {});
                    } catch (e) {}

                    // Start typing text independently of audio canplay event
                    let idx = 0;
                    const iv = setInterval(() => {
                        if (msgPara && idx < msgText.length) {
                            msgPara.innerHTML += msgText[idx];
                            idx++;
                        } else {
                            clearInterval(iv);
                            setTimeout(finishWelcome, 2500);
                        }
                    }, 65);

                    // Fail-safe: Guarantee welcome message unfreezes after max 6.5 seconds
                    setTimeout(finishWelcome, 6500);
                }, 100);

                return { intervals: [] };
            };

            const curtain = d.getElementById("magic-curtain-reveal-root");
            if (curtain) {
                const handler = () => { startTyping(); window.removeEventListener('curtainOpened', handler); };
                window.addEventListener('curtainOpened', handler);
                // Fail-safe: If curtainOpened doesn't fire in 8s, auto-start typing
                setTimeout(() => {
                    window.removeEventListener('curtainOpened', handler);
                    startTyping();
                }, 8000);
                return {};
            } else {
                return startTyping();
            }
        },
        disable(d) {
            const overlay = d?.getElementById("magic-welcome-typing-root");
            if (overlay) { overlay.remove(); d.body.classList.remove('magic-noscroll'); }
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
            if (d.getElementById("magic-flower-rain")) return;
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
            if (!d.querySelector("#magic-flower-keyframes")) { const s = d.createElement("style"); s.id = "magic-flower-keyframes"; s.textContent = `@keyframes magicFlowerFall{to{transform:translateY(110vh) rotate(360deg); opacity:0;}}`; d.head.appendChild(s); }
            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-flower-rain")?.remove(); }
    },



    flyingSwans: {
        enable(d, w, ce) {
            if (d.getElementById("magic-swan-container")) return;
            const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
            const emojis = (ce && ce.length && isEmoji(ce)) ? Array.from(ce) : ["\uD83D\uDD4A"];
            const c = d.createElement("div"); c.id = "magic-swan-container"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483900;";
            d.body.appendChild(c);
            const iv = setInterval(() => {
                const swan = d.createElement("div"); const em = emojis[Math.floor(Math.random() * emojis.length)]; swan.innerHTML = em; swan.style.cssText = `position:absolute; right:-50px; bottom:${Math.random() * 60 + 10}%; font-size:48px; animation:magicSwanFly 10s linear forwards;`;
                c.appendChild(swan); setTimeout(() => swan.remove(), 10000);
            }, 4000);
            if (!d.querySelector("#magic-swan-keyframes")) { const s = d.createElement("style"); s.id = "magic-swan-keyframes"; s.textContent = `@keyframes magicSwanFly{0%{transform:translateX(0); opacity:0;}10%{opacity:1;}100%{transform:translateX(-130vw); opacity:0;}}`; d.head.appendChild(s); }
            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-swan-container")?.remove(); }
    },

    balloonParty: {
        enable(d, w, ce) {
            if (d.getElementById("magic-balloon-root")) return;
            const isEmoji = (s) => /\p{Emoji_Presentation}/u.test(s) || /\p{Emoji}\uFE0F/u.test(s);
            const em = (ce && ce.length && isEmoji(ce)) ? Array.from(ce)[0] : "\uD83C\uDF88";
            const c = d.createElement("div"); c.id = "magic-balloon-root"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483100;";
            d.body.appendChild(c);
            const popAudio = d.createElement('audio');
            popAudio.src = 'https://www.dropbox.com/scl/fi/7f8ol07qp5zrskaxqb284/Ballon-Pop.mp3?rlkey=w144fxdnvmzlqc6szxodz13js&st=3676eshv&dl=1';
            popAudio.volume = 0.5;
            popAudio.preload = 'auto';
            popAudio.style.display = 'none';
            d.body.appendChild(popAudio);
            const iv = setInterval(() => {
                const b = d.createElement("div"); b.innerHTML = em; b.style.cssText = `position:absolute; left:${Math.random() * 90}%; bottom:-80px; font-size:45px; cursor:pointer; animation:magicFloatUp ${6 + Math.random() * 5}s linear forwards; pointer-events:auto;`;
                b.onclick = (e) => { e.stopPropagation(); b.remove(); popAudio.currentTime = 0; popAudio.play().catch(e => console.log('Balloon pop audio failed:', e)); const pop = d.createElement("div"); pop.innerText = "\uD83D\uDCA5"; pop.style.cssText = `position:absolute; left:${b.style.left}; bottom:${b.style.bottom}; font-size:30px;`; c.appendChild(pop); setTimeout(() => pop.remove(), 500); };
                c.appendChild(b); setTimeout(() => b.remove(), 10000);
            }, 1800);
            if (!d.querySelector("#magic-balloon-style")) { const s = d.createElement("style"); s.id = "magic-balloon-style"; s.textContent = `@keyframes magicFloatUp{to{transform:translateY(-120vh);}}`; d.head.appendChild(s); }
            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-balloon-root")?.remove(); }
    },

    floatingBalloonsNamed: {
        enable(d, w, userName, customText) {
            if (d.getElementById("magic-named-balloons")) return;
            const nameDisplay = customText || userName;
            const c = d.createElement("div"); c.id = "magic-named-balloons"; c.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:2147483100;";
            d.body.appendChild(c);
            const popAudio = d.createElement('audio');
            popAudio.src = 'https://www.dropbox.com/scl/fi/7f8ol07qp5zrskaxqb284/Ballon-Pop.mp3?rlkey=w144fxdnvmzlqc6szxodz13js&st=3676eshv&dl=1';
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
            if (!d.querySelector("#magicFloatUpKey")) { const s = d.createElement("style"); s.id = "magicFloatUpKey"; s.textContent = `@keyframes magicFloatUp{to{transform:translateY(-120vh);}}`; d.head.appendChild(s); }
            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-named-balloons")?.remove(); }
    },

    fireworksClick: {
        enable(d, w) {
            if (d.getElementById("magic-firework-canvas")) return;
            const can = d.createElement("canvas"); can.id = "magic-firework-canvas"; can.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483500;";
            d.body.appendChild(can); const ctx = can.getContext("2d"); let parts = []; let anim = null;
            const blastAudio = d.createElement('audio');
            blastAudio.src = 'https://www.dropbox.com/scl/fi/ehjb0y79mov2gfdh5rnyo/Click-Blast.mp3?rlkey=7du7vkr32l4wrevd8ubygxfua&st=lstqlns4&dl=1';
            blastAudio.volume = 0.5;
            blastAudio.preload = 'auto';
            blastAudio.style.display = 'none';
            d.body.appendChild(blastAudio);
            const resize = () => { can.width = w.innerWidth; can.height = w.innerHeight; }; resize(); w.addEventListener("resize", resize);
            const boom = (x, y) => { for (let i = 0; i < 80; i++) { const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 6 + 2; parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: `hsl(${Math.random() * 360},100%,60%)`, size: 3 }); } };
            const handler = (e) => { boom(e.clientX, e.clientY); blastAudio.currentTime = 0; blastAudio.play().catch(e => console.log('Blast audio failed:', e)); if (anim === null) animate(); };
            const animate = () => {
                if (!can.isConnected || !d.getElementById("magic-firework-canvas")) {
                    w.removeEventListener("resize", resize);
                    w.document.body.removeEventListener("click", handler);
                    return;
                }
                ctx.clearRect(0, 0, can.width, can.height); let alive = false; for (let i = 0; i < parts.length; i++) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.02; if (p.life <= 0) { parts.splice(i, 1); i--; continue; } alive = true; ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); } if (alive) anim = requestAnimationFrame(animate); else anim = null;
            };
            w.document.body.addEventListener("click", handler);
            return {
                listeners: [{ target: w.document.body, type: "click", handler }],
                cleanup: () => {
                    w.removeEventListener("resize", resize);
                    w.document.body.removeEventListener("click", handler);
                }
            };
        },
        disable(d) {
            const can = d?.getElementById("magic-firework-canvas");
            if (can) can.remove();
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
            bombAudio.src = 'https://www.dropbox.com/scl/fi/4j1vqur7916vat9blg3py/Bomb-blast.mp3?rlkey=reii9xaahc9sjajvl1ed3i30z&st=ko4cdgyx&dl=1';
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
        disable(d) { d?.getElementById("magic-bomb-root")?.remove(); }
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
            giftAudio.src = 'https://www.dropbox.com/scl/fi/44xjwhb6s5l9yd2q23xh2/Gift-box.mp3?rlkey=51q76p6d3juxz2o67fq0fsx2t&st=ct9t6n6u&dl=1';
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
                const fallbackGiftPhotos = [
                    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=80"
                ];
                let validGiftImgs = [];
                if (images && Array.isArray(images) && images.length > 0) {
                    const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                    if (cleaned.length > 0) {
                        validGiftImgs = cleaned;
                    } else if (typeof window !== 'undefined' && !window.__IS_GENERATED_PAGE__) {
                        validGiftImgs = images.filter(src => !!src);
                    }
                }
                if (images && images.length > 0 && validGiftImgs.length === 0) {
                    validGiftImgs = fallbackGiftPhotos;
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
            let idx = 0, iv = null;

            // Trigger "in the middle" - either by scroll or simple delay
            setTimeout(() => {
                card.style.opacity = "1";
                const audio = d.createElement('audio'); audio.id = 'magic-text-formation-audio'; audio.src = 'https://www.dropbox.com/scl/fi/chvq5b2ekx51h8e3tc4n0/Typing.mp3?rlkey=9vvndv4gkkrzdbiis2fnfin3k&e=1&st=pj2hwihs&dl=1'; audio.loop = true; audio.volume = 0.5; audio.preload = 'auto'; d.body.appendChild(audio); audio.addEventListener('canplay', () => { audio.play().catch(e => console.log('Audio play failed', e)); iv = setInterval(() => { if (idx <= msg.length) { card.innerHTML = msg.substring(0, idx) + (idx % 2 === 0 ? "█" : " "); idx++; } else { clearInterval(iv); const audio = d.getElementById('magic-text-formation-audio'); if (audio) { audio.pause(); audio.remove(); } setTimeout(() => { card.style.opacity = "0"; setTimeout(() => card.remove(), 1000); }, 6000); } }, 70); });
            }, 3500); // 3.5s delay to avoid welcome message screen

            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-typing-card")?.remove(); const audio = d?.getElementById('magic-text-formation-audio'); if (audio) { audio.pause(); audio.remove(); } }
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
            const fallbackScratchPhotos = [
                "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=500&auto=format&fit=crop&q=80"
            ];
            let validScratchImages = [];
            if (images && Array.isArray(images) && images.length > 0) {
                const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                if (cleaned.length > 0) {
                    validScratchImages = cleaned;
                } else if (typeof window !== 'undefined' && !window.__IS_GENERATED_PAGE__) {
                    validScratchImages = images.filter(src => !!src);
                }
            }
            if (images && images.length > 0 && validScratchImages.length === 0) {
                validScratchImages = fallbackScratchPhotos;
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
                const audio = d.createElement('audio'); audio.src = 'https://www.dropbox.com/scl/fi/wb10jz9mqsy44buyqwrfw/Scratch.mp3?rlkey=ugmhbv0hav9shkxkmik7bcdvs&st=7zi6cnpj&dl=1'; audio.loop = true; audio.volume = 0.3; cardDiv.appendChild(audio);
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
            const fallbackTimelinePhotos = [
                "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80"
            ];
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
            if (d.getElementById("magic-heart-scroll")) return;
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
            w.addEventListener("scroll", fn);
            if (!d.querySelector("#magic-heart-style")) { const s = d.createElement("style"); s.id = "magic-heart-style"; s.textContent = `@keyframes magicHeartFall{to{transform:translateY(110vh) rotate(25deg); opacity:0;}}`; d.head.appendChild(s); }
            return {
                listeners: [{ target: w, type: "scroll", handler: fn }],
                cleanup: () => w.removeEventListener("scroll", fn)
            };
        },
        disable(d, w) {
            d?.getElementById("magic-heart-scroll")?.remove();
            if (w) w.removeEventListener("scroll", window._magicHeartScrollHandler); // Extra safety if stored globally
        }
    },

    oldPaperLetter: {
        enable(d, w, userName, customText) {
            if (d.getElementById("magic-old-letter-envelope")) return;
            let used = false;
            const audio = d.createElement('audio');
            audio.id = 'letterClickAudio';
            audio.src = 'https://www.dropbox.com/scl/fi/uaz5w4s5zj3yr0i0dl951/Letter-click.mp3?rlkey=cvjgdol3purgj9qqw7ih00h9b&st=z5v4omeb&dl=1';
            audio.preload = 'auto';
            audio.style.display = 'none';
            d.body.appendChild(audio);
            const env = d.createElement("div"); env.id = "magic-old-letter-envelope"; env.innerHTML = "\u2709\uFE0F";
            env.style.cssText = "position:fixed; bottom:25px; left:25px; font-size:55px; cursor:pointer; z-index:2147484000; background:#fff; border-radius:50%; width:75px; height:75px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(0,0,0,0.4); transition:0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid #ffd700; opacity:0; visibility:hidden;";
            env.onmouseenter = () => env.style.transform = "scale(1.15) rotate(5deg)"; env.onmouseleave = () => env.style.transform = "scale(1)";

            // Show envelope only after curtains are opened and welcome message has disappeared
            const showEnvelope = () => {
                env.style.opacity = "1";
                env.style.visibility = "visible";
                d.body.appendChild(env);
            };

            // Check if curtains exist - if so, wait for them to open
            const curtain = d.getElementById("magic-curtain-reveal-root");
            if (curtain) {
                // Wait for curtain to open
                const curtainHandler = () => {
                    window.removeEventListener('curtainOpened', curtainHandler);
                    // Now wait for welcome message to finish (approximately 6-7 seconds total)
                    window.oldPaperLetterTimeout = setTimeout(showEnvelope, 7000);
                };
                window.addEventListener('curtainOpened', curtainHandler);
            } else {
                // No curtains, check if welcome message exists
                const welcomeOverlay = d.getElementById("magic-welcome-typing-root");
                if (welcomeOverlay) {
                    // Wait for welcome message to finish
                    window.oldPaperLetterTimeout = setTimeout(showEnvelope, 7000);
                } else {
                    // No welcome message either, show immediately
                    showEnvelope();
                }
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

    floatingPolaroids: {
        enable(d, w, userName, customText, images) {
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
            canvas.style.cssText = "position: absolute; inset: 0; pointer-events: none; overflow: hidden;"; 
            section.appendChild(canvas);
            
            insertSectionBeforeFinal(d, section); 
            scrollToElement(d, section);

            const fallbackPhotos = [
                "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=500&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80"
            ];

            // Robust filtering: strip dead/local blob: URLs on shared devices to avoid broken images
            let validImgs = [];
            if (images && Array.isArray(images) && images.length > 0) {
                const cleaned = images.filter(src => src && typeof src === 'string' && !src.startsWith('blob:'));
                if (cleaned.length > 0) {
                    validImgs = cleaned;
                } else if (typeof window !== 'undefined' && !window.__IS_GENERATED_PAGE__) {
                    // In editor mode with freshly selected local files, blob URLs are valid
                    validImgs = images.filter(src => !!src);
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

            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-polaroids-section")?.remove(); }
    },

    finalSurprise: {
        enable(d, w, userName, customText) {
            if (d.getElementById("magic-final-surprise-section")) return;
            const section = d.createElement("section"); section.id = "magic-final-surprise-section"; section.style.cssText = "padding: clamp(24px, 3vw, 36px) clamp(16px, 2.5vw, 24px); text-align: center; margin: clamp(1.5rem, 2.5vw, 2.2rem) auto; width: 92%; max-width: 560px; box-sizing: border-box; align-self: center;";
            const audio = d.createElement('audio');
            audio.id = 'finalSurpriseAudio';
            audio.src = 'https://www.dropbox.com/scl/fi/71ubkozjspwdtby2n7f2w/Final-revel.mp3?rlkey=sn5onep6ry9tso0hd91jafm93&st=la13ckwz&dl=1';
            audio.preload = 'auto';
            audio.volume = 0.7;
            audio.style.display = 'none';
            d.body.appendChild(audio);
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
                } else {
                    console.log('Final message audio element not found');
                }

                let m = customText;
                if (!m) {
                    m = "You are truly One in Millions 💖";
                }
                d.body.classList.add('magic-noscroll');
                const overlay = d.createElement("div");
                overlay.id = "magic-final-message-root";
                overlay.style.cssText = "position: fixed; inset: 0; background: radial-gradient(circle at center, #6a0000, #2a0000); z-index: 2147483646; pointer-events: none; transition: opacity 1.5s ease; opacity: 1;";
                const container = d.createElement("div");
                container.style.cssText = "position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; transform: scale(0.5); opacity: 0; transition: transform 4s ease, opacity 4s ease;";
                container.innerHTML = `<h1 style="font-family: 'Great Vibes', cursive; font-size: clamp(2rem, 8vw, 4rem); color: #fff !important; text-shadow: 0 0 20px rgba(255,255,255,0.5); margin-bottom: 20px; text-align: center; word-wrap: break-word; max-width: 90vw;">${escapeHtml(m)}</h1>`;
                overlay.appendChild(container);
                d.body.appendChild(overlay);
                setTimeout(() => { container.style.transform = "scale(1.2)"; container.style.opacity = "1"; }, 100);
                setTimeout(() => { overlay.style.opacity = "0"; setTimeout(() => { overlay?.remove(); d.body.classList.remove('magic-noscroll'); }, 1500); }, 5000);
            };

            section.appendChild(btn); insertSectionBeforeFinal(d, section); scrollToElement(d, section); return { listeners: [{ target: btn, type: "click", handler: btn.onclick }] };
        },
        disable(d) { d?.getElementById("magic-final-surprise-section")?.remove(); const audio = d?.getElementById("finalSurpriseAudio"); if (audio) audio.remove(); }
    },

    magicMusic: {
        enable(d, w, userName, customText, audio, youtubeUrl, youtubeStartTime, volume, youtubeEndTime, youtubeDuration) {
            // Helper to extract YouTube video ID from any URL or raw ID
            function getYouTubeId(input) {
                if (!input || typeof input !== 'string') return null;
                const str = input.trim();
                if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
                const m = str.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/)|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i);
                return m ? m[1] : null;
            }

            // Extract candidate YouTube source from passed parameters
            let ytCandidate = youtubeUrl || '';
            if (!ytCandidate && typeof audio === 'string' && getYouTubeId(audio)) {
                ytCandidate = audio;
            }
            if (!ytCandidate && typeof customText === 'string' && getYouTubeId(customText)) {
                ytCandidate = customText;
            }
            if (!ytCandidate && typeof customText === 'object' && customText) {
                ytCandidate = customText.youtubeUrl || customText.youtubeId || customText.text || '';
            }
            const ytId = getYouTubeId(ytCandidate);

            // Checks if any of the overlays are still active/blocking
            const isBlocked = () => {
                const hasCountdown = !!d.getElementById("magic-countdown-overlay");
                const hasLock = !!d.getElementById("lock-overlay") || (w && w.lockUnlocked === false);
                const hasCurtain = !!d.getElementById("magic-curtain-reveal-root");
                const hasWelcome = !!d.getElementById("magic-welcome-typing-root");
                return hasCountdown || hasLock || hasCurtain || hasWelcome;
            };

            // Inject CSS keyframes for animated music bars and premium effects (shared)
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
                (d.head || d.body || d.documentElement).appendChild(style);
            }

            // Create or reuse floating music widget
            let widget = d.getElementById("magic-music-widget");
            let tooltip = d.getElementById("magic-music-tooltip");
            let bars = [];
            let wave = null;
            let muteIcon = null;

            if (!widget) {
                widget = d.createElement("div");
                widget.id = "magic-music-widget";
                widget.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000; background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1.5px solid rgba(255, 255, 255, 0.7); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s, box-shadow 0.3s;";

                tooltip = d.createElement("div");
                tooltip.id = "magic-music-tooltip";
                tooltip.style.cssText = "position: fixed; top: 28px; right: 74px; z-index: 10000; background: rgba(123, 93, 246, 0.9); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: white; padding: 6px 12px; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 0.68rem; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity 0.3s, transform 0.3s; transform: translateX(10px); box-shadow: 0 4px 12px rgba(123, 93, 246, 0.2); border: 1px solid rgba(255, 255, 255, 0.15); white-space: nowrap;";
                tooltip.innerText = (w && w.currentLang === 'hi') ? 'संगीत बंद/चालू करें' : 'Tap to mute music';
                d.body.appendChild(tooltip);

                wave = d.createElement("div");
                wave.style.cssText = "display: flex; align-items: flex-end; gap: 2.5px; width: 20px; height: 16px;";
                for (let i = 0; i < 5; i++) {
                    const bar = d.createElement("div");
                    bar.style.cssText = "width: 2.5px; height: 30%; background: linear-gradient(to top, #ff7a2f, #7b5df6); border-radius: 1.5px; transition: height 0.2s;";
                    wave.appendChild(bar);
                    bars.push(bar);
                }
                widget.appendChild(wave);

                muteIcon = d.createElement("i");
                muteIcon.className = "fas fa-volume-mute";
                muteIcon.style.cssText = "color: #7b5df6; font-size: 1.1rem; display: none;";
                widget.appendChild(muteIcon);

                widget.onmouseenter = () => {
                    widget.style.transform = "scale(1.08)";
                    widget.style.boxShadow = "0 10px 28px rgba(123, 93, 246, 0.15)";
                    if (tooltip) { tooltip.style.opacity = "1"; tooltip.style.transform = "translateX(0)"; }
                };
                widget.onmouseleave = () => {
                    widget.style.transform = "scale(1)";
                    widget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                    if (tooltip) { tooltip.style.opacity = "0"; tooltip.style.transform = "translateX(10px)"; }
                };

                d.body.appendChild(widget);
            } else {
                wave = widget.querySelector("div");
                bars = Array.from(widget.querySelectorAll("div > div"));
                muteIcon = widget.querySelector(".fa-volume-mute");
            }

            const startBars = () => {
                bars.forEach((bar, idx) => {
                    bar.classList.add(`magic-music-bar-active-${idx}`);
                });
                widget.classList.add("magic-music-pulse-active");
                if (wave) wave.style.display = 'flex';
                if (muteIcon) muteIcon.style.display = 'none';
            };

            const stopBars = () => {
                bars.forEach((bar, idx) => {
                    bar.classList.remove(`magic-music-bar-active-${idx}`);
                    bar.style.height = "30%";
                });
                widget.classList.remove("magic-music-pulse-active");
                if (wave) wave.style.display = 'none';
                if (muteIcon) muteIcon.style.display = 'block';
            };

            stopBars();

            // ═════════════════════════════════════════════════════════════════
            // BRANCH A: YOUTUBE MUSIC AS BACKGROUND AUDIO (Hidden IFrame API)
            // ═════════════════════════════════════════════════════════════════
            if (ytId) {
                // If native audio was present, remove it
                d.getElementById("magic-bg-audio")?.remove();

                const startOffsetSec = Math.max(0, parseInt(
                    youtubeStartTime ||
                    (typeof customText === 'object' && customText ? customText.youtubeStartTime : 0) ||
                    0, 10)
                );
                const durationSec = Math.max(0, parseInt(
                    youtubeDuration ||
                    (typeof customText === 'object' && customText ? customText.youtubeDuration : 0) ||
                    0, 10)
                );
                let endOffsetSec = Math.max(0, parseInt(
                    youtubeEndTime ||
                    (typeof customText === 'object' && customText ? customText.youtubeEndTime : 0) ||
                    (durationSec > 0 ? (startOffsetSec + durationSec) : 0), 10)
                );
                if (endOffsetSec <= startOffsetSec && durationSec > 0) {
                    endOffsetSec = startOffsetSec + durationSec;
                }

                const targetVolume = (typeof volume === 'number')
                    ? volume
                    : (typeof customText === 'object' && customText && typeof customText.volume === 'number')
                        ? customText.volume
                        : 0.4;

                let ytContainer = d.getElementById("magic-yt-bg-container");
                if (ytContainer) {
                    ytContainer.remove();
                }

                ytContainer = d.createElement("div");
                ytContainer.id = "magic-yt-bg-container";
                // Non-zero dimensions placed off-viewport to ensure Chrome doesn't suppress audio
                ytContainer.style.cssText = "position: fixed; bottom: -9999px; right: -9999px; width: 200px; height: 200px; opacity: 0.001; pointer-events: none; z-index: -9999;";
                const innerHolder = d.createElement("div");
                innerHolder.id = "magic-yt-bg-player";
                ytContainer.appendChild(innerHolder);
                d.body.appendChild(ytContainer);

                let ytPlayer = null;
                let ytReady = false;
                let userHasInteracted = false;

                const checkAndPlayYT = () => {
                    if (!ytPlayer || !ytReady) return;
                    if (!isBlocked()) {
                        try {
                            ytPlayer.playVideo();
                        } catch(e) {}
                    }
                };

                // User-gesture fallback listener for strict mobile/desktop autoplay policies
                const playOnUserGesture = () => {
                    if (isBlocked()) return;
                    if (ytPlayer && ytReady) {
                        try {
                            ytPlayer.playVideo();
                            userHasInteracted = true;
                        } catch(e) {}
                    }
                };

                const bindGestureEvents = () => {
                    d.addEventListener('click', playOnUserGesture, { passive: true });
                    d.addEventListener('touchstart', playOnUserGesture, { passive: true });
                    d.addEventListener('keydown', playOnUserGesture, { passive: true });
                    try {
                        if (w && w.parent && w.parent.document && w.parent.document !== d) {
                            w.parent.document.addEventListener('click', playOnUserGesture, { passive: true });
                            w.parent.document.addEventListener('touchstart', playOnUserGesture, { passive: true });
                        }
                    } catch(e) {}
                };

                const unbindGestureEvents = () => {
                    d.removeEventListener('click', playOnUserGesture);
                    d.removeEventListener('touchstart', playOnUserGesture);
                    d.removeEventListener('keydown', playOnUserGesture);
                    try {
                        if (w && w.parent && w.parent.document) {
                            w.parent.document.removeEventListener('click', playOnUserGesture);
                            w.parent.document.removeEventListener('touchstart', playOnUserGesture);
                        }
                    } catch(e) {}
                };

                bindGestureEvents();

                let loopTimer = null;
                const startLoopTimer = () => {
                    if (loopTimer) clearInterval(loopTimer);
                    if (endOffsetSec > startOffsetSec) {
                        loopTimer = setInterval(() => {
                            if (!ytPlayer || !ytReady) return;
                            try {
                                const cur = ytPlayer.getCurrentTime();
                                if (cur >= endOffsetSec) {
                                    ytPlayer.seekTo(startOffsetSec, true);
                                }
                            } catch(e) {}
                        }, 250);
                    }
                };
                const stopLoopTimer = () => {
                    if (loopTimer) {
                        clearInterval(loopTimer);
                        loopTimer = null;
                    }
                };

                function createYTPlayerInstance() {
                    if (ytPlayer || !(w && w.YT && w.YT.Player)) return;
                    try {
                        const safeOrigin = (w.location && w.location.origin && w.location.origin !== 'null') ? w.location.origin : undefined;
                        ytPlayer = new w.YT.Player('magic-yt-bg-player', {
                            height: '200',
                            width: '200',
                            videoId: ytId,
                            playerVars: {
                                autoplay: 1,
                                controls: 0,
                                disablekb: 1,
                                enablejsapi: 1,
                                fs: 0,
                                iv_load_policy: 3,
                                loop: 1,
                                playlist: ytId,
                                playsinline: 1,
                                origin: safeOrigin,
                                start: startOffsetSec
                            },
                            events: {
                                onReady: () => {
                                    ytReady = true;
                                    w._magicYTPlayer = ytPlayer;
                                    try {
                                        ytPlayer.setVolume(Math.round(targetVolume * 100));
                                    } catch(e) {}
                                    checkAndPlayYT();
                                },
                                onStateChange: (event) => {
                                    if (!(w && w.YT)) return;
                                    if (event.data === w.YT.PlayerState.PLAYING) {
                                        startBars();
                                        startLoopTimer();
                                        unbindGestureEvents();
                                        if (typeof w.onMagicMusicStateChange === 'function') {
                                            try { w.onMagicMusicStateChange(true); } catch(e) {}
                                        }
                                    } else if (event.data === w.YT.PlayerState.PAUSED) {
                                        stopBars();
                                        stopLoopTimer();
                                        if (typeof w.onMagicMusicStateChange === 'function') {
                                            try { w.onMagicMusicStateChange(false); } catch(e) {}
                                        }
                                    } else if (event.data === w.YT.PlayerState.ENDED) {
                                        try {
                                            ytPlayer.seekTo(startOffsetSec, true);
                                            ytPlayer.playVideo();
                                        } catch(e) {}
                                    }
                                },
                                onError: (event) => {
                                    console.warn("[magicMusic] YouTube player error code:", event.data);
                                    stopBars();
                                    stopLoopTimer();
                                    if (event.data === 101 || event.data === 150) {
                                        if (tooltip) {
                                            tooltip.innerText = (w && w.currentLang === 'hi')
                                                ? 'यह गाना कॉपीराइट के कारण एम्बेड नहीं हो सकता। कृपया दूसरा गाना चुनें।'
                                                : 'Video embedding restricted by owner. Please choose another track.';
                                            tooltip.style.opacity = '1';
                                            tooltip.style.transform = 'translateX(0)';
                                        }
                                    }
                                    if (typeof w.onMagicMusicError === 'function') {
                                        try { w.onMagicMusicError(event.data); } catch(e) {}
                                    }
                                }
                            }
                        });
                    } catch(err) {
                        console.warn("[magicMusic] YouTube player creation error:", err);
                    }
                }

                // Load YouTube IFrame API script dynamically if not present
                if (w && w.YT && w.YT.Player) {
                    createYTPlayerInstance();
                } else {
                    if (!d.getElementById("magic-yt-iframe-script")) {
                        const tag = d.createElement('script');
                        tag.id = "magic-yt-iframe-script";
                        tag.src = "https://www.youtube.com/iframe_api";
                        (d.head || d.body || d.documentElement).appendChild(tag);
                    }
                    const prevOnReady = w.onYouTubeIframeAPIReady;
                    w.onYouTubeIframeAPIReady = function() {
                        if (typeof prevOnReady === 'function') try { prevOnReady(); } catch(e) {}
                        createYTPlayerInstance();
                    };
                    // Poller in case the script is already executing
                    let pollCount = 0;
                    const ytInterval = setInterval(() => {
                        pollCount++;
                        if (w && w.YT && w.YT.Player) {
                            clearInterval(ytInterval);
                            createYTPlayerInstance();
                        } else if (pollCount > 35) {
                            clearInterval(ytInterval);
                        }
                    }, 120);
                }

                // Synchronize widget click
                widget.onclick = () => {
                    if (isBlocked() || !ytPlayer || !ytReady) return;
                    try {
                        const state = ytPlayer.getPlayerState();
                        if (state === (w.YT?.PlayerState?.PLAYING ?? 1)) {
                            ytPlayer.pauseVideo();
                        } else {
                            ytPlayer.playVideo();
                        }
                    } catch(e) {
                        try { ytPlayer.playVideo(); } catch(e2) {}
                    }
                };

                // Provide programmatic controls and volume setter
                w.setMagicMusicVolume = (vol) => {
                    if (ytPlayer && ytReady) {
                        try {
                            const pct = Math.round(vol * 100);
                            ytPlayer.setVolume(pct);
                            if (pct === 0) ytPlayer.mute(); else ytPlayer.unMute();
                        } catch(e) {}
                    }
                };

                w.playMagicMusic = () => {
                    if (ytPlayer && ytReady) {
                        try {
                            ytPlayer.unMute();
                            ytPlayer.setVolume(Math.round(targetVolume * 100));
                            ytPlayer.playVideo();
                        } catch(e) {}
                    }
                };

                w.pauseMagicMusic = () => {
                    if (ytPlayer && ytReady) {
                        try { ytPlayer.pauseVideo(); } catch(e) {}
                    }
                };

                w.toggleMagicMusic = () => {
                    if (ytPlayer && ytReady) {
                        try {
                            const s = ytPlayer.getPlayerState();
                            if (s === 1) {
                                ytPlayer.pauseVideo();
                            } else {
                                ytPlayer.unMute();
                                ytPlayer.setVolume(Math.round(targetVolume * 100));
                                ytPlayer.playVideo();
                            }
                        } catch(e) {}
                    }
                };

                w.isMagicMusicPlaying = () => {
                    if (ytPlayer && ytReady) {
                        try { return ytPlayer.getPlayerState() === 1; } catch(e) { return false; }
                    }
                    return false;
                };

                // Observer to start YouTube music when overlays disappear
                const ObserverClass = (typeof MutationObserver !== 'undefined') ? MutationObserver : (w && w.MutationObserver ? w.MutationObserver : null);
                let observer = null;
                if (ObserverClass && d.body) {
                    observer = new ObserverClass(() => {
                        if (!isBlocked()) {
                            checkAndPlayYT();
                            if (observer) observer.disconnect();
                        }
                    });
                    observer.observe(d.body, { childList: true, subtree: true });
                }

                w.addEventListener('lockUnlocked', checkAndPlayYT);
                w.addEventListener('curtainOpened', checkAndPlayYT);
                w.addEventListener('welcomeTypingFinished', checkAndPlayYT);
                w.addEventListener('countdownFinished', checkAndPlayYT);

                // Pause YouTube bg music when other interactive audio plays
                let wasPlayingBeforeInterrupt = false;
                const onOtherAudioPlay = (e) => {
                    if (ytPlayer && ytReady) {
                        try {
                            if (ytPlayer.getPlayerState() === w.YT.PlayerState.PLAYING) {
                                ytPlayer.pauseVideo();
                                wasPlayingBeforeInterrupt = true;
                            }
                        } catch(e) {}
                    }
                };
                const onOtherAudioPauseOrEnd = (e) => {
                    const otherAudios = Array.from(d.querySelectorAll('audio'));
                    const anyOtherActive = otherAudios.some(oa => !oa.paused);
                    if (!anyOtherActive && wasPlayingBeforeInterrupt) {
                        if (!isBlocked() && ytPlayer && ytReady) {
                            try { ytPlayer.playVideo(); } catch(e) {}
                        }
                        wasPlayingBeforeInterrupt = false;
                    }
                };

                d.addEventListener('play', onOtherAudioPlay, true);
                d.addEventListener('pause', onOtherAudioPauseOrEnd, true);
                d.addEventListener('ended', onOtherAudioPauseOrEnd, true);

                return {
                    cleanup: () => {
                        stopLoopTimer();
                        unbindGestureEvents();
                        if (observer) observer.disconnect();
                        d.removeEventListener('play', onOtherAudioPlay, true);
                        d.removeEventListener('pause', onOtherAudioPauseOrEnd, true);
                        d.removeEventListener('ended', onOtherAudioPauseOrEnd, true);
                        w.removeEventListener('lockUnlocked', checkAndPlayYT);
                        w.removeEventListener('curtainOpened', checkAndPlayYT);
                        w.removeEventListener('welcomeTypingFinished', checkAndPlayYT);
                        w.removeEventListener('countdownFinished', checkAndPlayYT);
                        if (ytPlayer) {
                            try { ytPlayer.stopVideo(); ytPlayer.destroy(); } catch(e) {}
                            ytPlayer = null;
                        }
                        ytContainer.remove();
                        widget.remove();
                        if (tooltip) tooltip.remove();
                    }
                };
            }

            // ═════════════════════════════════════════════════════════════════
            // BRANCH B: NATIVE HTML5 AUDIO (Uploaded MP3 / WAV / Audio Files)
            // ═════════════════════════════════════════════════════════════════
            if (d.getElementById("magic-bg-audio")) return {};
            const srcUrl = audio || customText || "https://cdn.pixabay.com/download/audio/2022/10/16/audio_d0a0d7a6b4.mp3?filename=happy-birthday-8bit-128331.mp3";
            const a = d.createElement("audio");
            a.id = "magic-bg-audio";
            a.src = srcUrl;
            a.loop = true;
            a.volume = (typeof volume === 'number') ? volume : 0.4;
            a.autoplay = false;
            d.body.appendChild(a);

            // Programmatic volume setter for native audio
            w.setMagicMusicVolume = (vol) => {
                if (a) a.volume = Math.max(0, Math.min(1, vol));
            };

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

            widget.onclick = () => {
                if (isBlocked()) return;
                if (a.paused) {
                    a.play().catch(() => {});
                } else {
                    a.pause();
                }
            };

            // Auto play logic after conditions are met
            const checkAndPlay = () => {
                if (!isBlocked()) {
                    a.play().then(() => {
                        d.removeEventListener('click', playAudio);
                        d.removeEventListener('keydown', playAudio);
                        try {
                            window.parent.document.removeEventListener('click', playAudio);
                            window.parent.document.removeEventListener('keydown', playAudio);
                        } catch (err) {}
                    }).catch(e => { });
                }
            };

            const observer = new MutationObserver(() => {
                if (!isBlocked()) {
                    checkAndPlay();
                    observer.disconnect();
                }
            });
            observer.observe(d.body, { childList: true, subtree: true });

            window.addEventListener('lockUnlocked', checkAndPlay);
            window.addEventListener('curtainOpened', checkAndPlay);
            window.addEventListener('welcomeTypingFinished', checkAndPlay);
            window.addEventListener('countdownFinished', checkAndPlay);

            const playAudio = () => {
                if (isBlocked()) return;
                checkAndPlay();
            };
            d.addEventListener('click', playAudio);
            d.addEventListener('keydown', playAudio);
            try {
                window.parent.document.addEventListener('click', playAudio);
                window.parent.document.addEventListener('keydown', playAudio);
            } catch (err) {}

            let wasPlayingBeforeInterrupt = false;
            const onOtherAudioPlay = (e) => {
                if (e.target === a) return;
                if (!a.paused) {
                    a.pause();
                    wasPlayingBeforeInterrupt = true;
                }
            };
            const onOtherAudioPauseOrEnd = (e) => {
                if (e.target === a) return;
                const audios = Array.from(d.querySelectorAll('audio'));
                const anyOtherPlaying = audios.some(other => other !== a && !other.paused);
                if (!anyOtherPlaying && wasPlayingBeforeInterrupt) {
                    if (!isBlocked()) {
                        a.play().catch(() => {});
                    }
                    wasPlayingBeforeInterrupt = false;
                }
            };

            d.addEventListener('play', onOtherAudioPlay, true);
            d.addEventListener('pause', onOtherAudioPauseOrEnd, true);
            d.addEventListener('ended', onOtherAudioPauseOrEnd, true);
            try {
                window.parent.document.addEventListener('play', onOtherAudioPlay, true);
                window.parent.document.addEventListener('pause', onOtherAudioPauseOrEnd, true);
                window.parent.document.addEventListener('ended', onOtherAudioPauseOrEnd, true);
            } catch (err) {}

            checkAndPlay();

            return {
                cleanup: () => {
                    a.remove();
                    widget.remove();
                    if (tooltip) tooltip.remove();
                    observer.disconnect();
                    window.removeEventListener('lockUnlocked', checkAndPlay);
                    window.removeEventListener('curtainOpened', checkAndPlay);
                    window.removeEventListener('welcomeTypingFinished', checkAndPlay);
                    window.removeEventListener('countdownFinished', checkAndPlay);
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
                    } catch (err) {}
                }
            };
        },
        disable(d, w) {
            d?.getElementById("magic-bg-audio")?.remove();
            d?.getElementById("magic-yt-bg-container")?.remove();
            d?.getElementById("magic-music-widget")?.remove();
            d?.getElementById("magic-music-tooltip")?.remove();
            const targetWin = w || (typeof window !== 'undefined' ? window : null);
            if (targetWin && targetWin._magicYTPlayer) {
                try { targetWin._magicYTPlayer.stopVideo(); targetWin._magicYTPlayer.destroy(); } catch(e) {}
                targetWin._magicYTPlayer = null;
            }
            if (typeof window !== 'undefined' && window._magicYTPlayer) {
                try { window._magicYTPlayer.stopVideo(); window._magicYTPlayer.destroy(); } catch(e) {}
                window._magicYTPlayer = null;
            }
        }
    },

    voiceNote: {
        enable(d, w, userName, customText, audio) {
            const defaultVoiceSample = "https://www.dropbox.com/scl/fi/2fvwa7pe48d02xla74az0/unlocked.mp3?rlkey=w7gjgzekpt22kyly1c2pivyxq&st=eekkhktb&dl=1";
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
        enable(d, w, userName, customText) {
            if (!customText) return {};
            const parseLocalTime = (str) => {
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
            const targetTime = parseLocalTime(customText).getTime();
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

            const overlay = d.createElement("div");
            overlay.id = "magic-countdown-overlay";
            overlay.style.cssText = "position:fixed; inset:0; background:linear-gradient(45deg, #090214, #2a0b4e, #090214); background-size:200% 200%; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Outfit', sans-serif; color:white; backdrop-filter:blur(15px); transition:opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1); animation: bgShift 10s ease infinite;";

            // Add styles for rich animations
            const style = d.createElement('style');
            style.innerHTML = `
              @keyframes bgShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
              @keyframes pulseGlow { 0% { box-shadow: 0 0 15px rgba(255,215,0,0.1); transform: translateY(0); } 50% { box-shadow: 0 10px 30px rgba(255,215,0,0.3); transform: translateY(-5px); border-color: rgba(255,215,0,0.6); } 100% { box-shadow: 0 0 15px rgba(255,215,0,0.1); transform: translateY(0); } }
              @keyframes numberPop { 0% { transform: scale(1); text-shadow: 0 0 10px rgba(255,215,0,0.3); } 50% { transform: scale(1.1); text-shadow: 0 0 25px rgba(255,255,255,0.8); color: #fff; } 100% { transform: scale(1); text-shadow: 0 0 10px rgba(255,215,0,0.3); } }
              @keyframes floatIcon { 0% { transform: translateY(0) rotate(-5deg); filter: drop-shadow(0 0 15px rgba(255,215,0,0.4)); } 50% { transform: translateY(-15px) rotate(5deg); filter: drop-shadow(0 0 30px rgba(255,215,0,0.8)); } 100% { transform: translateY(0) rotate(-5deg); filter: drop-shadow(0 0 15px rgba(255,215,0,0.4)); } }
              .countdown-unit {
                  background: rgba(255, 255, 255, 0.04);
                  border: 1px solid rgba(255, 215, 0, 0.2);
                  border-radius: 20px;
                  padding: 20px 15px;
                  min-width: 90px;
                  text-align: center;
                  backdrop-filter: blur(12px);
                  animation: pulseGlow 3s infinite ease-in-out;
                  box-shadow: inset 0 0 20px rgba(255,215,0,0.05);
                  transition: transform 0.3s;
              }
              .countdown-unit:hover { transform: scale(1.05) translateY(-5px); border-color: #ffd700; }
              .countdown-unit:nth-child(2) { animation-delay: 0.5s; }
              .countdown-unit:nth-child(3) { animation-delay: 1s; }
              .countdown-unit:nth-child(4) { animation-delay: 1.5s; }
              .num-val { display: inline-block; }
              .num-val.changed { animation: numberPop 0.5s ease-out; }
            `;
            overlay.appendChild(style);

            const unlockAudio = d.createElement('audio');
            unlockAudio.src = 'https://www.dropbox.com/scl/fi/2fvwa7pe48d02xla74az0/unlocked.mp3?rlkey=w7gjgzekpt22kyly1c2pivyxq&st=eekkhktb&dl=1';
            unlockAudio.volume = 0.5;
            overlay.appendChild(unlockAudio);

            const decor = d.createElement("div");
            decor.innerHTML = "&#x23F3;";
            decor.style.cssText = "font-size: 4rem; margin-bottom: 15px; animation: floatIcon 4s ease-in-out infinite;";
            overlay.appendChild(decor);

            const title = d.createElement('div');
            title.style.cssText = "font-size: clamp(2rem, 6vw, 3rem); font-family: 'Great Vibes', cursive; margin-bottom: 35px; text-align: center; background: linear-gradient(to right, #ffd700, #ff8c00, #ffd700); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 5px 15px rgba(255,140,0,0.3)); animation: bgShift 4s linear infinite;";
            title.innerText = window.currentLang === 'hi' ? 'सरप्राइज खुलने में...' : 'Surprise Unlocks In...';
            overlay.appendChild(title);

            const timerContainer = d.createElement('div');
            timerContainer.style.cssText = "display:flex; gap:18px; margin-bottom:45px; flex-wrap:wrap; justify-content:center; perspective: 1000px;";
            overlay.appendChild(timerContainer);

            const createTimeUnit = (label) => {
                const unitBox = d.createElement('div');
                unitBox.className = "countdown-unit";
                const num = d.createElement('div');
                num.className = "num-val";
                num.style.cssText = "font-size:3rem; font-weight:800; color:#ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.3); font-variant-numeric: tabular-nums;";
                num.innerText = "00";
                const lbl = d.createElement('div');
                lbl.style.cssText = "font-size:0.85rem; text-transform:uppercase; letter-spacing:2px; color:rgba(255,255,255,0.7); margin-top:8px; font-weight: 600;";
                lbl.innerText = label;
                unitBox.appendChild(num);
                unitBox.appendChild(lbl);
                timerContainer.appendChild(unitBox);
                return num;
            };

            const daysNum = createTimeUnit(window.currentLang === 'hi' ? "दिन" : "Days");
            const hoursNum = createTimeUnit(window.currentLang === 'hi' ? "घंटे" : "Hours");
            const minutesNum = createTimeUnit(window.currentLang === 'hi' ? "मिनट" : "Minutes");
            const secondsNum = createTimeUnit(window.currentLang === 'hi' ? "सेकंड" : "Seconds");

            const subtitle = d.createElement('div');
            subtitle.style.cssText = "font-size:1.2rem; color:rgba(255,255,255,0.85); text-align:center; max-width:80%; line-height:1.6; font-weight: 300; background: rgba(0,0,0,0.2); padding: 10px 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05);";
            subtitle.innerHTML = window.currentLang === 'hi' ? 'कुछ बहुत ही खास के लिए तैयार हो जाइए! &#x1F31F;' : 'Get ready for something truly special! &#x1F31F;';
            overlay.appendChild(subtitle);

            d.body.appendChild(overlay);

            const updateValue = (el, val) => {
                const strVal = val.toString().padStart(2, '0');
                if (el.innerText !== strVal) {
                    el.innerText = strVal;
                    // Trigger animation
                    el.classList.remove("changed");
                    void el.offsetWidth; // trigger reflow
                    el.classList.add("changed");
                }
            };

            const updateTimer = () => {
                const now = Date.now();
                const diff = targetTime - now;
                if (diff <= 0) {
                    clearInterval(intervalId);

                    // Final unlocking effect
                    timerContainer.style.transform = "scale(1.2) translateY(-20px)";
                    timerContainer.style.opacity = "0";
                    timerContainer.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
                    decor.style.transform = "scale(1.5)";
                    decor.style.opacity = "0";
                    decor.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";

                    setTimeout(() => {
                        unlockAudio.play().catch(e => console.log('Countdown unlock audio failed:', e));
                        overlay.style.opacity = '0';
                        setTimeout(() => {
                            overlay.remove();
                            window.dispatchEvent(new CustomEvent('countdownFinished'));
                        }, 800);
                    }, 400);
                    return;
                }
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                updateValue(daysNum, days);
                updateValue(hoursNum, hours);
                updateValue(minutesNum, minutes);
                updateValue(secondsNum, seconds);
            };

            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            overlay._timerInterval = intervalId;
            return { cleanup: () => { clearInterval(intervalId); overlay.remove(); } };
        },
        disable(d) {
            d?.getElementById("magic-countdown-overlay")?.remove();
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
                    try { if (typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) {}
                    try { if (typeof e.stopPropagation === 'function') e.stopPropagation(); } catch (_) {}
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
                } catch (err) {}
                try {
                    if (w && w.parent && w.parent !== w) {
                        w.parent.postMessage({ type: 'openMusicModal' }, '*');
                    }
                } catch (err) {}
            }

            if (embedUrl) {
                const iframe = d.createElement("iframe");
                iframe.src = embedUrl;
                iframe.style.cssText = "width: 100%; height: 100%; border: none; border-radius: 24px;";
                iframe.allow = "encrypted-media; fullscreen";
                iframe.setAttribute("allowfullscreen", "");
                iframe.loading = "lazy";
                embedWrap.appendChild(iframe);

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
                        img.src = "https://placehold.co/200x250/FFF9F0/5D4037?text=Upload+any+image+here";
                        img.style.cssText = "width: 100%; height: 100%; object-fit: contain; border: 3px solid #ff7a2f; border-radius: 24px; opacity: 0.6;";
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
                img.src = "https://placehold.co/200x250/FFF9F0/5D4037?text=Upload+any+image+here";
                img.style.cssText = "width: 100%; height: 100%; object-fit: contain; border: 3px solid #ff7a2f; border-radius: 24px; opacity: 0.6;";
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

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 6 * 1024 * 1024) {
                        alert("Image exceeds 6 MB limit. Please select an image under 6 MB.");
                        fileInput.value = "";
                        return;
                    }
                    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
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

                    const formData = new FormData();
                    formData.append('file', file);
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
            crackersAudio.src = 'https://www.dropbox.com/scl/fi/veung117ggbzx65sxlj98/Crackers-mini.mp3?rlkey=tfheg9i04k6upkavcpdsrghle&st=koce788t&dl=1';
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

            return {
                cleanup: () => {
                    observer.disconnect();
                    if (interval) clearInterval(interval);
                }
            };
        },
        disable(d) {
            d?.getElementById("magic-image-explosion-section")?.remove();
            const audio = d?.getElementById("crackersAudio");
            if (audio) audio.remove();
        }
    },
    virtualCake: {
        enable(d, w, userName, customText) {
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

            if (!d.getElementById('vc-styles')) {
                const s = d.createElement('style');
                s.id = 'vc-styles';
                s.textContent = `
                :root {
                    --vc-gold: #FFD700;
                    --vc-gold2: #FF9100;
                    --vc-pink: #FF4D8F;
                    --vc-purple: #7B5DF6;
                    --vc-bg: #0D0720;
                }
                .vc-section {
                    position: relative;
                    width: 92%;
                    max-width: 600px;
                    margin: clamp(20px, 3.5vw, 36px) auto !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    align-self: center;
                    box-sizing: border-box;
                    padding: clamp(26px, 3.5vw, 40px) clamp(16px, 3vw, 30px);
                    background: radial-gradient(ellipse at 30% 20%, rgba(123,93,246,0.35) 0%, transparent 65%),
                                radial-gradient(ellipse at 75% 80%, rgba(255,145,0,0.28) 0%, transparent 65%),
                                linear-gradient(145deg, rgba(20, 10, 38, 0.88) 0%, rgba(35, 12, 50, 0.82) 100%);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: clamp(24px,4vw,40px);
                    border: 2px solid rgba(255, 215, 0, 0.45);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45),
                                0 0 30px rgba(255, 215, 0, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    overflow: hidden;
                    font-family: 'Poppins', sans-serif;
                    text-align: center;
                    color: #fff;
                    box-sizing: border-box;
                }
                /* --- Floating orbs --- */
                .vc-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(60px);
                    opacity: 0.35;
                    animation: vc-orb-drift 8s ease-in-out infinite alternate;
                }
                .vc-orb-1 { width: 260px; height: 260px; background: #7B5DF6; top: -80px; left: -60px; }
                .vc-orb-2 { width: 200px; height: 200px; background: #FF4D8F; bottom: -60px; right: -40px; animation-delay: -3s; }
                .vc-orb-3 { width: 160px; height: 160px; background: #FFD700; top: 40%; right: 10%; animation-delay: -5s; opacity: 0.18; }
                @keyframes vc-orb-drift {
                    0%   { transform: translate(0,0) scale(1); }
                    100% { transform: translate(20px,15px) scale(1.08); }
                }
                /* --- Shimmer stars --- */
                .vc-star {
                    position: absolute;
                    pointer-events: none;
                    font-size: clamp(10px,2.5vw,16px);
                    color: #FFD700;
                    opacity: 0;
                    animation: vc-star-twinkle 2.5s ease-in-out infinite;
                }
                @keyframes vc-star-twinkle {
                    0%,100% { opacity:0; transform:scale(0.6) rotate(0deg); }
                    50%      { opacity:0.9; transform:scale(1.2) rotate(30deg); }
                }
                /* --- Title --- */
                .vc-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: clamp(1.35rem, 4.5vw, 2.4rem);
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    margin: 0 0 8px;
                    line-height: 1.2;
                    color: #FFD700;
                }
                .vc-title-text {
                    background: linear-gradient(135deg, #FFD700 0%, #FF9100 40%, #FF4D8F 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .vc-emoji {
                    -webkit-text-fill-color: initial;
                    display: inline-block;
                    margin-left: 6px;
                }
                .vc-subtitle {
                    font-size: clamp(0.85rem, 2.2vw, 1.05rem);
                    color: rgba(255, 255, 255, 0.95);
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
                    margin: 0 0 clamp(20px,4vw,36px);
                    font-weight: 500;
                }
                /* --- Wish ribbon --- */
                .vc-ribbon {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.22), rgba(255, 77, 143, 0.18));
                    border: 1.5px solid rgba(255, 215, 0, 0.7);
                    border-radius: 50px;
                    padding: clamp(8px,2vw,12px) clamp(18px,4vw,30px);
                    margin: 0 auto clamp(20px,4vw,32px);
                    max-width: 90%;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                .vc-ribbon-text {
                    font-family: 'Great Vibes', cursive;
                    font-size: clamp(1.2rem, 3.8vw, 1.9rem);
                    color: #FFD700;
                    line-height: 1.3;
                    word-break: break-word;
                    text-shadow: 0 2px 12px rgba(255,215,0,0.6), 0 1px 3px rgba(0,0,0,0.8);
                }
                .vc-ribbon-icon {
                    color: #FFD700;
                    font-size: clamp(0.9rem,2.5vw,1.2rem);
                    flex-shrink: 0;
                    animation: vc-icon-pulse 1.8s ease-in-out infinite;
                }
                @keyframes vc-icon-pulse {
                    0%,100% { transform: scale(1); opacity: 0.85; }
                    50%      { transform: scale(1.2); opacity: 1; }
                }
                /* === CAKE SCENE === */
                .vc-scene {
                    position: relative;
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0;
                    margin: 0 auto clamp(20px,4vw,36px);
                    cursor: pointer;
                }
                /* --- Vertical Cut Line (Center Red Laser Line) --- */
                .vc-cut-line {
                    position: absolute;
                    left: 50%;
                    top: -10px;
                    width: 4px;
                    height: 0%;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, #ff0055 0%, #ff0000 60%, #ff5500 100%);
                    box-shadow: 0 0 10px #ff0055, 0 0 20px #ff0000, 0 0 30px #ff5500;
                    border-radius: 4px;
                    z-index: 35;
                    pointer-events: none;
                    opacity: 0;
                    transition: height 0.65s linear, opacity 0.2s ease;
                }
                .vc-cut-line.slicing {
                    opacity: 1;
                    height: 105%;
                }
                .vc-cut-line.flash {
                    animation: vc-cut-glow 0.8s ease-out forwards;
                }
                @keyframes vc-cut-glow {
                    0%   { opacity: 1; box-shadow: 0 0 25px #ff0055, 0 0 45px #ff0000; }
                    100% { opacity: 0; }
                }

                /* --- Ceremonial Knife --- */
                .vc-knife-wrap {
                    position: absolute;
                    left: 50%;
                    top: -55px;
                    transform: translateX(-50%) rotate(-15deg);
                    font-size: clamp(2.2rem, 5vw, 3rem);
                    color: #FFD700;
                    filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.9));
                    z-index: 40;
                    pointer-events: none;
                    opacity: 0;
                    transition: top 0.65s linear, opacity 0.25s ease, transform 0.65s ease;
                }
                .vc-knife-wrap.slicing {
                    opacity: 1;
                    top: calc(100% - 15px);
                    transform: translateX(-50%) rotate(10deg);
                }

                /* --- Candles wrapper --- */
                .vc-candles {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    gap: clamp(8px,2vw,14px);
                    position: relative;
                    z-index: 10;
                    margin-bottom: -4px;
                }
                .vc-candle {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .vc-candle-stick {
                    width: clamp(9px,2vw,13px);
                    height: clamp(32px,6vw,50px);
                    background: repeating-linear-gradient(
                        180deg,
                        #ffffff 0px, #ffffff 6px,
                        #00c8e0 6px, #00c8e0 12px
                    );
                    border-radius: clamp(4px,1vw,6px) clamp(4px,1vw,6px) 2px 2px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.3);
                    flex-shrink: 0;
                }
                .vc-wick {
                    width: 2px;
                    height: clamp(5px,1.5vw,8px);
                    background: #2d2d2d;
                    border-radius: 1px;
                    margin-bottom: -1px;
                }
                .vc-flame {
                    position: relative;
                    width: clamp(12px,3vw,18px);
                    height: clamp(18px,4vw,26px);
                    background: radial-gradient(ellipse at 50% 85%, #ffffff 0%, #FFF176 30%, #FF9100 70%, transparent 100%);
                    border-radius: 50% 50% 30% 30%;
                    box-shadow: 0 0 clamp(8px,2vw,14px) #FFD700, 0 0 clamp(18px,4vw,28px) rgba(255,145,0,0.6);
                    animation: vc-flicker 0.55s ease-in-out infinite alternate;
                    transition: opacity 0.6s ease, transform 0.6s ease;
                    margin-bottom: -2px;
                }
                @keyframes vc-flicker {
                    0%   { transform: scaleX(1)   scaleY(1)   rotate(-2deg); opacity: 0.92; }
                    100% { transform: scaleX(0.88) scaleY(1.1) rotate(3deg);  opacity: 1; }
                }
                .vc-flame.out {
                    opacity: 0 !important;
                    transform: scaleY(0) !important;
                    animation: none !important;
                }
                .vc-smoke {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: clamp(6px,1.5vw,10px);
                    height: clamp(6px,1.5vw,10px);
                    border-radius: 50%;
                    background: rgba(200,200,220,0.75);
                    opacity: 0;
                    pointer-events: none;
                }
                .vc-smoke.puffing {
                    animation: vc-smoke-rise 1.3s ease-out forwards;
                }
                @keyframes vc-smoke-rise {
                    0%   { opacity: 0.8; transform: translateX(-50%) translateY(0)   scale(1); filter: blur(0); }
                    100% { opacity: 0;   transform: translateX(-40%) translateY(-40px) scale(4); filter: blur(5px); }
                }

                /* --- Cake Tiers & Center Splitting Halves --- */
                .vc-tier {
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    overflow: visible;
                }
                .vc-tier-body {
                    position: relative;
                    display: flex;
                    box-shadow: 0 clamp(6px,2vw,12px) clamp(20px,4vw,32px) rgba(0,0,0,0.4);
                }
                .vc-top-body {
                    width: clamp(130px, 22vw, 175px);
                    height: clamp(56px, 9vw, 76px);
                }
                .vc-bottom-body {
                    width: clamp(180px, 30vw, 245px);
                    height: clamp(70px, 11vw, 92px);
                    margin-top: -3px;
                }

                /* Halves */
                .vc-half {
                    position: relative;
                    width: 50%;
                    height: 100%;
                    overflow: hidden;
                    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .vc-top-body .vc-half.vc-left {
                    background: linear-gradient(180deg, #FFAD60 0%, #FF8000 55%, #E65C00 100%);
                    border-radius: clamp(12px,2.5vw,18px) 0 0 clamp(8px,1.5vw,12px);
                }
                .vc-top-body .vc-half.vc-right {
                    background: linear-gradient(180deg, #FFAD60 0%, #FF8000 55%, #E65C00 100%);
                    border-radius: 0 clamp(12px,2.5vw,18px) clamp(8px,1.5vw,12px) 0;
                }
                .vc-bottom-body .vc-half.vc-left {
                    background: linear-gradient(180deg, #FF6EB4 0%, #E0177D 55%, #B5136A 100%);
                    border-radius: clamp(12px,2.5vw,18px) 0 0 clamp(8px,1.5vw,12px);
                }
                .vc-bottom-body .vc-half.vc-right {
                    background: linear-gradient(180deg, #FF6EB4 0%, #E0177D 55%, #B5136A 100%);
                    border-radius: 0 clamp(12px,2.5vw,18px) clamp(8px,1.5vw,12px) 0;
                }

                /* Frosting drip on each half */
                .vc-frosting {
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: clamp(16px,4vw,24px);
                    background: #ffffff;
                    border-radius: 0 0 clamp(10px,2.5vw,16px) clamp(10px,2.5vw,16px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .vc-frosting::after {
                    content: '';
                    position: absolute;
                    bottom: -clamp(8px,2vw,12px);
                    left: 8%;
                    right: 8%;
                    height: clamp(8px,2vw,13px);
                    background: #ffffff;
                    border-radius: 0 0 12px 12px;
                    box-shadow: clamp(16px,4vw,24px) 0 0 #fff;
                }

                /* Decorative dots on tier halves */
                .vc-tier-dots {
                    position: absolute;
                    bottom: clamp(10px,2.5vw,16px);
                    left: 0; right: 0;
                    display: flex;
                    justify-content: center;
                    gap: clamp(5px,1.5vw,9px);
                }
                .vc-dot {
                    width: clamp(6px,1.5vw,9px);
                    height: clamp(6px,1.5vw,9px);
                    border-radius: 50%;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                }
                .vc-top-body .vc-dot { background: #FF4D8F; }
                .vc-bottom-body .vc-dot { background: #FFD700; }

                /* Stars on bottom tier */
                .vc-tier-stars {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%,-50%);
                    display: flex;
                    gap: clamp(6px,1.5vw,10px);
                    color: rgba(255,255,255,0.4);
                    font-size: clamp(10px,2.5vw,15px);
                }

                /* Inner cake cut glow when split */
                .vc-half.vc-left::after {
                    content: '';
                    position: absolute;
                    top: 0; right: 0; bottom: 0;
                    width: 8px;
                    background: linear-gradient(90deg, transparent, #FFD700, #FFF59D);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }
                .vc-half.vc-right::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; bottom: 0;
                    width: 8px;
                    background: linear-gradient(90deg, #FFF59D, #FFD700, transparent);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }

                /* --- Center Split Action --- */
                .vc-scene.is-cut .vc-half.vc-left {
                    transform: translateX(-16px) rotate(-1.5deg);
                }
                .vc-scene.is-cut .vc-half.vc-right {
                    transform: translateX(16px) rotate(1.2deg);
                }
                .vc-scene.is-cut .vc-half.vc-left::after,
                .vc-scene.is-cut .vc-half.vc-right::before {
                    opacity: 1;
                }
                /* Middle candle (index 2) disappears completely on cut */
                .vc-scene.is-cut .vc-candle[data-i="2"] {
                    opacity: 0 !important;
                    transform: scale(0) translateY(-20px) !important;
                    pointer-events: none !important;
                    transition: opacity 0.4s ease, transform 0.4s ease !important;
                }
                .vc-scene.is-cut .vc-candle[data-i="0"],
                .vc-scene.is-cut .vc-candle[data-i="1"] {
                    transform: translateX(-12px) rotate(-4deg);
                }
                .vc-scene.is-cut .vc-candle[data-i="3"],
                .vc-scene.is-cut .vc-candle[data-i="4"] {
                    transform: translateX(12px) rotate(4deg);
                }

                /* --- Plate --- */
                .vc-plate {
                    width: clamp(210px, 35vw, 280px);
                    height: clamp(14px, 2.2vw, 20px);
                    background: radial-gradient(ellipse at 50% 30%, #ffffff 0%, #d0d0d0 60%, #9e9e9e 100%);
                    border-radius: 50%;
                    margin-top: -4px;
                    box-shadow: 0 clamp(8px,2vw,16px) clamp(20px,5vw,36px) rgba(0,0,0,0.55),
                                inset 0 2px 4px rgba(255,255,255,0.8);
                }
                /* --- Interaction button --- */
                .vc-btn-wrap {
                    margin: 0 auto clamp(16px,4vw,28px);
                }
                .vc-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #FFD700 0%, #FF9100 55%, #FF4D8F 100%);
                    color: #1a0628;
                    border: none;
                    padding: clamp(13px, 2vw, 18px) clamp(28px, 4vw, 50px);
                    font-size: clamp(0.95rem, 1.8vw, 1.2rem);
                    font-weight: 800;
                    font-family: 'Outfit', sans-serif;
                    border-radius: 50px;
                    cursor: pointer;
                    box-shadow: 0 clamp(8px,2vw,14px) clamp(20px,4vw,36px) rgba(255,145,0,0.45),
                                0 0 0 0 rgba(255,215,0,0);
                    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                                box-shadow 0.25s ease;
                    letter-spacing: 0.2px;
                    white-space: nowrap;
                    position: relative;
                    overflow: hidden;
                }
                .vc-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%);
                    pointer-events: none;
                }
                .vc-btn:hover {
                    transform: translateY(-3px) scale(1.04);
                    box-shadow: 0 clamp(14px,3vw,22px) clamp(30px,6vw,50px) rgba(255,145,0,0.6),
                                0 0 0 4px rgba(255,215,0,0.2);
                }
                .vc-btn:active {
                    transform: translateY(1px) scale(0.98);
                }
                .vc-btn.done {
                    background: linear-gradient(135deg, #2ed573, #00cec9);
                    box-shadow: 0 10px 30px rgba(46,213,115,0.4);
                    color: #fff;
                    pointer-events: none;
                }
                /* --- Wish card (post-cut reveal) --- */
                .vc-wish-card {
                    display: none;
                    margin: 0 auto clamp(20px, 4vw, 32px);
                    max-width: clamp(280px,80vw,560px);
                    padding: clamp(20px,4vw,32px) clamp(18px,4vw,36px);
                    background: rgba(255,255,255,0.06);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,215,0,0.35);
                    border-radius: clamp(16px,4vw,28px);
                    box-shadow: 0 16px 48px rgba(0,0,0,0.35),
                                inset 0 1px 0 rgba(255,255,255,0.08);
                    animation: vc-wish-pop 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards;
                }
                @keyframes vc-wish-pop {
                    0%   { opacity:0; transform:translateY(24px) scale(0.88); }
                    100% { opacity:1; transform:translateY(0)    scale(1); }
                }
                .vc-wish-icons {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    font-size: clamp(1.2rem,3.5vw,1.8rem);
                    color: #FFD700;
                    margin-bottom: 12px;
                    animation: vc-icon-pulse 1.5s infinite ease-in-out;
                }
                .vc-wish-text {
                    font-family: 'Poppins', sans-serif;
                    font-size: clamp(0.88rem,2.2vw,1.1rem);
                    color: rgba(255,255,255,0.92);
                    line-height: 1.7;
                    font-weight: 500;
                }
                .vc-wish-sender {
                    margin-top: 14px;
                    font-family: 'Great Vibes', cursive;
                    font-size: clamp(1rem,3vw,1.5rem);
                    color: #FFD700;
                    text-shadow: 0 2px 12px rgba(255,215,0,0.4);
                }

                /* --- Slices Showcase Container --- */
                .vc-slices-wrapper {
                    display: none;
                    margin: clamp(20px, 4vw, 32px) auto 0;
                    max-width: clamp(300px, 92vw, 780px);
                    padding: clamp(20px, 4vw, 32px) clamp(14px, 3vw, 24px);
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-radius: clamp(20px, 4vw, 32px);
                    border: 1.5px solid rgba(255, 215, 0, 0.35);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
                    animation: vc-wish-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .vc-slices-heading {
                    font-family: 'Outfit', sans-serif;
                    font-size: clamp(1.15rem, 3.5vw, 1.6rem);
                    font-weight: 800;
                    color: #FFD700;
                    margin: 0 0 6px;
                    letter-spacing: -0.3px;
                }
                .vc-slices-sub {
                    font-size: clamp(0.8rem, 2vw, 0.95rem);
                    color: rgba(255, 255, 255, 0.75);
                    margin: 0 0 clamp(16px, 3vw, 24px);
                }
                .vc-slices-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(clamp(130px, 38vw, 160px), 1fr));
                    gap: clamp(12px, 2.5vw, 20px);
                    justify-content: center;
                }
                .vc-slice-card {
                    position: relative;
                    background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
                    border: 1.5px solid rgba(255, 215, 0, 0.3);
                    border-radius: clamp(14px, 3vw, 20px);
                    padding: clamp(14px, 3vw, 20px) clamp(10px, 2vw, 16px);
                    text-align: center;
                    cursor: pointer;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                    user-select: none;
                }
                .vc-slice-card:hover {
                    transform: translateY(-6px) scale(1.05);
                    border-color: #FFD700;
                    box-shadow: 0 14px 36px rgba(255, 215, 0, 0.45);
                }
                .vc-slice-card:active {
                    transform: translateY(0) scale(0.97);
                }
                .vc-slice-graphic {
                    position: relative;
                    font-size: clamp(2.2rem, 6vw, 3rem);
                    line-height: 1;
                    margin-bottom: 8px;
                    display: inline-block;
                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
                }
                .vc-slice-cherry {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    font-size: 0.45em;
                    animation: vc-icon-pulse 2s infinite ease-in-out;
                }
                .vc-slice-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, #FFD700, #FF9100);
                    color: #1a0628;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 800;
                    font-size: clamp(0.7rem, 1.8vw, 0.82rem);
                    padding: 3px 12px;
                    border-radius: 20px;
                    margin-bottom: 8px;
                    box-shadow: 0 2px 8px rgba(255, 145, 0, 0.4);
                }
                .vc-slice-label {
                    font-family: 'Poppins', sans-serif;
                    font-size: clamp(0.78rem, 2vw, 0.92rem);
                    color: rgba(255, 255, 255, 0.95);
                    line-height: 1.4;
                }
                .vc-slice-toast {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.5);
                    background: linear-gradient(135deg, #FFD700, #FF4D8F);
                    color: #1a0628;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 900;
                    font-size: 0.85rem;
                    padding: 6px 14px;
                    border-radius: 20px;
                    white-space: nowrap;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    pointer-events: none;
                    opacity: 0;
                    z-index: 50;
                }
                .vc-slice-toast.pop {
                    animation: vc-toast-float 1.2s ease-out forwards;
                }
                @keyframes vc-toast-float {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
                    30% { opacity: 1; transform: translate(-50%, -80%) scale(1.1); }
                    100% { opacity: 0; transform: translate(-50%, -140%) scale(1); }
                }
                `;
                d.head.appendChild(s);
            }

            const recipient = userName || 'Someone Special';
            const wishMsg = customText && customText.trim()
                ? customText.trim()
                : `Happy Birthday, ${recipient}!`;

            const section = d.createElement('section');
            section.id = 'magic-virtual-cake-section';
            section.className = 'vc-section';

            section.innerHTML = `
                <!-- decorative orbs -->
                <div class="vc-orb vc-orb-1"></div>
                <div class="vc-orb vc-orb-2"></div>
                <div class="vc-orb vc-orb-3"></div>
                <!-- shimmer stars -->
                <i class="fas fa-star vc-star" style="top:12%;left:7%;animation-delay:0s"></i>
                <i class="fas fa-star vc-star" style="top:18%;right:9%;animation-delay:0.7s"></i>
                <i class="fas fa-sparkles vc-star" style="bottom:22%;left:5%;animation-delay:1.2s"></i>
                <i class="fas fa-star vc-star" style="bottom:15%;right:7%;animation-delay:0.4s"></i>
                <i class="fas fa-star vc-star" style="top:50%;left:3%;animation-delay:1.6s;font-size:10px"></i>

                <!-- title -->
                <h2 class="vc-title">
                    <i class="fas fa-birthday-cake" style="color:#FFD700;margin-right:10px;"></i><span class="vc-title-text">Cut the Cake</span> <span class="vc-emoji">\u{1F970}</span><i class="fas fa-crown" style="color:#FFD700;margin-left:10px;font-size:0.75em;vertical-align:middle;"></i>
                </h2>
                <p class="vc-subtitle">Tap the button to blow out the candles &amp; make a wish!</p>

                <!-- personalised ribbon -->
                <div class="vc-ribbon">
                    <i class="fas fa-heart vc-ribbon-icon" style="color:#FF4D8F;"></i>
                    <span class="vc-ribbon-text">${wishMsg}</span>
                    <i class="fas fa-heart vc-ribbon-icon" style="color:#FF4D8F;"></i>
                </div>

                <!-- cake scene -->
                <div class="vc-scene" id="vc-cake-stage">
                    <!-- Vertical center red cut line & Knife -->
                    <div class="vc-cut-line" id="vc-cut-line"></div>
                    <div class="vc-knife-wrap" id="vc-knife-wrap"><i class="fas fa-utensils"></i></div>

                    <!-- 5 candles sitting on top tier -->
                    <div class="vc-candles" id="vc-candles">
                        ${[0,1,2,3,4].map(i => `
                        <div class="vc-candle" data-i="${i}" id="vc-candle-${i}">
                            <div class="vc-flame" id="vc-flame-${i}"></div>
                            <div class="vc-smoke" id="vc-smoke-${i}"></div>
                            <div class="vc-wick"></div>
                            <div class="vc-candle-stick"></div>
                        </div>`).join('')}
                    </div>

                    <!-- top tier split halves (100% Symmetrical Decoration) -->
                    <div class="vc-tier">
                        <div class="vc-tier-body vc-top-body">
                            <div class="vc-half vc-left">
                                <div class="vc-frosting"></div>
                                <div class="vc-tier-dots"><div class="vc-dot"></div><div class="vc-dot"></div></div>
                                <div class="vc-tier-stars"><i class="fas fa-star"></i></div>
                            </div>
                            <div class="vc-half vc-right">
                                <div class="vc-frosting"></div>
                                <div class="vc-tier-dots"><div class="vc-dot"></div><div class="vc-dot"></div></div>
                                <div class="vc-tier-stars"><i class="fas fa-star"></i></div>
                            </div>
                        </div>
                    </div>

                    <!-- bottom tier split halves (100% Symmetrical Decoration) -->
                    <div class="vc-tier">
                        <div class="vc-tier-body vc-bottom-body">
                            <div class="vc-half vc-left">
                                <div class="vc-frosting"></div>
                                <div class="vc-tier-dots"><div class="vc-dot"></div><div class="vc-dot"></div></div>
                                <div class="vc-tier-stars"><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                            </div>
                            <div class="vc-half vc-right">
                                <div class="vc-frosting"></div>
                                <div class="vc-tier-dots"><div class="vc-dot"></div><div class="vc-dot"></div></div>
                                <div class="vc-tier-stars"><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                            </div>
                        </div>
                    </div>

                    <!-- plate -->
                    <div class="vc-plate"></div>
                </div>

                <!-- action button -->
                <div class="vc-btn-wrap">
                    <button class="vc-btn" id="vc-blow-btn">
                        <i class="fas fa-wind"></i>
                        <span>Blow Candles &amp; Cut Cake!</span>
                    </button>
                </div>

                <!-- wish card (hidden until after celebration) -->
                <div class="vc-wish-card" id="vc-wish-card">
                    <div class="vc-wish-icons">
                        <i class="fas fa-gift"></i>
                        <i class="fas fa-birthday-cake"></i>
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="vc-wish-text">
                        "May this year bring you boundless joy, laughter, and every dream you dare to dream. You are truly one in a million!"
                    </div>
                    <div class="vc-wish-sender">
                        <i class="fas fa-heart" style="color:#FF4D8F;margin-right:6px;font-size:0.9em;"></i>With all the love in the world
                    </div>
                </div>

                <!-- Beautiful Interactive Cake Slices Showcase (Reveals after cake cut!) -->
                <div class="vc-slices-wrapper" id="vc-slices-wrapper">
                    <h3 class="vc-slices-heading">
                        <i class="fas fa-utensils" style="color:#FFD700;margin-right:8px;"></i>Here is your Cake Slice Sharing! \u{1F370}
                    </h3>
                    <p class="vc-slices-sub">Tap any slice to take a bite!</p>

                    <div class="vc-slices-grid">
                        <!-- Slice 1: For You -->
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">\u{1F370}<span class="vc-slice-cherry">\u{1F353}</span></div>
                            <div class="vc-slice-badge">For You</div>
                            <div class="vc-slice-label">Here is a slice for <strong>You</strong>! \u{1F60B}</div>
                            <div class="vc-slice-toast">Yum! Delicious! \u{1F60B}</div>
                        </div>

                        <!-- Slice 2: For Me -->
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">\u{1F370}<span class="vc-slice-cherry">\u{1F352}</span></div>
                            <div class="vc-slice-badge">For Me</div>
                            <div class="vc-slice-label">Here is a slice for <strong>Me</strong>! \u{1F382}</div>
                            <div class="vc-slice-toast">Save me a bite! \u{1F382}</div>
                        </div>

                        <!-- Slice 3: For Everyone -->
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">\u{1F370}<span class="vc-slice-cherry">\u{1F31F}</span></div>
                            <div class="vc-slice-badge">For Everyone</div>
                            <div class="vc-slice-label">A big slice for <strong>Everyone</strong>! \u{1F389}</div>
                            <div class="vc-slice-toast">Party Time! \u{1F389}</div>
                        </div>

                        <!-- Slice 4: Extra Slice of Love -->
                        <div class="vc-slice-card">
                            <div class="vc-slice-graphic">\u{1F370}<span class="vc-slice-cherry">\u{1F496}</span></div>
                            <div class="vc-slice-badge">Extra Slice</div>
                            <div class="vc-slice-label">An extra slice of <strong>Love</strong>! \u{1F495}</div>
                            <div class="vc-slice-toast">Made with Love! \u{1F496}</div>
                        </div>
                    </div>
                </div>

                <audio id="vc-audio"
                    src="https://www.dropbox.com/scl/fi/veung117ggbzx65sxlj98/Crackers-mini.mp3?rlkey=tfheg9i04k6upkavcpdsrghle&st=koce788t&dl=1"
                    preload="auto" style="display:none;"></audio>
            `;

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

            /* --- Logic --- */
            const btn           = section.querySelector('#vc-blow-btn');
            const stage         = section.querySelector('#vc-cake-stage');
            const knife         = section.querySelector('#vc-knife-wrap');
            const cutLine       = section.querySelector('#vc-cut-line');
            const card          = section.querySelector('#vc-wish-card');
            const slicesWrap    = section.querySelector('#vc-slices-wrapper');
            const audio         = section.querySelector('#vc-audio');
            let done = false;

            /* Interactive Slice Tapping */
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
                        const x = (rect.left + rect.width / 2) / window.innerWidth;
                        const y = (rect.top + rect.height / 2) / window.innerHeight;
                        cfn({ particleCount: 35, spread: 60, origin: { x, y: Math.max(0.2, y) }, zIndex: 99999 });
                    }
                });
            });

            const blowAndCutCake = () => {
                if (done) return;
                done = true;

                /* PHASE 1: Light off / blow out ALL 5 candles FIRST (0ms - 450ms) */
                [0, 1, 2, 3, 4].forEach((i, idx) => {
                    setTimeout(() => {
                        const flame = section.querySelector(`#vc-flame-${i}`);
                        const smoke = section.querySelector(`#vc-smoke-${i}`);
                        if (flame) flame.classList.add('out');
                        if (smoke) smoke.classList.add('puffing');
                    }, idx * 90);
                });

                /* PHASE 2: After candles are completely lit off, start Knife & Red Line Slicing (at 600ms) */
                setTimeout(() => {
                    knife.classList.add('slicing');
                    cutLine.classList.add('slicing');
                }, 600);

                /* PHASE 3: Knife reaches bottom -> Split cake halves, disappear middle candle & play sound (at 1250ms) */
                setTimeout(() => {
                    const midCandle = section.querySelector('#vc-candle-2');
                    if (midCandle) {
                        midCandle.style.opacity = '0';
                        midCandle.style.transform = 'scale(0) translateY(-20px)';
                    }
                    stage.classList.add('is-cut');
                    cutLine.classList.add('flash');
                    knife.style.opacity = '0';

                    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
                }, 1250);

                /* PHASE 4: Confetti bursts, Wish Card & Slices Showcase reveal (1350ms - 1700ms) */
                const cfn = w.confetti || w.canvasConfetti || (typeof window !== 'undefined' && (window.confetti || window.canvasConfetti));
                if (cfn) {
                    const burst = (opts) => cfn({ zIndex: 99999, ...opts });
                    setTimeout(() => burst({ particleCount: 160, spread: 100, origin: { x: 0.5, y: 0.55 } }), 1350);
                    setTimeout(() => burst({ particleCount: 110, spread: 85,  origin: { x: 0.25, y: 0.5 }, angle: 60 }), 1550);
                    setTimeout(() => burst({ particleCount: 110, spread: 85,  origin: { x: 0.75, y: 0.5 }, angle: 120 }), 1700);
                    setTimeout(() => burst({ particleCount: 220, spread: 130, origin: { x: 0.5, y: 0.4 },
                        colors: ['#FFD700','#FF9100','#FF4D8F','#7B5DF6','#ffffff'] }), 1900);
                }

                setTimeout(() => {
                    card.style.display = 'block';
                    if (slicesWrap) slicesWrap.style.display = 'block';
                    btn.classList.add('done');
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Wish Granted &amp; Cake Cut!</span>';
                }, 1600);
            };

            if (btn) btn.addEventListener('click', blowAndCutCake);
            if (stage) stage.addEventListener('click', blowAndCutCake);

            return { cleanup: () => section.remove() };
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
                    z-index: 2147483647;
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
                if (isAnimating) return;
                isAnimating = true;

                btn.innerHTML = '<i class="fas fa-heart" style="color: #fff; animation: vhHugPulse 1s infinite;"></i> <span id="vhBtnText">Hug Received with Love! 💖</span>';

                const petalCount = 50;
                const heartPath = [];
                const winWidth = w.innerWidth || d.documentElement.clientWidth || 360;
                const winHeight = w.innerHeight || d.documentElement.clientHeight || 640;
                const centerX = winWidth / 2;
                const centerY = winHeight / 2;
                const scale = Math.min(centerX, centerY) * 0.75;

                // Show overlay
                overlay.classList.add('show');

                // Create center hug emoji
                const hugEmoji = d.createElement('div');
                hugEmoji.innerHTML = '&#129303;';
                const isMobile = winWidth <= 480;
                const emojiSize = isMobile ? '90px' : '120px';
                hugEmoji.style.cssText = `
                    position: fixed;
                    font-size: ${emojiSize};
                    z-index: 10001;
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0);
                    transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    pointer-events: none;
                    filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35));
                    left: ${centerX}px;
                    top: ${centerY}px;
                `;
                d.body.appendChild(hugEmoji);

                // Generate heart shape points (parametric equation)
                for (let i = 0; i < petalCount; i++) {
                    const t = (i / petalCount) * Math.PI * 2;
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));

                    heartPath.push({
                        x: centerX + (x / 16) * scale,
                        y: centerY + (y / 16) * scale,
                        delay: i * 30
                    });
                }

                // Create petals
                heartPath.forEach((point, index) => {
                    const petal = d.createElement('div');
                    petal.style.cssText = `
                        position: fixed;
                        width: 22px;
                        height: 22px;
                        background-image: url('../assets/rose petal.png'), url('/assets/rose petal.png');
                        background-size: contain;
                        background-repeat: no-repeat;
                        pointer-events: none;
                        z-index: 10000;
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0) rotate(${Math.random() * 360}deg);
                        transition: all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        left: ${Math.random() < 0.5 ? -50 : winWidth + 50}px;
                        top: ${Math.random() * winHeight}px;
                    `;

                    d.body.appendChild(petal);

                    // Animate to heart position
                    setTimeout(() => {
                        petal.style.opacity = '1';
                        petal.style.left = point.x + 'px';
                        petal.style.top = point.y + 'px';
                        petal.style.transform = `translate(-50%, -50%) scale(1) rotate(${Math.random() * 360}deg)`;
                    }, point.delay);

                    // Fade out after heart formation
                    setTimeout(() => {
                        petal.style.opacity = '0';
                        petal.style.transform = `translate(-50%, -50%) scale(0) rotate(${Math.random() * 360}deg)`;
                    }, (petalCount * 30) + 3000);

                    // Remove from DOM
                    setTimeout(() => {
                        petal.remove();
                    }, (petalCount * 30) + 4000);
                });

                // Show hug emoji after heart formation is complete
                setTimeout(() => {
                    hugEmoji.style.opacity = '1';
                    hugEmoji.style.transform = 'translate(-50%, -50%) scale(1)';
                }, (petalCount * 30) + 200);

                // Pulse animation for hug emoji
                let pulseCount = 0;
                const pulseInterval = setInterval(() => {
                    if (pulseCount < 6) {
                        hugEmoji.style.transform = `translate(-50%, -50%) scale(${1.1 + (pulseCount % 2) * 0.1})`;
                        pulseCount++;
                    } else {
                        clearInterval(pulseInterval);
                    }
                }, 500);

                // Confetti burst
                const cfn = w.confetti || w.canvasConfetti || (typeof window !== 'undefined' && (window.confetti || window.canvasConfetti));
                if (cfn) {
                    setTimeout(() => {
                        cfn({ particleCount: 80, spread: 80, origin: { x: 0.5, y: 0.5 }, colors: ['#ff69b4', '#ff1493', '#ff85a2', '#ffffff'] });
                    }, (petalCount * 30) + 400);
                }

                // Fade out hug emoji
                setTimeout(() => {
                    hugEmoji.style.opacity = '0';
                    hugEmoji.style.transform = 'translate(-50%, -50%) scale(0)';
                }, (petalCount * 30) + 2800);

                // Remove hug emoji from DOM & close overlay
                setTimeout(() => {
                    hugEmoji.remove();
                    overlay.classList.remove('show');
                    isAnimating = false;
                }, (petalCount * 30) + 3800);
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

    // Global Event Delegation: Guarantees 100% button interactivity on generated & shared websites
    if (typeof document !== 'undefined') {
        const handleGlobalInteraction = function(e) {
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
                const section = hugBtn.closest('#magic-virtual-hug-section') || document.getElementById('magic-virtual-hug-section');
                e.preventDefault();
                e.stopPropagation();
                triggerVirtualHug(section || document);
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



