window.addEventListener('load', () => {
    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Track if user has manually scrolled/swiped
    let hasSwiped = false;

    // Much stronger and faster nudge tween so it is easily recognized
    const nudgeTween = gsap.to(".panel:not(.panel-1)", {
        x: -85, 
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        paused: true
    });

    // Use IntersectionObserver to start/stop Nudge cleanly based on visibility
    const nudgeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasSwiped) {
                const pinWindow = document.querySelector('.pin-window');
                // Failsafe for mobile to check if already scrolled
                if (window.matchMedia("(pointer: coarse)").matches && pinWindow && pinWindow.scrollLeft > 20) {
                    return; 
                }
                nudgeTween.play();
            } else {
                nudgeTween.pause();
                gsap.to(".panel:not(.panel-1)", { x: 0, duration: 0.3, overwrite: "auto" });
            }
        });
    }, { threshold: 0.3 });

    const pinSection = document.getElementById('portfolio-pin');
    if (pinSection) {
        nudgeObserver.observe(pinSection);
    }

    // 1. Horizontal Scroll Logic setup function
    let horizontalScrollTrigger = null;
    const track = document.querySelector(".horizontal-track");

    function initHorizontalScroll() {
        if (!track || window.matchMedia("(pointer: coarse)").matches) return;

        // Failsafe: Prevent duplicate instances by killing any existing trigger first
        killHorizontalScroll();

        // Ensure track is reset before calculating width
        gsap.set(track, { clearProps: "transform" });

        const getScrollAmount = () => -(track.scrollWidth - window.innerWidth);

        horizontalScrollTrigger = ScrollTrigger.create({
            id: "horiz-scroll",
            trigger: "#portfolio-pin",
            pin: true,
            scrub: 0.8,    // this line controls scroll speed
            start: "top 15%",
            end: () => `+=${track.scrollWidth}`, // Make the end dynamic based on content width
            invalidateOnRefresh: true,
            refreshPriority: 10, // Ensures pin spacer is calculated before elements below it
            animation: gsap.to(track, {
                x: getScrollAmount,
                ease: "none"
            }),
            onUpdate: (self) => {
                // Kill nudge permanently on desktop once progress starts
                if (self.progress > 0.05) {
                    hasSwiped = true;
                    nudgeTween.pause();
                    gsap.to(".panel:not(.panel-1)", { x: 0, duration: 0.3, overwrite: "auto" });
                }
            }
        });
    }

    function killHorizontalScroll() {
        if (horizontalScrollTrigger) {
            horizontalScrollTrigger.kill(true); // Kill and revert the animation
            horizontalScrollTrigger = null;
        }
        // Force cleanup of the inline style
        if (track) gsap.set(track, { clearProps: "all" });
    }

    // Initialize horizontal scroll initially if on desktop
    initHorizontalScroll();

    // 2. Vertical Snap Animations (Hero & Bottom Sections)
    gsap.utils.toArray('.snap-element').forEach(el => {
        gsap.fromTo(el, 
            { 
                y: 80, 
                rotateX: -12, 
                rotateZ: -1,  
                scale: 0.94, 
                opacity: 0,
                transformPerspective: 1000 
            },
            {
                y: 0, 
                rotateX: 0, 
                rotateZ: 0,
                scale: 1, 
                opacity: 1, 
                duration: 1.1, 
                ease: "back.out(1.5)", 
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    // ZERO-LAG MOBILE Swiping (Fallback)
    let mm = gsap.matchMedia();
    window.reinitMobileScrollListener = null;

    mm.add("(pointer: coarse)", () => {
        const pinWindow = document.querySelector('.pin-window');
        if (pinWindow) {
            const handleMobileSwipe = () => {
                if (pinWindow.scrollLeft > 20) {
                    hasSwiped = true;
                    nudgeTween.pause();
                    gsap.to(".panel:not(.panel-1)", { x: 0, duration: 0.3, overwrite: "auto" });
                    
                    // Crucial fix: Completely remove event listener after swiping to eliminate scroll lag
                    pinWindow.removeEventListener('scroll', handleMobileSwipe);
                }
            };
            
            pinWindow.addEventListener('scroll', handleMobileSwipe, { passive: true });
            
            // Allow re-attaching if user toggles tabs
            window.reinitMobileScrollListener = () => {
                pinWindow.removeEventListener('scroll', handleMobileSwipe);
                pinWindow.addEventListener('scroll', handleMobileSwipe, { passive: true });
            };
        }
    });

    // 3. FOOLPROOF CARD ANIMATION
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.to(entry.target, { 
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.6, 
                    ease: "back.out(1.2)", 
                    overwrite: true 
                });
            } else {
                gsap.to(entry.target, { 
                    opacity: 0.3, 
                    scale: 0.9, 
                    duration: 0.4, 
                    overwrite: true 
                });
            }
        });
    }, { 
        root: null,
        threshold: 0.15 
    });

    document.querySelectorAll('.panel').forEach((panel, index) => {
        if (index === 0) return; 
        
        const card = panel.querySelector('.horiz-anim-card');
        if (card) {
            gsap.set(card, { opacity: 0.3, scale: 0.9 });
            cardObserver.observe(card);
        }
    });

    // 4. Dynamic 3D Mouse Tilt Effect
    if (window.matchMedia("(pointer: fine)").matches) {
        const tiltCards = document.querySelectorAll('.hero-card, .project-card, .profile-card, .social-card');
        
        tiltCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; 
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const tiltStrength = 8; 
                const rotateX = ((y - centerY) / centerY) * -tiltStrength;
                const rotateY = ((x - centerX) / centerX) * tiltStrength;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
                card.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';
                card.style.zIndex = '10';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
                card.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.zIndex = '1';
                
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.transition = '';
                }, 600);
            });
        });
    }

    // 5 & 6. Unified Nav & Toggle Logic
    const btnProjects = document.getElementById('btn-projects');
    const btnCerts = document.getElementById('btn-certs');
    const toggleSlider = document.getElementById('toggle-slider');
    const viewProjects = document.getElementById('view-projects');
    const viewCerts = document.getElementById('view-certs');
    const showcaseSection = document.getElementById('showcase-trigger');

    if (viewCerts && viewCerts.classList.contains('hidden-view')) {
        viewCerts.style.display = 'none';
    }
    if (viewProjects && viewProjects.classList.contains('hidden-view')) {
        viewProjects.style.display = 'none';
    }

    function switchView(isProjects) {
        if (!btnCerts || !btnProjects || !toggleSlider || !viewCerts || !viewProjects) return;

        // Prevent redundant layout shifts and GSAP re-initializations if the view is already active
        if (isProjects && btnProjects.classList.contains('active')) return;
        if (!isProjects && btnCerts.classList.contains('active')) return;

        // Cache the current scroll position before layout changes
        const currentScrollY = window.scrollY;

        if (isProjects) {
            btnCerts.classList.remove('active');
            btnProjects.classList.add('active');
            toggleSlider.style.transform = 'translateX(0)';
            
            viewCerts.classList.add('hidden-view');
            viewProjects.classList.remove('hidden-view');
            
            viewCerts.style.display = 'none';
            viewProjects.style.display = 'block';

            // Re-initialize the horizontal scroll logic from scratch
            initHorizontalScroll();
            
            // Failsafe: Reset swiped tracker if they are at the absolute start
            const pinWindow = document.querySelector('.pin-window');
            if (pinWindow && pinWindow.scrollLeft <= 20) {
                hasSwiped = false;
                if (window.reinitMobileScrollListener) window.reinitMobileScrollListener();
            }

            // Fire Nudge instantly if switched while in view
            if (pinSection && !hasSwiped) {
                const rect = pinSection.getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= window.innerHeight) {
                    nudgeTween.play();
                }
            }

        } else {
            btnProjects.classList.remove('active');
            btnCerts.classList.add('active');
            toggleSlider.style.transform = 'translateX(100%)';
            
            viewProjects.classList.add('hidden-view');
            viewCerts.classList.remove('hidden-view');
            
            viewProjects.style.display = 'none';
            viewCerts.style.display = 'block';
            
            // Completely destroy the horizontal scroll mechanics to prevent layout pollution
            killHorizontalScroll();

            // Failsafe: Reset the nudge visually if they switch tabs while it's playing
            nudgeTween.pause();
            gsap.to(".panel:not(.panel-1)", {x: 0, duration: 0.1, overwrite: "auto"});
        }
        
        // Ensure GSAP evaluates triggers top-to-bottom
        ScrollTrigger.sort();
        // Force an immediate refresh of all triggers based on the new layout
        ScrollTrigger.refresh(true);

        // If we toggled while deep in the page, smoothly adjust to the top of the section
        if (showcaseSection && currentScrollY > showcaseSection.offsetTop) {
             window.scrollTo({top: showcaseSection.offsetTop, behavior: 'smooth'});
        }
    }

    // Toggle Buttons
    if (btnProjects) {
        btnProjects.addEventListener('click', () => switchView(true));
    }

    if (btnCerts) {
         btnCerts.addEventListener('click', () => switchView(false));
    }

    // Hero Buttons
    const heroBtnView = document.getElementById('hero-btn-view');
    const heroBtnCerts = document.getElementById('hero-btn-certs');
    const showcaseContent = document.querySelector('.showcase-content');

    function triggerGlow() {
        if (showcaseContent) {
            showcaseContent.classList.remove('target-glow');
            void showcaseContent.offsetWidth; 
            showcaseContent.classList.add('target-glow');
            
            setTimeout(() => {
                showcaseContent.classList.remove('target-glow');
            }, 2000);
        }
    }

    function handleHeroNav(isProjects) {
        switchView(isProjects);
        if (showcaseSection) {
            setTimeout(() => {
                showcaseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
        triggerGlow();
    }

    if (heroBtnView) {
        heroBtnView.addEventListener('click', (e) => {
            e.preventDefault(); 
            handleHeroNav(true);
        });
    }

    if (heroBtnCerts) {
        heroBtnCerts.addEventListener('click', (e) => {
            e.preventDefault();
            handleHeroNav(false);
        });
    }

    // 7. Typing Animation for Hero Title
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const textToType = typingElement.innerText;
        typingElement.innerText = ''; 
        
        let charIndex = 0;
        function typeChar() {
            if (charIndex < textToType.length) {
                typingElement.innerText += textToType.charAt(charIndex);
                charIndex++;
                setTimeout(typeChar, 100); 
            }
        }
        
        setTimeout(typeChar, 700);
    }
    
    // 8. Auto-Trigger Staggered Wave Effect for Social Cards
    function triggerSocialWave() {
        const socialCards = document.querySelectorAll('.social-card');
        socialCards.forEach((card, index) => {
            card.classList.remove('tile-wave-active');
            void card.offsetWidth; // trigger reflow
            setTimeout(() => {
                card.classList.add('tile-wave-active');
                setTimeout(() => {
                    card.classList.remove('tile-wave-active');
                }, 2000); 
            }, index * 250); 
        });
    }

    const btnGetInTouch = document.getElementById('btn-get-in-touch');
    if (btnGetInTouch) {
        btnGetInTouch.addEventListener('click', triggerSocialWave);
    }

    // Run the wave effect when user scrolls to the Connect Section
    const connectObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                triggerSocialWave();
                // Unobserve after playing once to prevent mobile scroll lag!
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 }); 

    const connectSection = document.getElementById('connect-section');
    if (connectSection) {
        connectObserver.observe(connectSection);
    }

    // 9. Generic Wave Glow for Headings (.creative-hover) across all sections
    const waveGlowObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('wave-glow-active');
                void entry.target.offsetWidth; 
                entry.target.classList.add('wave-glow-active');
                
                // Unobserve after playing once to eliminate background processing / lag!
                observer.unobserve(entry.target);
                
                setTimeout(() => {
                    entry.target.classList.remove('wave-glow-active');
                }, 1200); 
            }
        });
    }, { threshold: 0.2 });

    // Apply to elements that have creative-hover, excluding project links to prevent layout jumps
    document.querySelectorAll('.creative-hover:not(.project-link)').forEach(el => {
        waveGlowObserver.observe(el);
    });

    // Initial refresh to lock in measurements on load
    ScrollTrigger.refresh();
});