({
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
                d.head.appendChild(faLink);
            }
            const password = customText || "";
            const overlay = d.createElement("div");
            overlay.id = "lock-overlay";
            overlay.style.cssText = "position:fixed; inset:0; background:linear-gradient(135deg, rgba(26, 16, 37, 0.95) 0%, rgba(123, 93, 246, 0.8) 50%, rgba(255, 122, 47, 0.8) 100%); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Inter', sans-serif; color:white; backdrop-filter:blur(15px); opacity:0; transition:opacity 0.8s ease-in-out;";
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
                particle.style.cssText = `position:absolute; left:${Math.random()*100}%; top:${Math.random()*100}%; width:4px; height:4px; background:#fff; border-radius:50%; opacity:0.6; animation:floatParticle ${2+Math.random()*2}s infinite ease-in-out;`;
                particlesContainer.appendChild(particle);
            }
            if (!d.getElementById('lock-styles')) {
                const style = d.createElement('style');
                style.id = 'lock-styles';
                style.textContent = `@keyframes floatParticle{0%,100%{transform:translateY(0px) rotate(0deg); opacity:0.6;} 50%{transform:translateY(-20px) rotate(180deg); opacity:1;}} @keyframes pulse{0%,100%{transform:scale(1); opacity:0.8;} 50%{transform:scale(1.1); opacity:1;}} @keyframes shake{0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);}} #lock-overlay input::placeholder{color:rgba(255,255,255,0.7);}`;
                d.head.appendChild(style);
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
    },

    curtainReveal: {
        enable(d, w) {
            if (d.getElementById("magic-curtain-reveal-root")) return;
            const cd = d.createElement("div");
            cd.id = "magic-curtain-reveal-root";
            cd.style.cssText = "position:fixed; inset:0; z-index:2147483647; display:flex; pointer-events:none;";
            cd.innerHTML = `
                <div class="left" style="flex:1; background:repeating-linear-gradient(90deg,#5a0000 0,#8a0000 40px,#5a0000 80px); transition:transform 3.5s cubic-bezier(0.4, 0, 0.2, 1); transform-origin:left; box-shadow: 10px 0 30px rgba(0,0,0,0.5); border-right: 2px solid gold;"></div>
                <div class="right" style="flex:1; background:repeating-linear-gradient(90deg,#5a0000 0,#8a0000 40px,#5a0000 80px); transition:transform 3.5s cubic-bezier(0.4, 0, 0.2, 1); transform-origin:right; box-shadow: -10px 0 30px rgba(0,0,0,0.5); border-left: 2px solid gold;"></div>
                <button id="curtain-open-btn" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:linear-gradient(145deg, #7b5df6 0%, #ff7a2f 100%); color:white; border:none; padding:15px 30px; border-radius:50px; font-size:18px; font-weight:bold; cursor:pointer; box-shadow:0 8px 20px rgba(123, 93, 246, 0.4); transition:0.3s; pointer-events:auto; z-index:2147483648;">&#x2728; Open Curtains &#x2728;</button>
            `;
            d.body.appendChild(cd);
            const btn = cd.querySelector("#curtain-open-btn");
            const openCurtains = () => {
                const l = cd.querySelector(".left");
                const r = cd.querySelector(".right");
                if (l) l.style.transform = "translateX(-100%)";
                if (r) r.style.transform = "translateX(100%)";
                btn.remove();
                window.dispatchEvent(new CustomEvent('curtainOpened'));
                setTimeout(() => cd?.remove(), 4000);
            };
            btn.onclick = openCurtains;
            return {};
        },
        disable(d) { d?.getElementById("magic-curtain-reveal-root")?.remove(); }
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
                        margin: 2rem 1.5rem !important;
                        padding: 2.5rem 1.5rem !important;
                        border-radius: 40px !important;
                        transition: all 0.3s ease;
                    }

                    @media (max-width: 768px) {
                        [id^="magic-"][id$="-section"] {
                            margin: 1.5rem 1rem !important;
                            padding: 2rem 1rem !important;
                            border-radius: 32px !important;
                        }
                        #magic-fireworks-canvas { height: 300px !important; }
                        #gift-box-emoji { font-size: 5rem !important; }
                        .magic-scratch-card { width: 220px !important; height: 220px !important; }
                    }

                    @media (max-width: 480px) {
                        [id^="magic-"][id$="-section"] {
                            margin: 1rem 0.5rem !important;
                            padding: 1.5rem 0.8rem !important;
                            border-radius: 24px !important;
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
                setTimeout(() => { container.style.transform = "scale(1.2)"; container.style.opacity = "1";                 const audio = d.createElement('audio'); audio.id = 'magic-welcome-audio'; audio.src = 'https://www.dropbox.com/scl/fi/chvq5b2ekx51h8e3tc4n0/Typing.mp3?rlkey=9vvndv4gkkrzdbiis2fnfin3k&e=1&st=pj2hwihs&dl=1'; audio.loop = true; audio.volume = 0.5; audio.preload = 'auto'; d.body.appendChild(audio); audio.addEventListener('canplay', () => { audio.play().catch(e => console.log('Audio play failed', e)); let idx = 0; const iv = setInterval(() => { if (idx < msgText.length) { msgPara.innerHTML += msgText[idx]; idx++; } else { clearInterval(iv); const audio = d.getElementById('magic-welcome-audio'); if (audio) { audio.pause(); audio.remove(); } setTimeout(() => { overlay.style.opacity = "0"; setTimeout(() => { overlay?.remove(); d.body.classList.remove('magic-noscroll'); }, 1500); }, 3500); } }, 75); }); }, 100);
                return { intervals: [iv] };
            };
            const curtain = d.getElementById("magic-curtain-reveal-root");
            if (curtain) {
                const handler = () => { startTyping(); window.removeEventListener('curtainOpened', handler); };
                window.addEventListener('curtainOpened', handler);
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
            section.style.cssText = "padding: 2.5rem 1rem; text-align: center; background: rgba(0,0,0,0.08); border-radius: 48px; margin: 2rem 1.5rem; min-height: 450px; border: 1px solid rgba(255,255,255,0.1);";
            const title = d.createElement("h2");
            const lang = window.currentLang || 'en';
            const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
            title.innerText = (lang === 'hi' ? "\u0906\u0924\u093f\u0936\u092c\u093e\u091c\u0940 \u091f\u0947\u0915\u094d\u0938\u094d\u091f" : "Fireworks Text");
            title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.2rem"; title.style.color = "#ff7a2f";
            section.appendChild(title);
            const canvas = d.createElement("canvas");
            canvas.id = "magic-fireworks-canvas";
            canvas.style.cssText = "width:100%; height:350px; display:block; margin-top:20px; border-radius:24px; background:#000;";
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
                        octx.fillStyle = "#000"; octx.fillRect(0,0,canvasWidth,canvasHeight);
                        octx.fillStyle = "#fff"; octx.fillText(p.content, currentX, centerY);
                        const data = octx.getImageData(0,0,canvasWidth,canvasHeight).data;
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
                        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
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

    canvasStarfall: {
        enable(d, w) {
            if (d.getElementById("magic-star-canvas")) return;
            const can = d.createElement("canvas"); can.id = "magic-star-canvas"; can.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; opacity:0.5;";
            d.body.appendChild(can);
            const ctx = can.getContext("2d"); let stars = [];
            const resize = () => { can.width = w.innerWidth; can.height = w.innerHeight; stars = []; for (let i = 0; i < 200; i++) stars.push({ x: Math.random() * can.width, y: Math.random() * can.height, r: Math.random() * 2.5 }); };
            const animate = () => {
                if (!can.isConnected || !d.getElementById("magic-star-canvas")) {
                    w.removeEventListener("resize", resize);
                    return;
                }
                ctx.clearRect(0, 0, can.width, can.height);
                stars.forEach(s => { ctx.fillStyle = `rgba(255,255,200,${0.5 + Math.sin(Date.now() * 0.002 + s.x) * 0.3})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
                requestAnimationFrame(animate);
            };
            resize();
            w.addEventListener("resize", resize);
            animate();
            return { cleanup: () => w.removeEventListener("resize", resize) };
        },
        disable(d) {
            d?.getElementById("magic-star-canvas")?.remove();
        }
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
            const section = d.createElement("section"); section.id = "magic-gift-section"; section.style.cssText = "padding: 2rem 1rem; text-align: center; background: linear-gradient(145deg, rgba(255,215,0,0.1), rgba(255,100,0,0.05)); border-radius: 40px; margin: 2rem 1.5rem;";
            const title = d.createElement("h2"); title.innerText = "\uD83C\uDF81 " + (window.currentLang === 'hi' ? "\u0916\u093e\u0938 \u0924\u094b\u0939\u092b\u093e" : "Special Gift"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.2rem"; title.style.color = "#ffd700";
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
                if (images && images.length > 0) {
                    const gallery = d.createElement("div"); gallery.style.cssText = "display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;";
                    images.forEach(src => { const img = d.createElement("img"); img.src = src; img.style.cssText = "max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 20px; border: 4px solid gold; box-shadow:0 10px 20px rgba(0,0,0,0.2);"; gallery.appendChild(img); });
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
            const section = d.createElement("section"); section.id = "magic-scratch-section"; section.style.cssText = "padding: 2rem 1rem; background: rgba(0,0,0,0.05); border-radius: 40px; margin: 2rem 1.5rem;";
            const title = d.createElement("h2"); title.innerText = "\uD83C\uDFAB " + (window.currentLang === 'hi' ? "\u0938\u094d\u0915\u094d\u0930\u0948\u091a \u0915\u093e\u0930\u094d\u0921" : "Scratch Cards"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.2rem"; title.style.textAlign = "center"; title.style.color = "#ffa500";
            const lang = window.currentLang || 'en';
            const trans = (window.translations && window.translations[lang]) ? window.translations[lang] : {};
            const evData = window.getEventData ? window.getEventData() : { event: 'birthday' };
            section.appendChild(title); const grid = d.createElement("div"); grid.style.cssText = "display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; margin-top: 20px;";
            section.appendChild(grid); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
            const hasImages = images && images.length > 0;
            const getDef = () => {
                const def = trans.defaultScratchReveal;
                return typeof def === 'function' ? def(evData.event) : (def || "You're a Star!");
            };
            const contentItems = hasImages ? images : [customText || getDef()];
            contentItems.forEach((item, idx) => {
                const cardDiv = d.createElement("div"); 
                cardDiv.className = "magic-scratch-card";
                cardDiv.style.cssText = "width: 250px; height: 250px; background: #1a1025; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); position: relative; overflow: hidden; transition: width 0.3s, height 0.3s;";
                const canvas = d.createElement("canvas"); canvas.width = 500; canvas.height = 500; canvas.style.cssText = "width:100%; height:100%; cursor: pointer; display: block; position:absolute; top:0; left:0; z-index:2;";
                const bgContent = d.createElement("div"); bgContent.style.cssText = "position:absolute; inset:0; z-index:1; display:flex; align-items:center; justify-content:center; background:#1a1025; padding:15px; text-align:center; overflow:hidden;";
                if (hasImages) { const img = d.createElement("img"); img.src = item; img.style.cssText = "width:100%; height:100%; object-fit:cover; border-radius:10px;"; bgContent.appendChild(img); }
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
            section.style.cssText = "padding: 2.5rem 0; background: rgba(0,0,0,0.03); border-radius: 48px; margin: 2rem 1.5rem; overflow: visible; position: relative;";
            const title = d.createElement("h2"); title.innerText = "\uD83D\uDCDC " + (window.currentLang === 'hi' ? "\u092f\u093e\u0926\u094b\u0902 \u0915\u0940 \u091f\u093e\u0907\u092e\u0932\u093e\u0907\u0928" : "Memory Timeline"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.2rem"; title.style.textAlign = "center"; title.style.color = "#c0a080";
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
                d.head.appendChild(scrollbarStyle);
            }
            section.appendChild(title); section.appendChild(wrap); insertSectionBeforeFinal(d, section); scrollToElement(d, section);
            const getDef = () => {
                const def = trans.defaultMemoryTimeline;
                return typeof def === 'function' ? def(evData.event) : (def || "Memories");
            };
            const milestones = customText ? customText.split(',') : getDef().split(',');
            milestones.forEach((m, i) => {
                const card = d.createElement("div"); 
                card.className = "magic-timeline-card";
                card.style.cssText = "min-width: 260px; flex-shrink: 0; background: linear-gradient(145deg,#fffbf0,#ffe0c0); border-radius: 32px; padding: 25px; text-align: center; scroll-snap-align: center; color: #5a2e1e; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.05); transition: all 0.3s;";
                card.innerHTML = `<strong style="font-size:1.3rem; display:block; margin-bottom:8px;">\u2728 ${m} \u2728</strong><span style="font-size:0.95rem; opacity:0.8;">\u2764\uFE0F ${escapeHtml(userName)}</span>`;
                if (images?.[i]) { const img = d.createElement("img"); img.src = images[i]; img.style.cssText = "width: 100%; height: 160px; object-fit: cover; border-radius: 20px; margin-top: 15px; border: 4px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"; card.appendChild(img); }
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
            const section = d.createElement("section"); section.id = "magic-hug-section"; section.style.cssText = "padding: 2.5rem 1rem; text-align: center; background: linear-gradient(145deg, rgba(255,182,193,0.15), rgba(255,105,180,0.08)); border-radius: 48px; margin: 2rem 1.5rem;";
            const title = d.createElement("h2"); title.innerText = "\uD83E\uDD17 " + (typeof trans.hugTitle === 'function' ? trans.hugTitle(evData.event) : "Hug + Sky Letter"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.2rem"; title.style.color = "#ff69b4";
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
                // Add fade-in animation
                const style = d.createElement("style");
                style.textContent = "@keyframes skyFadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }";
                d.head.appendChild(style);
                // Remove after 5 seconds
                setTimeout(() => { skyOverlay.style.animation = "skyFadeOut 1s ease-in forwards"; setTimeout(() => skyOverlay.remove(), 1000); }, 5000);
                // Add fade-out animation
                const outStyle = d.createElement("style");
                outStyle.textContent = "@keyframes skyFadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }";
                d.head.appendChild(outStyle);
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
            const section = d.createElement("section"); section.id = "magic-polaroids-section"; section.style.cssText = "padding: 3rem 1rem; position: relative; background: linear-gradient(145deg, rgba(255,215,0,0.05), rgba(255,100,0,0.03)); border-radius: 48px; margin: 2rem 1.5rem; overflow: hidden; min-height: 550px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.1);";
            const title = d.createElement("h2"); title.innerText = "\uD83D\uDCF7 " + (typeof trans.polaroidTitle === 'function' ? trans.polaroidTitle(evData.event) : "Floating Memories"); title.style.fontFamily = "'Great Vibes', cursive"; title.style.fontSize = "2.4rem"; title.style.textAlign = "center"; title.style.color = "#c0a080"; section.appendChild(title);
            const canvas = d.createElement("div"); canvas.style.cssText = "position: absolute; inset: 0; pointer-events: none;"; section.appendChild(canvas);
            insertSectionBeforeFinal(d, section); scrollToElement(d, section);
            const imgs = (images && images.length) ? images : ["https://placehold.co/400x400/FFF9F0/5D4037?text=Upload+any+photo+here", "https://placehold.co/400x400/FFF9F0/5D4037?text=Upload+your+photo"];
            const iv = setInterval(() => {
                if (!section.isConnected) return;
                const p = d.createElement("div"); const src = imgs[Math.floor(Math.random() * imgs.length)];
                p.style.cssText = `position:absolute; left:${Math.random() * 75 + 5}%; bottom:-280px; width:170px; background:#fff; padding:12px 12px 40px 12px; box-shadow:0 25px 50px rgba(0,0,0,0.3); transform:rotate(${Math.random() * 20 - 10}deg); animation:magicPolaroidUp ${12 + Math.random() * 4}s linear forwards; border: 1px solid #eee; pointer-events: auto;`;
                p.innerHTML = `<img src="${src}" style="width:100%; height:150px; object-fit:cover; display:block; border-radius:2px;"><div style="font-family:'Caveat',cursive; text-align:center; margin-top:12px; font-size:1.2rem; color:#555;">\u2728 ${customText || userName} \u2728</div>`;
                canvas.appendChild(p); setTimeout(() => p.remove(), 20000);
            }, 5500);
            if (!d.querySelector("#magic-polaroid-style")) { const s = d.createElement("style"); s.id = "magic-polaroid-style"; s.textContent = `@keyframes magicPolaroidUp{0%{opacity:0; transform:translateY(0);} 10%{opacity:1;} 90%{opacity:1;} 100%{transform:translateY(-150vh); opacity: 0;}}`; d.head.appendChild(s); }
            return { intervals: [iv] };
        },
        disable(d) { d?.getElementById("magic-polaroids-section")?.remove(); }
    },

    finalSurprise: {
        enable(d, w, userName, customText) {
            if (d.getElementById("magic-final-surprise-section")) return;
            const audio = d.createElement('audio');
            audio.id = 'finalSurpriseAudio';
            audio.src = 'https://www.dropbox.com/scl/fi/71ubkozjspwdtby2n7f2w/Final-revel.mp3?rlkey=sn5onep6ry9tso0hd91jafm93&st=la13ckwz&dl=1';
            audio.preload = 'auto';
            audio.volume = 0.7;
            audio.style.display = 'none';
            d.body.appendChild(audio);
            const section = d.createElement("section"); section.id = "magic-final-surprise-section"; section.style.cssText = "padding: 3rem 1rem; text-align: center; margin: 2rem 1.5rem;";
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
        enable(d) {
            if (d.getElementById("magic-bg-audio")) return;
            const a = d.createElement("audio"); a.id = "magic-bg-audio"; a.src = "https://cdn.pixabay.com/download/audio/2022/10/16/audio_d0a0d7a6b4.mp3?filename=happy-birthday-8bit-128331.mp3";
            a.loop = true; a.volume = 0.3; a.autoplay = true; d.body.appendChild(a); a.play().catch(e => { }); return {};
        },
        disable(d) { d?.getElementById("magic-bg-audio")?.remove(); }
    },

    imageExplosion: {
        enable(d, w, userName, customText, images) {
            let section = d.getElementById("magic-image-explosion-section");
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
                    if (images && images.length > 0) {
                        uploadBtn.style.display = 'none';
                        removeBtn.style.display = 'block';
                        container.style.background = 'transparent';
                    } else {
                        uploadBtn.style.display = 'block';
                        removeBtn.style.display = 'none';
                        container.style.background = 'rgba(255,255,255,0.1)';
                    }
                }
                const p = section.querySelector("p");
                if (p) p.innerText = customText || "";
                return;
            }

            if (typeof injectFontsIfNeeded === 'function') injectFontsIfNeeded(d);

            section = d.createElement("section");
            section.id = "magic-image-explosion-section";
            section.style.cssText = "padding: 3rem 1.5rem; text-align: center; background: radial-gradient(circle at center, rgba(255,122,47,0.05), transparent); border-radius: 48px; margin: 2rem 1.5rem; min-height: 500px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center;";

            const title = d.createElement("h2");
            title.innerText = "\u2728 " + (window.currentLang === 'hi' ? "\u092e\u0948\u091c\u093f\u0915 \u092b\u094b\u091f\u094b" : "Magic Photo") + " \u2728";
            title.style.fontFamily = "'Great Vibes', cursive";
            title.style.fontSize = "2.6rem";
            title.style.color = "#ff7a2f";
            title.style.marginBottom = "30px";
            title.style.textShadow = "0 0 15px rgba(255,122,47,0.3)";
            section.appendChild(title);

            const imageContainer = d.createElement("div");
            imageContainer.style.cssText = "width: min(60vw, 300px); height: auto; background: rgba(255,255,255,0.1); text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative; transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); min-height: 100px;";

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
                uploadBtn.style.display = 'block';
                removeBtn.style.display = 'none';
                imageContainer.style.background = 'rgba(255,255,255,0.1)';
                window.parent.postMessage({ type: 'removeImageExplosion' }, '*');
            };
            imageContainer.appendChild(removeBtn);

            // Initially set button visibility and background
            if (images && images.length > 0) {
                uploadBtn.style.display = 'none';
                removeBtn.style.display = 'block';
                imageContainer.style.background = 'transparent';
            } else {
                uploadBtn.style.display = 'block';
                removeBtn.style.display = 'none';
                imageContainer.style.background = 'rgba(255,255,255,0.1)';
            }

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    img.src = url;
                    img.style.cssText = "width: auto; height: auto; max-width: 100%; max-height: 60vh; border: 3px solid #ff7a2f; border-radius: 24px;";
                    img.style.opacity = "1";
                    uploadBtn.style.display = 'none';
                    removeBtn.style.display = 'block';
                    imageContainer.style.background = 'transparent';
                    window.parent.postMessage({ type: 'updateImageExplosion', image: url }, '*');
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

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    imageContainer.style.transform = "scale(1.05)";

                    // Play crackers sound
                    crackersAudio.currentTime = 0;
                    crackersAudio.play().catch(e => console.log('Crackers audio failed:', e));

                    // Trigger Firecrackers/Fireworks - use iframe window context
                    const confettiFn = w.confetti || w.canvasConfetti || window.confetti || window.canvasConfetti;
                    if (confettiFn) {
                        const duration = 5 * 1000;
                        const animationEnd = Date.now() + duration;
                        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                        function randomInRange(min, max) { return Math.random() * (max - min) + min; }

                        const interval = setInterval(function () {
                            const timeLeft = animationEnd - Date.now();
                            if (timeLeft <= 0) return clearInterval(interval);
                            const particleCount = 50 * (timeLeft / duration);
                            confettiFn(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                            confettiFn(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                        }, 250);

                        // Additional "explosion" effect
                        setTimeout(() => {
                            confettiFn({

                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        }, 500);
                    }
                }
            }, { threshold: 0.2 });
            observer.observe(section);

            return { cleanup: () => observer.disconnect() };
        },
        disable(d) {
            d?.getElementById("magic-image-explosion-section")?.remove();
            const audio = d?.getElementById("crackersAudio");
            if (audio) audio.remove();
        }
    }
})

