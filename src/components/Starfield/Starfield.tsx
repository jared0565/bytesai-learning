'use client';

import { useEffect, useRef } from 'react';

interface StaticStar {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  opacity: number;
  life: number;
  maxLife: number;
}

const BG = '#030a1a';

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Non-null assertion: element is guaranteed to be mounted when useEffect fires.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const el = canvasRef.current!;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let frame = 0;
    let stars: StaticStar[] = [];
    let meteors: Meteor[] = [];

    const resize = () => {
      el.width  = window.innerWidth;
      el.height = window.innerHeight;
      buildStars();
    };

    const buildStars = () => {
      const count = Math.min(320, Math.floor((el.width * el.height) / 5500));
      stars = [];
      for (let i = 0; i < count; i++) {
        const tier = Math.random();
        stars.push({
          x:            Math.random() * el.width,
          y:            Math.random() * el.height,
          r:            tier < 0.70 ? 0.4 + Math.random() * 0.5
                      : tier < 0.92 ? 1.0 + Math.random() * 0.7
                      :               1.8 + Math.random() * 0.8,
          baseOpacity:  0.25 + Math.random() * 0.55,
          twinkleSpeed: 0.006 + Math.random() * 0.018,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const spawnMeteor = () => {
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const speed = 9 + Math.random() * 10;
      meteors.push({
        x:       Math.random() < 0.6 ? Math.random() * el.width * 1.4 : el.width + 50,
        y:       Math.random() < 0.6 ? -30 : Math.random() * el.height * 0.4,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        length:  90  + Math.random() * 130,
        width:   1.2 + Math.random() * 1.2,
        opacity: 0.75 + Math.random() * 0.25,
        life:    0,
        maxLife: 55 + Math.random() * 50,
      });
    };

    const draw = () => {
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      frame++;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, el.width, el.height);

      // ── Static stars ──────────────────────────────────────────
      for (const s of stars) {
        const opacity = Math.max(0.05, s.baseOpacity + Math.sin(frame * s.twinkleSpeed + s.twinklePhase) * 0.18);

        if (s.r > 1.6) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
          glow.addColorStop(0, `rgba(180,210,255,${opacity * 0.35})`);
          glow.addColorStop(1, 'rgba(180,210,255,0)');
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,235,255,${opacity})`;
        ctx.fill();
      }

      // ── Spawn meteors ─────────────────────────────────────────
      const active = meteors.filter(m => m.life < m.maxLife);
      if (frame % 110 === 0 && active.length < 3 && Math.random() < 0.75) spawnMeteor();

      // ── Draw meteors ──────────────────────────────────────────
      for (const m of meteors) {
        if (m.life >= m.maxLife) continue;
        m.life++;
        m.x += m.vx;
        m.y += m.vy;

        const progress = m.life / m.maxLife;
        const fadeIn   = Math.min(1, progress / 0.15);
        const fadeOut  = progress > 0.70 ? Math.max(0, 1 - (progress - 0.70) / 0.30) : 1;
        const alpha    = m.opacity * fadeIn * fadeOut;
        if (alpha < 0.01) continue;

        const mag   = Math.hypot(m.vx, m.vy);
        const tailX = m.x - (m.vx / mag) * m.length;
        const tailY = m.y - (m.vy / mag) * m.length;

        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0,    `rgba(180,210,255,0)`);
        grad.addColorStop(0.55, `rgba(200,225,255,${alpha * 0.35})`);
        grad.addColorStop(1,    `rgba(255,255,255,${alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = m.width;
        ctx.lineCap     = 'round';
        ctx.stroke();

        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5);
        hg.addColorStop(0, `rgba(255,255,255,${alpha})`);
        hg.addColorStop(1, 'rgba(180,210,255,0)');
        ctx.beginPath();
        ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = hg;
        ctx.fill();
      }

      if (meteors.length > 15) meteors = meteors.filter(m => m.life < m.maxLife);
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
