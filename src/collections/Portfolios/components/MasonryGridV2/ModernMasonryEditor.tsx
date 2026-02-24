'use client'

import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core'
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    Thumbnail,
    useConfig,
    useField,
    useListDrawer,
    usePayloadAPI,
    useWatchForm
} from '@payloadcms/ui'
import React, { useCallback, useMemo } from 'react'

interface GalleryItem {
    id: string
    instanceId?: string // STABLE KEY FOR MANIFEST
    media: string | any
    size?: 'small' | 'medium' | 'large' | 'full'
    caption?: string
    alt?: string
}

export const ModernMasonryEditor: React.FC<{ path: string }> = ({ path }) => {
    // DERIVE MANIFEST PATH: 
    // If path is "layoutBlocks.0.items", itemsOrder is "layoutBlocks.0.itemsOrder"
    const parentPath = path.substring(0, path.lastIndexOf('.'));
    const itemsOrderPath = `${parentPath}.itemsOrder`;

    // FIELD 1: The physical data pool (items)
    // Use useWatchForm for live reactive data access in Payload 3.x
    const { getDataByPath, dispatchFields } = useWatchForm()
    const { setValue: setItemsValue } = useField<GalleryItem[]>({ path })

    // Retrieve the actual array data reactively from the form state
    const itemsValue = useMemo(() => {
        const data = getDataByPath(path)
        return Array.isArray(data) ? data : []
    }, [getDataByPath, path])

    // FIELD 2: The sequence manifest (itemsOrder JSON)
    const { value: orderValue, setValue: setOrderValue } = useField<string>({ path: itemsOrderPath })

    const itemsPool = itemsValue

    // Resolve the display items by following the manifest string
    const displayItems = useMemo(() => {
        let order: string[] = []
        try {
            if (orderValue) order = JSON.parse(orderValue)
        } catch (e) {
            console.warn('[ModernMasonryEditor] Failed to parse manifest', e)
        }

        const poolMap = new Map()
        itemsPool.forEach(item => {
            const iid = item.instanceId || (item as any).instance_id
            if (iid) poolMap.set(iid, item)
        })

        const sorted: GalleryItem[] = []
        const usedIds = new Set<string>()

        // 1. Follow the manifest order
        order.forEach(id => {
            if (poolMap.has(id)) {
                sorted.push(poolMap.get(id))
                usedIds.add(id)
            }
        })

        // 2. Add anything missing in the pool (e.g. newly added items not yet in manifest)
        itemsPool.forEach(item => {
            const iid = item.instanceId || (item as any).instance_id
            if (iid && !usedIds.has(iid)) {
                sorted.push(item)
            }
        })

        return sorted
    }, [itemsPool, orderValue])

    const updateManifest = useCallback((newItems: GalleryItem[]) => {
        const newOrder = newItems.map(i => i.instanceId).filter(Boolean)
        setOrderValue(JSON.stringify(newOrder))
    }, [setOrderValue])

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            const oldIndex = displayItems.findIndex((item) => (item.instanceId || (item as any).instance_id) === active.id)
            const newIndex = displayItems.findIndex((item) => (item.instanceId || (item as any).instance_id) === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(displayItems, oldIndex, newIndex)
                updateManifest(newItems)
            }
        }
    }

    const { config } = useConfig()
    const serverURL = config.serverURL

    const [ListDrawer, ListDrawerToggler, { closeDrawer }] = useListDrawer({
        collectionSlugs: ['media'],
        uploads: true,
    })

    const onSelect = useCallback(({ docID }: { docID: string }) => {
        const newInstanceId = `inst_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
        const newItem: GalleryItem = {
            id: undefined as any, // Omit ID to let Payload generate it
            instanceId: newInstanceId,
            media: docID,
            size: 'medium',
        }

        const newValue = [...itemsPool, newItem]
        setItemsValue(newValue) // Traditional write for dirty flag
        dispatchFields({
            type: 'UPDATE',
            path,
            value: newValue,
        })

        let currentOrder: string[] = []
        try {
            if (orderValue) currentOrder = JSON.parse(orderValue)
        } catch (e) { }

        setOrderValue(JSON.stringify([...currentOrder, newInstanceId]))
        closeDrawer()
    }, [itemsPool, dispatchFields, path, orderValue, setOrderValue, closeDrawer])

    const handleRemoveItem = (instanceId: string) => {
        const newValue = itemsPool.filter(i => (i.instanceId || (i as any).instance_id) !== instanceId)
        setItemsValue(newValue) // Traditional write for dirty flag
        dispatchFields({
            type: 'UPDATE',
            path,
            value: newValue,
        })

        let currentOrder: string[] = []
        try {
            if (orderValue) currentOrder = JSON.parse(orderValue)
        } catch (e) { }

        setOrderValue(JSON.stringify(currentOrder.filter(id => id !== instanceId)))
    }

    const handleUpdateSize = (instanceId: string, size: GalleryItem['size']) => {
        const newValue = itemsPool.map(i => (i.instanceId || (i as any).instance_id) === instanceId ? { ...i, size } : i)
        setItemsValue(newValue) // Ensure Payload sees field as 'dirty'
        dispatchFields({
            type: 'UPDATE',
            path,
            value: newValue,
        })
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    return (
        <div className="modern-masonry-editor" style={{
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 'var(--style-radius-m)',
            padding: '24px',
            backgroundColor: 'var(--theme-elevation-50)',
            marginTop: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Masonry Grid Editor</h3>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '20px'
                }}>
                    <SortableContext items={displayItems.map(i => (i.instanceId || (i as any).instance_id) as string)} strategy={rectSortingStrategy}>
                        {displayItems.map((item) => {
                            const iid = (item.instanceId || (item as any).instance_id) as string
                            return (
                                <SortableGridItem
                                    key={iid}
                                    item={item}
                                    onRemove={() => handleRemoveItem(iid)}
                                    onUpdateSize={(size) => handleUpdateSize(iid, size)}
                                    serverURL={serverURL}
                                />
                            )
                        })}
                    </SortableContext>

                    <ListDrawerToggler>
                        <div className="add-item-trigger" style={{
                            aspectRatio: '1/1',
                            borderRadius: 'var(--style-radius-s)',
                            border: '2px dashed var(--theme-elevation-300)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '28px' }}>+</span>
                        </div>
                    </ListDrawerToggler>
                </div>
            </DndContext>

            <ListDrawer onSelect={onSelect} />

            <div style={{ marginTop: '24px', opacity: 0.5, fontSize: '10px' }}>
                Data Source: {path} | Manifest: {itemsOrderPath}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .grid-item-card { position: relative; }
                .grid-item-card:hover .item-controls, 
                .grid-item-card:focus-within .item-controls { opacity: 1; transform: translateY(0); }
                .item-controls { 
                    position: absolute; bottom: 0; left: 0; right: 0; 
                    background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);
                    padding: 4px; display: flex; gap: 2px; align-items: center; justify-content: center;
                    opacity: 0; transform: translateY(5px); transition: all 0.2s ease;
                    border-bottom-left-radius: var(--style-radius-s);
                    border-bottom-right-radius: var(--style-radius-s);
                    pointer-events: auto;
                    z-index: 20;
                }
                .size-btn {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
                    color: white; font-size: 8px; padding: 2px 0; border-radius: 3px; cursor: pointer;
                    transition: all 0.2s;
                    font-weight: bold;
                    width: 18px;
                    text-align: center;
                    line-height: 1.2;
                }
                .size-btn:hover { background: rgba(255,255,255,0.3); }
                .size-btn.active { background: var(--theme-primary-500); border-color: var(--theme-primary-400); }
                .remove-btn {
                    background: var(--theme-error-500); color: white; border: none; 
                    border-radius: 3px; width: 18px; height: 18px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px;
                    margin-left: 4px;
                    flex-shrink: 0;
                }
                .remove-btn:hover { background: var(--theme-error-600); }
                .add-item-trigger:hover { background: var(--theme-elevation-100); border-color: var(--theme-elevation-400); }
            `}} />
        </div>
    )
}

const SortableGridItem: React.FC<{
    item: GalleryItem,
    onRemove: () => void,
    onUpdateSize: (size: GalleryItem['size']) => void,
    serverURL: string
}> = ({ item, onRemove, onUpdateSize, serverURL }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: (item.instanceId || (item as any).instance_id) as string })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.6 : 1,
        touchAction: 'none'
    }

    const mediaId = typeof item.media === 'object' ? item.media?.id : item.media
    const currentSize = item.size || 'medium'

    const sizes: GalleryItem['size'][] = ['small', 'medium', 'large', 'full']

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="grid-item-card"
            {...attributes}
            {...listeners}
        >
            <div style={{
                aspectRatio: '1/1',
                borderRadius: 'var(--style-radius-s)',
                backgroundColor: 'var(--theme-elevation-100)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--theme-elevation-200)',
            }}>
                <MediaThumbnail id={mediaId} serverURL={serverURL} />

                <div className="item-controls" onPointerDown={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                        {sizes.map(size => (
                            <button
                                key={size}
                                className={`size-btn ${currentSize === size ? 'active' : ''}`}
                                onClick={() => onUpdateSize(size)}
                                title={`Set size to ${size}`}
                                aria-label={`Set size to ${size}`}
                            >
                                {size?.charAt(0).toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button
                        className="remove-btn"
                        onClick={onRemove}
                        title="Remove item"
                        aria-label="Remove item"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    )
}

const MediaThumbnail: React.FC<{ id: string, serverURL: string }> = ({ id, serverURL }) => {
    const [{ data, isLoading }] = usePayloadAPI(`${serverURL}/api/media/${id}`)

    if (isLoading) return <div style={{ width: '100%', height: '100%' }} />

    if (data) {
        const imageUrl = data.url ? `${serverURL}${data.url}` : null;
        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={data.alt || 'Thumbnail'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            )
        }
        return <Thumbnail doc={data} size="medium" />
    }

    return <div style={{ width: '100%', height: '100%', opacity: 0.1 }}>Empty</div>
}
