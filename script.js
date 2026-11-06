const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Optional recording tour: frame each section, then return directly to the hero.
if (new URLSearchParams(window.location.search).get('autoscroll') === '1' && !reducedMotion) {
    window.addEventListener('load', () => {
        let frame = 0;
        function recordingStops() {
            const topInset = 84;
            const frameHeight = Math.max(200, window.innerHeight - topInset - 24);
            const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const sections = [...document.querySelectorAll('main section[id]')];
            const starts = sections.map(section => Math.max(0, section.getBoundingClientRect().top + window.scrollY - topInset));
            const stops = [0];
            starts.forEach((start, i) => {
                if (start > 0) stops.push(Math.min(start, bottom));
                const end = Math.min(starts[i + 1] ?? bottom, bottom);
                for (let position = start + frameHeight; position < end - 100; position += frameHeight) {
                    stops.push(Math.min(position, bottom));
                }
            });
            stops.push(bottom);
            return [...new Set(stops)].sort((a, b) => a - b);
        }
        function scrollFrame(target) {
            cancelAnimationFrame(frame);
            const start = window.scrollY;
            const began = performance.now();
            function animate(now) {
                const progress = Math.min((now - began) / 1400, 1);
                const ease = progress * progress * (3 - 2 * progress);
                window.scrollTo({ top: start + (target - start) * ease, behavior: 'instant' });
                if (progress < 1) frame = requestAnimationFrame(animate);
                else tour = window.setTimeout(advance, 5500);
            }
            frame = requestAnimationFrame(animate);
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        function advance() {
            if (document.hidden) {
                tour = window.setTimeout(advance, 5500);
                return;
            }
            const next = recordingStops().find(position => position > window.scrollY + 8);
            if (next === undefined) {
                cancelAnimationFrame(frame);
                window.scrollTo({ top: 0, behavior: 'instant' });
                tour = window.setTimeout(advance, 5500);
            } else {
                scrollFrame(next);
            }
        }
        let tour = window.setTimeout(advance, 5500);
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                clearTimeout(tour);
                cancelAnimationFrame(frame);
            }
        });
    });
}

// Loader
const loader = document.querySelector('.loader');
window.addEventListener('load', () => {
    window.setTimeout(() => loader?.classList.add('hidden'), reducedMotion ? 0 : 550);
});

// Navigation
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-links');
const navLinks = [...document.querySelectorAll('.nav-link')];
const backToTop = document.getElementById('backToTop');

function closeMenu() {
    hamburger?.classList.remove('active');
    navMenu?.classList.remove('active');
    hamburger?.setAttribute('aria-expanded', 'false');
}

hamburger?.addEventListener('click', () => {
    const isOpen = navMenu?.classList.toggle('active');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach(link => link.addEventListener('click', closeMenu));

window.addEventListener('scroll', () => {
    const hasScrolled = window.scrollY > 30;
    navbar?.classList.toggle('scrolled', hasScrolled);
    backToTop?.classList.toggle('visible', window.scrollY > 600);
}, { passive: true });

backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
}, { rootMargin: '-35% 0px -58% 0px' });

document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));

// Scroll reveal
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: .12 });

document.querySelectorAll('.reveal-up').forEach(element => revealObserver.observe(element));

// Research roles
const typedText = document.querySelector('.typed-text');
const roles = ['Cloud Researcher', 'Network Researcher', 'AI for Networks Researcher'];

if (typedText) {
    if (reducedMotion) {
        typedText.textContent = roles[0];
    } else {
        let roleIndex = 0;
        let characterIndex = 0;
        let deleting = false;

        function typeRole() {
            const role = roles[roleIndex];
            characterIndex += deleting ? -1 : 1;
            typedText.textContent = role.slice(0, characterIndex);

            let delay = deleting ? 38 : 76;
            if (!deleting && characterIndex === role.length) {
                deleting = true;
                delay = 1700;
            } else if (deleting && characterIndex === 0) {
                deleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                delay = 350;
            }
            window.setTimeout(typeRole, delay);
        }

        window.setTimeout(typeRole, 850);
    }
}

// Dense interactive network: hovering repels nearby nodes, matching the
// reference site's interaction without requiring clicks or drag gestures.
function createNetwork(canvas, options = {}) {
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const host = canvas.parentElement;
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let nodes = [];
    let animationFrame;
    let resizeTimer;

    function seedNodes() {
        const density = options.density || 24;
        const minimum = width < 650 ? (options.mobileMinNodes || 44) : (options.minNodes || 90);
        const count = Math.min(options.maxNodes || 150, Math.max(minimum, Math.floor(width / density)));
        nodes = Array.from({ length: count }, (_, index) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            driftX: (Math.random() - .5) * (options.speed || .25),
            driftY: (Math.random() - .5) * (options.speed || .25),
            impulseX: 0,
            impulseY: 0,
            radius: Math.random() * 1.7 + 1.1,
            phase: Math.random() * Math.PI * 2,
            accent: index % 11 === 0
        }));
        canvas.dataset.nodeCount = String(nodes.length);
    }

    function resize() {
        const rect = host.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        seedNodes();
        if (reducedMotion) draw(0);
    }

    function draw(time) {
        context.clearRect(0, 0, width, height);
        const connectionDistance = width < 650 ? 105 : 150;

        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];

            if (!reducedMotion) {
                if (pointer.active) {
                    const pointerX = node.x - pointer.x;
                    const pointerY = node.y - pointer.y;
                    const pointerDistance = Math.hypot(pointerX, pointerY);
                    const repulseDistance = 165;
                    if (pointerDistance < repulseDistance && pointerDistance > 0) {
                        const strength = (1 - pointerDistance / repulseDistance) * 1.05;
                        node.impulseX += (pointerX / pointerDistance) * strength;
                        node.impulseY += (pointerY / pointerDistance) * strength;

                        const impulseSpeed = Math.hypot(node.impulseX, node.impulseY);
                        if (impulseSpeed > 4.2) {
                            node.impulseX = (node.impulseX / impulseSpeed) * 4.2;
                            node.impulseY = (node.impulseY / impulseSpeed) * 4.2;
                        }
                    }
                }

                node.x += node.driftX + node.impulseX;
                node.y += node.driftY + node.impulseY;
                node.impulseX *= .88;
                node.impulseY *= .88;

                if (node.x < -12 || node.x > width + 12) {
                    node.driftX *= -1;
                    node.impulseX *= -.4;
                }
                if (node.y < -12 || node.y > height + 12) {
                    node.driftY *= -1;
                    node.impulseY *= -.4;
                }
            }

            for (let peerIndex = index + 1; peerIndex < nodes.length; peerIndex += 1) {
                const peer = nodes[peerIndex];
                const distance = Math.hypot(node.x - peer.x, node.y - peer.y);
                if (distance >= connectionDistance) continue;

                const alpha = (1 - distance / connectionDistance) * (options.opacity || .24);
                const accentLine = node.accent && peerIndex % 3 === 0;
                context.beginPath();
                context.moveTo(node.x, node.y);
                context.lineTo(peer.x, peer.y);
                context.strokeStyle = accentLine ? `rgba(155,109,255,${alpha * 1.35})` : `rgba(99,231,255,${alpha})`;
                context.lineWidth = accentLine ? 1.1 : .7;
                context.stroke();
            }

            const pulse = reducedMotion ? 1 : 1 + Math.sin(time * .0015 + node.phase) * .3;
            context.beginPath();
            context.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
            context.fillStyle = node.accent ? 'rgba(155,109,255,.95)' : 'rgba(226,240,255,.78)';
            context.fill();

            if (node.accent) {
                context.beginPath();
                context.arc(node.x, node.y, 6 * pulse, 0, Math.PI * 2);
                context.strokeStyle = 'rgba(155,109,255,.28)';
                context.stroke();
            }
        }

        if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    }

    const pointerHost = options.global ? window : host;
    pointerHost.addEventListener('pointermove', event => {
        const rect = host.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.active = true;
    }, { passive: true });
    pointerHost.addEventListener('pointerleave', () => { pointer.active = false; });

    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 120);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (reducedMotion) return;
        if (document.hidden) {
            cancelAnimationFrame(animationFrame);
        } else {
            animationFrame = requestAnimationFrame(draw);
        }
    });

    resize();
    if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
}

createNetwork(document.getElementById('networkCanvas'), { global: true, density: 8, minNodes: 240, mobileMinNodes: 72, maxNodes: 240, speed: .9, opacity: .34 });

// Highlight filters
const filterButtons = document.querySelectorAll('.filter-btn');
const highlightCards = document.querySelectorAll('.highlight-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        const filter = button.dataset.filter;

        highlightCards.forEach(card => {
            const visible = filter === 'all' || card.dataset.category === filter;
            card.classList.toggle('hidden-card', !visible);
        });
    });
});

document.getElementById('currentYear').textContent = new Date().getFullYear();

// Research constellation: automatic focus tour with optional keyboard/touch selection.
const constellation = document.querySelector('.constellation');
if (constellation) {
    const researchNodes = [...constellation.querySelectorAll('[data-research]')];
    const researchLinks = [...constellation.querySelectorAll('[data-link]')];
    const detailLabel = document.querySelector('.research-detail-label');
    const detailText = document.querySelector('.research-detail p');
    let selectedNode = researchNodes[0];
    let tourTimer;
    function showResearch(node, automatic = false) {
        detailText.parentElement.setAttribute('aria-live', automatic ? 'off' : 'polite');
        constellation.classList.toggle('is-exploring', Boolean(node));
        researchNodes.forEach(item => {
            item.classList.toggle('is-active', item === node);
            item.setAttribute('aria-pressed', String(item === selectedNode));
        });
        researchLinks.forEach(link => link.classList.toggle('is-active', link.dataset.link === node?.dataset.research));
        detailLabel.textContent = node ? node.querySelector('.research-node-name').textContent : 'EXPLORE THE CONSTELLATION';
        detailText.textContent = node ? node.dataset.detail : 'Select a focus to explore its technologies and research interests.';
    }
    function startResearchTour() {
        clearInterval(tourTimer);
        tourTimer = window.setInterval(() => {
            if (document.hidden) return;
            const index = (researchNodes.indexOf(selectedNode) + 1) % researchNodes.length;
            selectedNode = researchNodes[index];
            showResearch(selectedNode, true);
        }, 4000);
    }
    researchNodes.forEach(node => {
        function selectResearch() {
            selectedNode = node;
            showResearch(node);
            startResearchTour();
        }
        node.addEventListener('focus', selectResearch);
        node.addEventListener('click', selectResearch);
    });
    showResearch(selectedNode, true);
    startResearchTour();
    // Four light bodies bounce off one another, the hub, and the map boundary.
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const svg = constellation.querySelector('svg');
    const hub = constellation.querySelector('.research-hub');
    const seeds = [[.25,.25,35,24],[.77,.3,-29,38],[.73,.76,-38,-25],[.23,.72,32,-36]];
    const bodies = researchNodes.map((element, i) => ({ element, x: 0, y: 0, vx: seeds[i][2], vy: seeds[i][3], radius: 0 }));
    const sparks = [];
    const emissionTimers = bodies.map((_, i) => i * .35);
    let width = 0, height = 0, visible = false, frame = 0, lastTime = 0;
    function resizeMap() {
        width = constellation.clientWidth; height = constellation.clientHeight;
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        bodies.forEach((body, i) => {
            body.radius = body.element.offsetWidth / 2;
            body.x = seeds[i][0] * width; body.y = seeds[i][1] * height;
        });
        // Resolve the initial arrangement even when motion is disabled.
        for (let i = 0; i < 40; i++) resolveCollisions();
        drawMap(0);
    }
    function resolveCollisions() {
        const obstacles = [...bodies, { x: width / 2, y: height * .51, radius: hub.offsetWidth / 2, fixed: true }];
        bodies.forEach((body, i) => {
            for (let j = i + 1; j < obstacles.length; j++) {
                const other = obstacles[j], dx = other.x - body.x, dy = other.y - body.y;
                const distance = Math.hypot(dx, dy) || 1;
                const gap = body.radius + other.radius + 16;
                if (distance >= gap) continue;
                const nx = dx / distance, ny = dy / distance, shift = (gap - distance) / (other.fixed ? 1 : 2);
                body.x -= nx * shift; body.y -= ny * shift;
                if (!other.fixed) { other.x += nx * shift; other.y += ny * shift; }
                const speed = (body.vx - (other.vx || 0)) * nx + (body.vy - (other.vy || 0)) * ny;
                if (speed > 0) {
                    body.vx -= (other.fixed ? 2 : 1) * speed * nx;
                    body.vy -= (other.fixed ? 2 : 1) * speed * ny;
                    if (!other.fixed) { other.vx += speed * nx; other.vy += speed * ny; }
                }
            }
        });
        bodies.forEach(body => {
            const minX = body.radius + 12, maxX = width - body.radius - 12;
            const minY = body.radius + 43, maxY = height - body.radius - 35;
            if (body.x < minX) { body.x = minX; body.vx = Math.abs(body.vx); }
            if (body.x > maxX) { body.x = maxX; body.vx = -Math.abs(body.vx); }
            if (body.y < minY) { body.y = minY; body.vy = Math.abs(body.vy); }
            if (body.y > maxY) { body.y = maxY; body.vy = -Math.abs(body.vy); }
        });
    }
    function drawMap(dt) {
        bodies.forEach((body, i) => {
            body.element.style.left = body.x + 'px'; body.element.style.top = body.y + 'px';
            const cx = width / 2, cy = height * .51;
            // Continue underneath the circles so particles emerge and enter naturally.
            researchLinks[i].setAttribute('d', 'M'+cx+' '+cy+' L'+body.x+' '+body.y);
            if (!motionPreference.matches && dt > 0) {
                emissionTimers[i] -= dt;
                if (emissionTimers[i] <= 0) {
                    emissionTimers[i] += 1.6;
                    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('r', '2.4');
                    dot.setAttribute('fill', '#a6e9ee');
                    dot.setAttribute('pointer-events', 'none');
                    svg.append(dot);
                    sparks.push({ dot, body, progress: 0 });
                }
            }
        });
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            const cx = width / 2, cy = height * .51;
            const dx = spark.body.x - cx, dy = spark.body.y - cy;
            spark.progress += 85 * dt / Math.max(Math.hypot(dx, dy), 1);
            if (spark.progress >= 1 || motionPreference.matches) {
                spark.dot.remove();
                sparks.splice(i, 1);
                continue;
            }
            spark.dot.setAttribute('cx', cx + dx * spark.progress);
            spark.dot.setAttribute('cy', cy + dy * spark.progress);
        }
    }
    function tick(time) {
        frame = 0;
        const dt = Math.min((time - lastTime) / 1000, .04); lastTime = time;
        bodies.forEach(body => { body.x += body.vx * dt; body.y += body.vy * dt; });
        for (let i = 0; i < 3; i++) resolveCollisions();
        drawMap(dt); scheduleMotion();
    }
    function scheduleMotion() {
        const stopped = motionPreference.matches || !visible || document.hidden;
        if (stopped) { cancelAnimationFrame(frame); frame = 0; }
        else if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
    }
    motionPreference.addEventListener('change', () => { drawMap(0); scheduleMotion(); });
    document.addEventListener('visibilitychange', scheduleMotion);
    new ResizeObserver(resizeMap).observe(constellation);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; scheduleMotion(); }).observe(constellation);

}
