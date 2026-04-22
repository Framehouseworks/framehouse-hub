'use client'

import { motionTemplates, MotionType } from '@/utilities/motions'
import { motion, type Variants } from 'framer-motion'
import React from 'react'

interface MotionContainerProps {
    children: React.ReactNode
    type?: MotionType
    className?: string
    delay?: number
}

export const MotionContainer: React.FC<MotionContainerProps> = ({
    children,
    type = 'staggerItem',
    className,
    delay = 0
}) => {
    const template = motionTemplates[type]
    const isFunction = typeof template === 'function'
    const variants = (isFunction ? (template as () => Record<string, unknown>)() : (template as Record<string, unknown>)) as unknown as Variants

    // If it's a stagger container, we need to handle it differently
    if (type === 'staggerContainer') {
        return (
            <motion.div
                initial="initial"
                animate="animate"
                variants={variants}
                className={className}
            >
                {children}
            </motion.div>
        )
    }

    const templateTransition = (variants as Record<string, unknown>)?.transition || {}

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={variants}
            transition={{ ...templateTransition as object, delay }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
