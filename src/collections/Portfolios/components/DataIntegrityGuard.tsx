'use client'

import { useDocumentInfo, useField, useForm } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

/**
 * Basic path-aware getter for Payload paths (e.g., layoutBlocks.2.items).
 * This utility traverses an object by a dot-notated string path.
 */
const getPathValue = (obj: any, path: string) => {
    if (!obj || !path) return undefined
    return path.split('.').reduce((acc, part) => {
        if (acc === undefined || acc === null) return undefined
        // If the part is a number, it's an array index
        if (!isNaN(Number(part))) {
            return acc[Number(part)]
        }
        return acc[part]
    }, obj)
}

interface DataIntegrityGuardProps {
    path: string
    children: (props: {
        value: any
        isHydrated: boolean
        safeValue: any
    }) => React.ReactNode
}

/**
 * DataIntegrityGuard:
 * Automatically recovers from "Detached Sync" states in Payload 3.x.
 * If useField returns a number (count) while a document source has the full array,
 * it pulls the array and 'setValue's it back into the form to re-attach.
 */
export const DataIntegrityGuard: React.FC<DataIntegrityGuardProps> = ({ path, children }) => {
    const form = useForm() as any
    const docContext = useDocumentInfo() as any
    const { value, setValue } = useField<any>({ path })

    const [isHydrated, setIsHydrated] = useState(false)
    const hasAttemptedAutoRecovery = useRef(false)

    // Search for potential document sources
    const initialValues = form?.initialValues
    const rawData = typeof form?.getData === 'function' ? form.getData() : null;
    const possibleDoc = docContext?.initialData || docContext?.data || docContext?.doc || docContext?.initialValues;

    const fromInitial = getPathValue(initialValues, path);
    const fromDoc = getPathValue(possibleDoc, path);
    const fromData = getPathValue(rawData, path);

    // Any of these being an array of items is our "Source of Truth"
    const resolvedInitial = [fromInitial, fromDoc, fromData].find(v => Array.isArray(v));

    useEffect(() => {
        if (!resolvedInitial) {
            // Case 1: No data exists on server (empty is valid)
            setIsHydrated(true)
            return
        }

        const isValueArray = Array.isArray(value);
        const isResolvedArray = Array.isArray(resolvedInitial);

        // Success condition: value is an array and matches the length of the resolved source
        if (isValueArray && isResolvedArray && value.length === resolvedInitial.length) {
            setIsHydrated(true)
        } else if (isValueArray && value.length > 0) {
            // Also success if we have items (might be new ones)
            setIsHydrated(true)
        } else {
            // DETACHED STATE: Attempt automatic re-attachment
            if (!hasAttemptedAutoRecovery.current && isResolvedArray) {
                console.warn(`[HydrationGuard] DETACHED STATE DETECTED at ${path}. Attempting AUTO-RECOVERY...`);
                hasAttemptedAutoRecovery.current = true;
                setValue(resolvedInitial);
                // The next cycle should see the array value and set isHydrated to true
            }
            setIsHydrated(false)
        }
    }, [value, path, resolvedInitial, setValue])

    // safeValue ensures children work with server data if useField hasn't synced yet
    const safeValue = isHydrated ? value : resolvedInitial

    return (
        <>
            {children({
                value,
                isHydrated,
                safeValue,
            })}
        </>
    )
}
