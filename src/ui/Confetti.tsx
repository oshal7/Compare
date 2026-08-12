import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Lightweight particle burst on final convergence (PRD §2.2). No library, no assets.
const COLORS = ["#38bdf8", "#818cf8", "#f43f5e", "#f59e0b", "#22d3ee"];

interface Particle {
  id: number;
  x: number;
  y: number;
  rot: number;
  color: string;
}

export function Confetti({ fire }: { fire: boolean }) {
  const [parts, setParts] = useState<Particle[]>([]);

  useEffect(() => {
    if (!fire) return;
    const next: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 620,
      y: -(Math.random() * 480 + 120),
      rot: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
    }));
    setParts(next);
    const t = setTimeout(() => setParts([]), 2200);
    return () => clearTimeout(t);
  }, [fire]);

  if (parts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {parts.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rot }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ background: p.color }}
          className="absolute h-2.5 w-1.5 rounded-[1px]"
        />
      ))}
    </div>
  );
}
