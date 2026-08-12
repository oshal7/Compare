import type { Transition } from "framer-motion";

// Shared spring physics so every card move / elimination feels like one system
// (PRD §2.2: stiffness 300, damping 30).
export const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const springSoft: Transition = { type: "spring", stiffness: 210, damping: 26 };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: springSoft,
};

export const popIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
  transition: spring,
};
