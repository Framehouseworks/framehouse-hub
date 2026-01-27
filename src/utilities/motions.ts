import { Transition, Variants } from "framer-motion";

/**
 * Standardized "Zipply" spring transition for a premium feel.
 */
export const ZIPPY_TRANSITION: Transition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1,
};

export type MotionType =
    | 'fadeEntrance'
    | 'staggerContainer'
    | 'staggerItem'
    | 'parallax'
    | 'shimmer'
    | 'reveal';

/**
 * Global Animation Templates
 */
export const motionTemplates: Record<MotionType, any> = {
    // Entrance animation for container blocks
    fadeEntrance: {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -30 },
        transition: ZIPPY_TRANSITION,
    },

    // Staggered children container
    staggerContainer: (staggerChildren = 0.1): Variants => ({
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: {
                staggerChildren,
                delayChildren: 0.1,
            },
        },
    }),

    // Stagger item entrance
    staggerItem: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: ZIPPY_TRANSITION,
    },

    // Subtle Reveal for images (Slow fade)
    reveal: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] },
    },

    // Subtle Parallax effect for featured images
    parallax: {
        initial: { scale: 1.05, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { ...ZIPPY_TRANSITION, duration: 1.5 },
    },

    // Loading shimmer pulse
    shimmer: {
        animate: {
            opacity: [0.2, 0.4, 0.2],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    },
};
