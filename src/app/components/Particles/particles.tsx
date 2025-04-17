"use client"
import React, { useRef, useEffect } from 'react';
import { useMousePosition } from "@/app/utils/mouse";
import styles from '@/app/componets/Particles/particles.module.css';

interface ShellCodeRainProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  color?: string;
}

const shellCodeSnippets = [
  "#!/bin/bash",
  "echo $HOME",
  "ls -la",
  "cd /var/log",
  "grep -r 'error'",
  "chmod +x script.sh",
  "if [ $? -eq 0 ]; then",
  "for i in {1..10}; do",
  "while read line; do",
  "case $var in",
  "function log() {",
  "trap 'cleanup' EXIT",
  "sed 's/foo/bar/g'",
  "awk '{print $1}'",
  "curl -X POST http://api.example.com",
  "docker run -d --name myapp",
  "git commit -m 'Initial commit'",
  "npm install express",
];

export default function ShellCodeRain({
  className = `${styles['shell-code-rain-background']}`,
  quantity = 50,
  staticity = 50,
  ease = 50
}: ShellCodeRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const particles = useRef<any[]>([]);
  const mousePosition = useMousePosition();
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext('2d');
    }
    initCanvas();
    animate();
    window.addEventListener('resize', initCanvas);

    return () => {
      window.removeEventListener('resize', initCanvas);
    };
  }, []);

  useEffect(() => {
    onMouseMove();
  }, [mousePosition.x, mousePosition.y]);

  const initCanvas = () => {
    resizeCanvas();
    initParticles();
  };

  const resizeCanvas = () => {
    if (canvasRef.current && contextRef.current) {
      canvasSize.current.w = window.innerWidth;
      canvasSize.current.h = window.innerHeight;
      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      contextRef.current.scale(dpr, dpr);
    }
  };

  const onMouseMove = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = mousePosition.x - rect.left - w / 2;
      const y = mousePosition.y - rect.top - h / 2;
      const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    }
  };

  const initParticles = () => {
    particles.current = [];
    for (let i = 0; i < quantity; i++) {
      particles.current.push(createParticle());
    }
  };

  const createParticle = () => ({
    x: Math.random() * canvasSize.current.w,
    y: Math.random() * canvasSize.current.h,
    translateX: 0,
    translateY: 0,
    size: 12,
    alpha: 0,
    targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
    dx: (Math.random() - 0.5) * 0.2,
    dy: (Math.random() - 0.5) * 0.2,
    magnetism: 0.1 + Math.random() * 4,
    snippet: shellCodeSnippets[Math.floor(Math.random() * shellCodeSnippets.length)]
  });

  const drawParticle = (particle: any) => {
    if (contextRef.current) {
      const { x, y, translateX, translateY, size, alpha, snippet } = particle;
      contextRef.current.translate(translateX, translateY);
      contextRef.current.font = `${size}px monospace`;
      contextRef.current.fillStyle = `rgba(153, 255, 153, ${alpha})`;
      contextRef.current.fillText(snippet, x, y);
      contextRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  const animate = () => {
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);

      particles.current.forEach((particle, i) => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.translateX += (mouse.current.x / (staticity / particle.magnetism) - particle.translateX) / ease;
        particle.translateY += (mouse.current.y / (staticity / particle.magnetism) - particle.translateY) / ease;

        if (particle.x < -particle.size * 10 || particle.x > canvasSize.current.w + particle.size * 10 ||
            particle.y < -particle.size || particle.y > canvasSize.current.h + particle.size) {
          particles.current[i] = createParticle();
        }

        particle.alpha += (particle.targetAlpha - particle.alpha) * 0.1;
        drawParticle(particle);
      });
    }
    requestAnimationFrame(animate);
  };

  return (
    <div className={className} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}