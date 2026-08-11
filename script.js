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
