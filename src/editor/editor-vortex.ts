// @ts-nocheck
/**
 * Neon 3D Particle Vortex Background
 * Custom colored for Map Maker (editor.html)
 */
(function() {
    const canvas = document.getElementById('editorBg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H;
    let frame = 0;

    const PARTICLE_COUNT  = 800;
    const GRID_TILE_COUNT = 25;
    const VORTEX_CX_RATIO = 0.5;
    const VORTEX_CY_RATIO = 0.48;

    const particles  = [];
    const gridTiles  = [];

    const neonColors = [
        { r: 0, g: 243, b: 255 },    // Cyan
        { r: 255, g: 0, b: 255 },    // Magenta
        { r: 191, g: 0, b: 255 },    // Purple
        { r: 57, g: 255, b: 20 }     // Neon Green
    ];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        initParticles();
        initGridTiles();
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * Math.max(W, H) * 0.6;
        const z      = Math.random();
        const speed  = 0.002 + Math.random() * 0.009;
        const sizeRoll = Math.random();
        let baseSize;
        if (sizeRoll < 0.6)      baseSize = 0.2 + Math.random() * 0.5;
        else if (sizeRoll < 0.85) baseSize = 0.5 + Math.random() * 1.0;
        else if (sizeRoll < 0.95) baseSize = 1.0 + Math.random() * 1.2;
        else                      baseSize = 1.5 + Math.random() * 1.5;

        const color = neonColors[Math.floor(Math.random() * neonColors.length)];

        return {
            angle, radius, z, speed,
            baseRadius: radius,
            size: baseSize,
            color,
            alpha: 0.06 + z * 0.45,
            drift: Math.random() * Math.PI * 2,
            driftAmp: 5 + Math.random() * 35,
            driftSpeed: 0.0004 + Math.random() * 0.002,
            trail: [],
            maxTrail: Math.floor(1 + z * 5)
        };
    }

    function initGridTiles() {
        gridTiles.length = 0;
        for (let i = 0; i < GRID_TILE_COUNT; i++) {
            gridTiles.push(createGridTile());
        }
    }

    function createGridTile() {
        return {
            x: Math.random() * W * 1.4 - W * 0.2,
            y: H + 50 + Math.random() * H,
            size: 10 + Math.random() * 30,
            speed: 0.25 + Math.random() * 0.6,
            alpha: 0.015 + Math.random() * 0.04,
            rotation: -35 + Math.random() * 10,
            rotSpeed: (Math.random() - 0.5) * 0.1,
            drift: Math.random() * 0.3 + 0.1
        };
    }

    function draw() {
        frame++;
        const time = frame * 16;
        ctx.clearRect(0, 0, W, H);

        const cx = W * VORTEX_CX_RATIO;
        const cy = H * VORTEX_CY_RATIO;

        // Epicenter glow
        const pulse = Math.sin(time * 0.00015) * 0.3 + 0.7;
        const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5);
        g1.addColorStop(0, `rgba(191,0,255,${0.06 * pulse})`);
        g1.addColorStop(0.2, `rgba(255,0,255,${0.04 * pulse})`);
        g1.addColorStop(0.5, `rgba(0,243,255,${0.015 * pulse})`);
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1;
        ctx.fillRect(cx - W, cy - H, W * 2, H * 2);

        // Grid tiles
        for (const tile of gridTiles) {
            tile.y -= tile.speed;
            tile.x += tile.drift;
            tile.rotation += tile.rotSpeed;
            if (tile.y < -80) {
                tile.y = H + 50 + Math.random() * 100;
                tile.x = Math.random() * W * 1.4 - W * 0.2;
                tile.alpha = 0.015 + Math.random() * 0.04;
            }
            ctx.save();
            ctx.translate(tile.x, tile.y);
            ctx.rotate((tile.rotation * Math.PI) / 180);
            ctx.strokeStyle = `rgba(0, 243, 255, ${tile.alpha})`;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-tile.size / 2, -tile.size / 2, tile.size, tile.size);
            if (tile.alpha > 0.03) {
                ctx.fillStyle = `rgba(0, 243, 255, ${tile.alpha * 0.3})`;
                ctx.fillRect(-tile.size / 2, -tile.size / 2, tile.size, tile.size);
            }
            ctx.restore();
        }

        // Particles
        for (const p of particles) {
            p.angle += p.speed * (0.7 + p.z * 0.6);
            const breathe = Math.sin(time * p.driftSpeed + p.drift) * p.driftAmp;
            const r = p.baseRadius + breathe;
            p.baseRadius -= p.speed * 0.25;
            if (p.baseRadius < 10) {
                p.baseRadius = 20 + Math.random() * Math.max(W, H) * 0.6;
                p.angle = Math.random() * Math.PI * 2;
                p.z = Math.random();
                const sizeRoll = Math.random();
                if (sizeRoll < 0.6)       p.size = 0.2 + Math.random() * 0.5;
                else if (sizeRoll < 0.85)  p.size = 0.5 + Math.random() * 1.0;
                else if (sizeRoll < 0.95)  p.size = 1.0 + Math.random() * 1.2;
                else                       p.size = 1.5 + Math.random() * 1.5;
                p.color = neonColors[Math.floor(Math.random() * neonColors.length)];
                p.alpha = 0.06 + p.z * 0.45;
                p.maxTrail = Math.floor(1 + p.z * 5);
                p.trail = [];
            }

            const perspective = 0.25 + p.z * 0.75;
            const projX = cx + Math.cos(p.angle) * r * perspective;
            const projY = cy + Math.sin(p.angle) * r * perspective * 0.6;
            const depthScale = 0.25 + p.z * 0.75;
            const drawSize = p.size * depthScale;
            const drawAlpha = p.alpha * depthScale;

            p.trail.unshift({ x: projX, y: projY });
            if (p.trail.length > p.maxTrail) p.trail.pop();

            for (let t = 1; t < p.trail.length; t++) {
                const tp = p.trail[t];
                const ta = drawAlpha * (1 - t / p.trail.length) * 0.4;
                const ts = drawSize * (1 - t / p.trail.length * 0.6);
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, ts, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${Math.max(0, ta)})`;
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(projX, projY, drawSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${drawAlpha})`;
            ctx.fill();

            if (p.z > 0.75 && drawSize > 1.2) {
                ctx.beginPath();
                ctx.arc(projX, projY, drawSize * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${drawAlpha * 0.05})`;
                ctx.fill();
            }
        }

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();

    // Panel opacity slider handler
    const opacitySlider = document.getElementById('panelOpacity');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--panel-opacity', e.target.value);
        });
    }
})();
