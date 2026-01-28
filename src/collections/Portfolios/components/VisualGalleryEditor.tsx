'use client'

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Modal, toast, useConfig, useField, useModal } from '@payloadcms/ui'
import { CheckCircle2, ImageIcon, Trash2, XIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'


// types for the items in our array
interface GalleryItem {
    id: string
    media: string | any // ID or object
    size?: 'small' | 'medium' | 'large' | 'full'
    alt?: string
    caption?: string
    link?: string
    mediaData?: any // Cached media object for preview
}
// Ultra-robust ID generator 
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

// Sub-component for a sortable item
const SortableItem = ({
    item,
    index,
    isSelected,
    onRemove,
    onEdit,
    onSelect
}: {
    item: any,
    index: number,
    isSelected: boolean,
    onRemove: () => void,
    onEdit: () => void,
    onSelect: (e: React.MouseEvent) => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id || `item-${index}` })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        aspectRatio: '1',
        backgroundColor: 'var(--theme-elevation-100)',
        borderRadius: '4px',
        overflow: 'hidden',
        border: isDragging ? '2px solid var(--theme-primary-500)' :
            isSelected ? '2px solid var(--theme-primary-500)' : '1px solid var(--theme-elevation-200)',
        cursor: isDragging ? 'grabbing' : 'pointer',
        boxShadow: isSelected ? '0 0 0 4px rgba(var(--theme-primary-500-rgb), 0.1)' : 'none',
    }

    const thumb = item.mediaData?.sizes?.thumbnail?.url || item.mediaData?.url

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect(e)
                }}
                style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    zIndex: 3,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--theme-primary-500)' : 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                {isSelected && <CheckCircle2 size={16} color="#fff" />}
            </div>

            <div
                {...listeners}
                onClick={(e) => {
                    // Only trigger edit if it wasn't a drag and wasn't a selection click (handled above)
                    if (e.defaultPrevented) return

                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                        onSelect(e)
                    } else {
                        onEdit()
                    }
                }}
                style={{ width: '100%', height: '100%' }}
            >
                {thumb ? (
                    <img
                        src={thumb}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--theme-primary-500)', borderRadius: '50%' }} />
                    </div>
                )}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                }}
                style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    zIndex: 2,
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,0,0.7)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            >
                <XIcon size={14} />
            </button>

            <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                color: '#fff',
                textTransform: 'uppercase',
                zIndex: 2,
                pointerEvents: 'none'
            }}>
                {item.size || 'med'}
            </div>
        </div>
    )
}

// Sub-component for a loading/uploading item
const UploadingItem = ({ filename }: { filename: string }) => (
    <div style={{
        aspectRatio: '1',
        backgroundColor: 'var(--theme-elevation-100)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed var(--theme-elevation-250)',
        gap: '8px',
        padding: '12px'
    }}>
        <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--theme-elevation-200)',
            borderTopColor: 'var(--theme-primary-500)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '10px', opacity: 0.5, textAlign: 'center', wordBreak: 'break-all' }}>
            Uploading {filename}...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
)

export const VisualGalleryEditor: React.FC<{ path: string }> = ({ path }) => {
    const { value, setValue } = useField<GalleryItem[]>({ path })
    const { config } = useConfig()
    const { routes: { api: apiRoute } } = config as any
    const { toggleModal } = useModal()

    const [mediaCache, setMediaCache] = useState<Record<string, any>>({})
    const [uploadingItems, setUploadingItems] = useState<{ id: string, filename: string }[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const fetchedIdsRef = React.useRef<Set<string>>(new Set())


    const [selectedIndices, setSelectedIndices] = useState<number[]>([])

    const modalSlug = `inspector-${path.replace(/\./g, '-')}`

    const openInspector = (index: number) => {
        setEditingIndex(index)
        toggleModal(modalSlug)
    }

    const updateItem = (index: number, updates: Partial<GalleryItem>) => {
        const newValue = [...(value || [])]
        newValue[index] = { ...newValue[index], ...updates }
        setValue(newValue)
    }

    const toggleSelection = (index: number, multi: boolean) => {
        setSelectedIndices(prev => {
            if (prev.includes(index)) {
                return multi ? prev.filter(i => i !== index) : []
            } else {
                return multi ? [...prev, index] : [index]
            }
        })
    }

    const bulkDelete = () => {
        if (!selectedIndices.length) return
        if (confirm(`Delete ${selectedIndices.length} items?`)) {
            const sortedIndices = [...selectedIndices].sort((a, b) => b - a)
            const newValue = [...(value || [])]
            sortedIndices.forEach(idx => newValue.splice(idx, 1))
            setValue(newValue)
            setSelectedIndices([])
        }
    }

    const bulkUpdateSize = (size: GalleryItem['size']) => {
        const newValue = [...(value || [])]
        selectedIndices.forEach(idx => {
            newValue[idx] = { ...newValue[idx], size }
        })
        setValue(newValue)
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Handle file drops
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const newUploads = acceptedFiles.map(file => ({
            id: generateId(),
            filename: file.name
        }))

        setUploadingItems(prev => [...prev, ...newUploads])

        for (const file of acceptedFiles) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('alt', file.name) // Default alt
            formData.append('mediaType', 'image')

            try {
                const res = await fetch(`${apiRoute}/media`, {
                    method: 'POST',
                    body: formData,
                    // No Content-Type header needed for FormData; browser sets it with boundary
                })

                if (res.ok) {
                    const mediaDoc = await res.json()
                    const newItem: GalleryItem = {
                        id: generateId(),
                        media: mediaDoc.doc.id,
                        size: 'medium'
                    }
                    setValue([...(value || []), newItem])
                } else {
                    toast.error(`Failed to upload ${file.name}`)
                }
            } catch (err) {
                console.error('Upload error:', err)
                toast.error(`Error uploading ${file.name}`)
            } finally {
                setUploadingItems(prev => prev.filter(u => u.filename !== file.name))
            }
        }
    }, [apiRoute, value, setValue])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        noClick: true, // We want the grid items to stay clickable
    })

    // Derived items for rendering - merge current field value with cached media metadata
    const itemsToRender = React.useMemo(() => {
        if (!value || !Array.isArray(value)) return []
        return value.map(item => {
            const mediaId = typeof item.media === 'object' ? item.media?.id : item.media
            return {
                ...item,
                mediaData: item.mediaData || mediaCache[mediaId] || (typeof item.media === 'object' ? item.media : null)
            }
        })
    }, [value, mediaCache])

    // Fetch media metadata for items that only have an ID and aren't in cache
    useEffect(() => {
        let isMounted = true;
        const resolveMedia = async () => {
            if (!value || !Array.isArray(value)) return

            // Find unique IDs that need resolution (not objects, not already fetched)
            const idsToFetch = value
                .map(item => typeof item.media === 'object' ? null : item.media)
                .filter((id): id is string => {
                    if (!id) return false
                    // Skip if already fetched (tracked in ref)
                    return !fetchedIdsRef.current.has(id)
                })

            if (idsToFetch.length === 0) return

            // Mark as being fetched
            idsToFetch.forEach(id => fetchedIdsRef.current.add(id))

            // Fetch missing IDs
            const fetchedData: Record<string, any> = {}
            await Promise.all(idsToFetch.map(async (id) => {
                try {
                    const res = await fetch(`${apiRoute}/media/${id}`)
                    if (res.ok) {
                        fetchedData[id] = await res.json()
                    }
                } catch (e) {
                    console.error(`Error resolving media ${id}:`, e)
                    // Remove from fetched set on error so we can retry
                    fetchedIdsRef.current.delete(id)
                }
            }))

            if (isMounted && Object.keys(fetchedData).length > 0) {
                setMediaCache(prev => ({ ...prev, ...fetchedData }))
            }
        }

        void resolveMedia()
        return () => { isMounted = false }
    }, [value, apiRoute]) // Removed mediaCache from dependencies to prevent infinite loop

    const removeItem = useCallback((index: number) => {
        const newValue = [...(value || [])]
        newValue.splice(index, 1)
        setValue(newValue)
        setSelectedIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
    }, [value, setValue])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = value.findIndex((item, i) => (item.id || `item-${i}`) === active.id)
            const newIndex = value.findIndex((item, i) => (item.id || `item-${i}`) === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                setValue(arrayMove(value, oldIndex, newIndex))
            }
        }
    }, [value, setValue])

    const items = value || []

    return (
        <div {...getRootProps()} style={{
            border: isDragActive ? '1px solid var(--theme-primary-500)' : '1px solid var(--theme-elevation-100)',
            padding: '24px',
            backgroundColor: isDragActive ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-50)',
            borderRadius: '4px',
            minHeight: '200px',
            position: 'relative',
            transition: 'background-color 0.2s, border-color 0.2s'
        }}>
            <input {...getInputProps()} />

            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visual Gallery Workspace
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {selectedIndices.length > 0 && (
                        <span style={{ fontSize: '12px', color: 'var(--theme-primary-500)', fontWeight: 'bold' }}>
                            {selectedIndices.length} Selected
                        </span>
                    )}
                    <span style={{ fontSize: '11px', opacity: 0.4 }}>Drag photos here to upload</span>
                    <span style={{ fontSize: '12px', opacity: 0.5 }}>
                        {items.length} Items
                    </span>
                </div>
            </div>

            {items.length === 0 && uploadingItems.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '150px',
                    border: '2px dashed var(--theme-elevation-150)',
                    borderRadius: '8px',
                    color: 'var(--theme-elevation-400)'
                }}>
                    <ImageIcon size={32} strokeWidth={1} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <span style={{ fontSize: '13px' }}>Drop images here or select from library</span>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={itemsToRender.map((item, i) => item.id || `item-${i}`)}
                        strategy={rectSortingStrategy}
                    >
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '16px'
                        }}>
                            {itemsToRender.map((item, index) => (
                                <SortableItem
                                    key={item.id || `item-${index}`}
                                    item={item}
                                    index={index}
                                    isSelected={selectedIndices.includes(index)}
                                    onRemove={() => removeItem(index)}
                                    onEdit={() => openInspector(index)}
                                    onSelect={(e) => toggleSelection(index, e.shiftKey || e.metaKey || e.ctrlKey)}
                                />
                            ))}
                            {/* Appended uploading state cards */}
                            {uploadingItems.map(u => (
                                <UploadingItem key={u.id} filename={u.filename} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {isDragActive && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(var(--theme-primary-500-rgb), 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    <div style={{
                        padding: '20px 40px',
                        backgroundColor: 'var(--theme-primary-500)',
                        color: '#fff',
                        borderRadius: '40px',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        Drop to Import Photos
                    </div>
                </div>
            )}

            {/* Floating Bulk Toolbar */}
            {selectedIndices.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    backgroundColor: '#111',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '16px' }}>
                        {selectedIndices.length} items
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            onChange={(e) => bulkUpdateSize(e.target.value as any)}
                            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '12px', cursor: 'pointer' }}
                        >
                            <option value="">Set Bulk Size...</option>
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="full">Full Width</option>
                        </select>
                    </div>

                    <button
                        onClick={bulkDelete}
                        style={{
                            background: 'rgba(255,0,0,0.2)',
                            color: '#ff4d4d',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={14} /> Delete Selected
                    </button>

                    <button
                        onClick={() => setSelectedIndices([])}
                        style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            <Modal slug={modalSlug} style={{ width: '400px', padding: '0' }}>
                <div style={{ padding: '32px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Image Settings</h2>

                    {editingIndex !== null && value && value[editingIndex] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: '4px', backgroundColor: '#000', marginBottom: '8px' }}>
                                <img
                                    src={itemsToRender[editingIndex]?.mediaData?.url}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>Display Size</label>
                                <select
                                    value={value[editingIndex].size || 'medium'}
                                    onChange={(e) => updateItem(editingIndex, { size: e.target.value as any })}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-100)' }}
                                >
                                    <option value="small">Small (33%)</option>
                                    <option value="medium">Medium (50%)</option>
                                    <option value="large">Large (66%)</option>
                                    <option value="full">Full Width (100%)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>Alt Text Override</label>
                                <input
                                    type="text"
                                    value={value[editingIndex].alt || ''}
                                    placeholder={itemsToRender[editingIndex]?.mediaData?.alt || 'Alt text'}
                                    onChange={(e) => updateItem(editingIndex, { alt: e.target.value })}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-100)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>Caption</label>
                                <textarea
                                    value={value[editingIndex].caption || ''}
                                    onChange={(e) => updateItem(editingIndex, { caption: e.target.value })}
                                    rows={3}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-100)', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>Link URL</label>
                                <input
                                    type="text"
                                    value={value[editingIndex].link || ''}
                                    placeholder="https://..."
                                    onChange={(e) => updateItem(editingIndex, { link: e.target.value })}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-100)' }}
                                />
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <Button
                                    onClick={() => toggleModal(modalSlug)}
                                    buttonStyle="primary"
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
