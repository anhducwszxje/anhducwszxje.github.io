const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    host.addEventListener('pointermove', event => {
        const rect = host.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.active = true;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { pointer.active = false; });

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

createNetwork(document.getElementById('networkCanvas'), { density: 8, minNodes: 240, mobileMinNodes: 72, maxNodes: 240, speed: .9, opacity: .34 });
createNetwork(document.getElementById('contactNetwork'), { density: 18, minNodes: 82, mobileMinNodes: 42, maxNodes: 100, speed: .4, opacity: .22 });

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

// Research constellation: pointer previews, keyboard focus, and persistent touch selection.
const constellation = document.querySelector('.constellation');
if (constellation) {
    const researchNodes = [...constellation.querySelectorAll('[data-research]')];
    const researchLinks = [...constellation.querySelectorAll('[data-link]')];
    const detailLabel = document.querySelector('.research-detail-label');
    const detailText = document.querySelector('.research-detail p');
    let selectedNode = null;
    function showResearch(node) {
        constellation.classList.toggle('is-exploring', Boolean(node));
        researchNodes.forEach(item => {
            item.classList.toggle('is-active', item === node);
            item.setAttribute('aria-pressed', String(item === selectedNode));
        });
        researchLinks.forEach(link => link.classList.toggle('is-active', link.dataset.link === node?.dataset.research));
        detailLabel.textContent = node ? node.querySelector('.research-node-name').textContent : 'EXPLORE THE CONSTELLATION';
        detailText.textContent = node ? node.dataset.detail : 'Select a focus to explore its technologies and research interests.';
    }
    researchNodes.forEach(node => {
        node.addEventListener('pointerenter', event => {
            if (event.pointerType !== 'touch') showResearch(node);
        });
        node.addEventListener('pointerleave', () => showResearch(researchNodes.includes(document.activeElement) ? document.activeElement : selectedNode));
        node.addEventListener('focus', () => showResearch(node));
        node.addEventListener('blur', () => showResearch(selectedNode));
        node.addEventListener('click', () => {
            selectedNode = selectedNode === node ? null : node;
            showResearch(selectedNode);
        });
        node.addEventListener('keydown', event => {
            if (event.key === 'Escape') { selectedNode = null; showResearch(null); }
        });
    });
    // Four light bodies bounce off one another, the hub, and the map boundary.
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionButton = constellation.querySelector('.map-motion');
    const svg = constellation.querySelector('svg');
    const hub = constellation.querySelector('.research-hub');
    const seeds = [[.25,.25,14,9],[.77,.3,-11,14],[.73,.76,-13,-9],[.23,.72,12,-13]];
    const bodies = researchNodes.map((element, i) => ({ element, x: 0, y: 0, vx: seeds[i][2], vy: seeds[i][3], radius: 0 }));
    const sparks = bodies.map(() => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', '2'); dot.setAttribute('fill', '#a6e9ee'); svg.append(dot); return dot;
    });
    let width = 0, height = 0, paused = false, hovered = false, visible = false, frame = 0, lastTime = 0;
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
                const gap = body.radius + other.radius + 22;
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
    function drawMap(time) {
        bodies.forEach((body, i) => {
            body.element.style.left = body.x + 'px'; body.element.style.top = body.y + 'px';
            const cx = width / 2, cy = height * .51, dx = body.x - cx, dy = body.y - cy;
            const distance = Math.hypot(dx, dy) || 1, nx = dx / distance, ny = dy / distance;
            const start = hub.offsetWidth / 2 + 3, finish = distance - body.radius - 4;
            const ax = cx + nx * start, ay = cy + ny * start, bx = cx + nx * finish, by = cy + ny * finish;
            const qx = (ax + bx) / 2 - ny * 9, qy = (ay + by) / 2 + nx * 9;
            researchLinks[i].setAttribute('d', 'M'+ax+' '+ay+' Q'+qx+' '+qy+' '+bx+' '+by);
            const t = motionPreference.matches ? .5 : (time / 14000 + i * .24) % 1, u = 1 - t;
            sparks[i].setAttribute('cx', u*u*ax + 2*u*t*qx + t*t*bx);
            sparks[i].setAttribute('cy', u*u*ay + 2*u*t*qy + t*t*by);
        });
    }
    function tick(time) {
        frame = 0;
        const dt = Math.min((time - lastTime) / 1000, .04); lastTime = time;
        bodies.forEach(body => { body.x += body.vx * dt; body.y += body.vy * dt; });
        for (let i = 0; i < 3; i++) resolveCollisions();
        drawMap(time); scheduleMotion();
    }
    function scheduleMotion() {
        const stopped = paused || hovered || constellation.contains(document.activeElement) && document.activeElement !== motionButton || motionPreference.matches || !visible || document.hidden;
        if (stopped) { cancelAnimationFrame(frame); frame = 0; }
        else if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
    }
    motionButton.addEventListener('click', () => {
        paused = !paused;
        motionButton.setAttribute('aria-pressed', String(paused));
        motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
        motionButton.setAttribute('aria-label', paused ? 'Resume research map motion' : 'Pause research map motion');
        scheduleMotion();
    });
    researchNodes.forEach(node => {
        node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; scheduleMotion(); } });
        node.addEventListener('pointerleave', () => { hovered = false; scheduleMotion(); });
    });
    constellation.addEventListener('focusin', scheduleMotion);
    constellation.addEventListener('focusout', () => queueMicrotask(scheduleMotion));
    motionPreference.addEventListener('change', scheduleMotion);
    document.addEventListener('visibilitychange', scheduleMotion);
    new ResizeObserver(resizeMap).observe(constellation);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; scheduleMotion(); }).observe(constellation);

}
