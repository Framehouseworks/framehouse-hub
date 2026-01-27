'use client'

import { Button, Modal, toast, useField, useForm, useModal } from '@payloadcms/ui'
import { CheckCircle2, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

// Ultra-robust ID generator with timestamp to ensure absolute uniqueness
let idCounter = 0
const generateId = () => {
    idCounter++
    return `${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 9)}`
}

export const VisualMediaPicker: React.FC<{ path: string }> = ({ path }) => {
    const arrayPath = path.replace('addMultipleMedia', 'items')
    const form = useForm()
    const { value, setValue } = useField<any[]>({ path: arrayPath })
    const { toggleModal, isModalOpen } = useModal()

    useEffect(() => {
        if (form) {
            console.log('[VisualMediaPicker] Form methods available:', Object.keys(form))
        }
    }, [form])

    const modalSlug = `media-picker-${path.replace(/\./g, '-')}`

    const [mediaList, setMediaList] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

    // Memoized filtered list for performance
    const filteredMedia = useMemo(() => {
        if (!search) return mediaList
        const s = search.toLowerCase()
        return mediaList.filter(m =>
            m.filename?.toLowerCase().includes(s) ||
            m.alt?.toLowerCase().includes(s)
        )
    }, [mediaList, search])

    useEffect(() => {
        console.log('[VisualMediaPicker] Component mounted or modal slug changed', { path, arrayPath, modalSlug })
    }, [path, arrayPath, modalSlug])

    useEffect(() => {
        const isOpen = isModalOpen(modalSlug)
        console.log('[VisualMediaPicker] Modal state check:', { slug: modalSlug, isOpen })

        if (isOpen) {
            console.log('[VisualMediaPicker] Modal is open, fetching media...')
            const fetchMedia = async () => {
                setLoading(true)
                try {
                    const response = await fetch('/api/media?limit=100&sort=-createdAt')
                    console.log('[VisualMediaPicker] Fetch response status:', response.status)

                    if (response.ok) {
                        const data = await response.json()
                        console.log('[VisualMediaPicker] Fetched media count:', data.docs?.length)
                        setMediaList(data.docs)
                    } else {
                        console.error('[VisualMediaPicker] Failed to fetch media:', response.statusText)
                    }
                } catch (error) {
                    console.error('[VisualMediaPicker] Error fetching media:', error)
                } finally {
                    setLoading(false)
                }
            }
            fetchMedia()
        }
    }, [isModalOpen(modalSlug), modalSlug])

    const handleAdd = () => {
        console.log('[VisualMediaPicker] handleAdd initiated', { path, arrayPath, selectedCount: selected.size })

        // Defensive data retrieval: Try useForm's data first, then useField's value
        // We cast form to any to avoid TS errors while we find the right property name
        const formState = form as any
        const latestData = formState?.getDataByPath ? formState.getDataByPath(arrayPath) : value

        const currentItems = Array.isArray(latestData) ? latestData : []
        console.log('[VisualMediaPicker] Resolved current items:', currentItems.length)

        const newItems = Array.from(selected).map(id => ({
            id: generateId(),
            media: id,
            size: 'medium'
        }))

        const finalValue = [...currentItems, ...newItems]
        console.log('[VisualMediaPicker] Dispatching new value, total count:', finalValue.length)

        // Try multiple ways to update if one fails
        if (formState?.setFieldValue) {
            console.log('[VisualMediaPicker] Using form.setFieldValue')
            formState.setFieldValue(arrayPath, finalValue)
        } else {
            console.log('[VisualMediaPicker] Using useField.setValue')
            setValue(finalValue)
        }

        toast.success(`Successfully added ${selected.size} items to grid`)

        // Delay resetting selection and closing modal slightly to ensure state is caught
        setTimeout(() => {
            setSelected(new Set())
            toggleModal(modalSlug)
        }, 100)
    }

    const toggleSelect = (id: string) => {
        const next = new Set(selected)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelected(next)
    }

    return (
        <div style={{ marginBottom: '20px' }}>
            <Button
                buttonStyle="secondary"
                onClick={() => toggleModal(modalSlug)}
                size="small"
                icon={<PlusIcon size={14} />}
            >
                Select from Gallery
            </Button>

            <Modal slug={modalSlug}>
                <div style={{
                    padding: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '30px',
                    width: 'min(95vw, 1000px)',
                    height: 'min(90vh, 800px)',
                    backgroundColor: '#000',
                    color: '#fff',
                    border: '1px solid #111',
                    boxShadow: '0 0 0 1px #111, 0 30px 60px rgba(0,0,0,0.8)',
                    borderRadius: '0', // Sharp corners
                    margin: 'auto',
                    position: 'relative',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.03em', margin: 0 }}>Media Library</h2>
                            <span style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Select multiple assets to add to your grid
                            </span>
                        </div>
                        <button
                            onClick={() => toggleModal(modalSlug)}
                            style={{ background: 'none', border: '1px solid #222', cursor: 'pointer', color: '#666', padding: '8px' }}
                        >
                            <XIcon size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        backgroundColor: '#000',
                        padding: '12px 0',
                        borderBottom: '1px solid #111'
                    }}>
                        <SearchIcon size={16} style={{ opacity: 0.3 }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search collection..."
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                fontWeight: '400'
                            }}
                        />
                    </div>

                    {/* Grid Container */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '1px', // Sharp grid lines
                        backgroundColor: '#111', // Line color
                        overflowY: 'auto',
                        padding: '1px',
                        flex: 1,
                        border: '1px solid #111'
                    }}>
                        {loading ? (
                            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: '12px', textTransform: 'uppercase' }}>
                                Loading...
                            </div>
                        ) : filteredMedia.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: '12px', textTransform: 'uppercase' }}>
                                No assets found
                            </div>
                        ) : (
                            filteredMedia.map(media => {
                                const isSelected = selected.has(media.id)
                                const thumb = media.sizes?.thumbnail?.url || media.url
                                return (
                                    <div
                                        key={media.id}
                                        onClick={() => toggleSelect(media.id)}
                                        style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            background: '#050505',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <img
                                            src={thumb}
                                            alt={media.filename}
                                            loading="lazy"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                opacity: isSelected ? 0.2 : 0.8,
                                                filter: isSelected ? 'grayscale(1)' : 'none',
                                                transition: 'opacity 0.3s ease-out'
                                            }}
                                        />

                                        {/* Hover indicator */}
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            border: isSelected ? '2px solid #fff' : 'none',
                                            pointerEvents: 'none'
                                        }} />

                                        {/* Checkmark */}
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <CheckCircle2 size={24} color="#fff" strokeWidth={1} />
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '10px'
                    }}>
                        <span style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {selected.size} Selected
                        </span>
                        <div style={{ display: 'flex', gap: '1px' }}>
                            <Button
                                buttonStyle="secondary"
                                onClick={() => toggleModal(modalSlug)}
                                size="small"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAdd}
                                disabled={selected.size === 0}
                                size="small"
                            >
                                Confirm Selection
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
