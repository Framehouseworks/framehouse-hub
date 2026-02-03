'use client'

import { useField } from '@payloadcms/ui'
import React, { useMemo } from 'react'
import { DataIntegrityGuard } from './DataIntegrityGuard'

/* 
 * NOTE: For the final implementation, we would import @dnd-kit and other UI components.
 * For now, I will build the functional structure that uses the DataIntegrityGuard 
 * to prove that the hydration issue is resolved in a "real" component.
 */

interface GalleryItem {
    id: string
    media: string | any
    size?: 'small' | 'medium' | 'large' | 'full'
    caption?: string
    alt?: string
}

export const VisualGalleryEditor: React.FC<{ path: string }> = ({ path }) => {
    return (
        <DataIntegrityGuard path={path}>
            {({ value, isHydrated, safeValue }) => (
                <VisualGalleryEditorInternal
                    path={path}
                    value={value}
                    isHydrated={isHydrated}
                    safeValue={safeValue}
                />
            )}
        </DataIntegrityGuard>
    )
}

const VisualGalleryEditorInternal: React.FC<{
    path: string
    value: any
    isHydrated: boolean
    safeValue: any
}> = ({ path, value, isHydrated, safeValue }) => {
    const { setValue } = useField<GalleryItem[]>({ path })

    // Use safeValue for rendering during hydration sync
    const items = useMemo(() => {
        return Array.isArray(safeValue) ? safeValue : []
    }, [safeValue])

    const handleAddItem = () => {
        const newItem: GalleryItem = {
            id: `item-${Date.now()}`,
            media: '',
            size: 'medium',
        }
        setValue([...items, newItem])
    }

    const handleRemoveItem = (id: string) => {
        setValue(items.filter(item => item.id !== id))
    }

    return (
        <div style={{
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'var(--theme-elevation-50)',
            minHeight: '200px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Visual Gallery Editor</h3>
                {!isHydrated && (
                    <div style={{ fontSize: '11px', color: 'var(--theme-warning-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor', animation: 'pulse 1.5s infinite' }} />
                        Synchronizing with server...
                    </div>
                )}
            </div>

            {/* Grid Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                {items.map((item, index) => (
                    <div key={item.id || index} style={{
                        aspectRatio: '1',
                        backgroundColor: 'var(--theme-elevation-150)',
                        borderRadius: '6px',
                        position: 'relative',
                        border: '2px dashed transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{ fontSize: '10px', opacity: 0.5 }}>Item {index + 1}</div>
                        <div style={{ fontSize: '9px', opacity: 0.3, marginTop: '4px' }}>{item.id}</div>

                        <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'var(--theme-error-500)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '9px',
                                cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}

                {/* Add Button Placeholder in Grid */}
                <div
                    onClick={handleAddItem}
                    style={{
                        aspectRatio: '1',
                        border: '2px dashed var(--theme-elevation-300)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '24px',
                        color: 'var(--theme-elevation-400)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-500)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-300)')}
                >
                    +
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes pulse {
          0% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
      `}} />

            {/* Hidden debug info for final verification */}
            <div style={{ fontSize: '9px', opacity: 0.3, marginTop: '20px' }}>
                Path: {path} | Hydrated: {isHydrated ? 'Yes' : 'No'} | Items: {items.length}
            </div>
        </div>
    )
}
