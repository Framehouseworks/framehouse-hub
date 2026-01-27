'use client'

import { motionTemplates, MotionType } from '@/utilities/motions'
import { motion } from 'framer-motion'
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
    const variants = isFunction ? (template as any)() : template

    // If it's a stagger container, we need to handle it differently
    if (type === 'staggerContainer') {
        return (
            <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                className={className}
            >
                {children}
            </motion.div>
        )
    }

    const templateTransition = (variants as any)?.transition || {}

    return (
        <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            variants={variants}
            transition={{ ...templateTransition, delay }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
