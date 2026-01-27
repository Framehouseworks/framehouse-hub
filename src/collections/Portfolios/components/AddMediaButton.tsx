'use client'

import { Button, useField, useListDrawer } from '@payloadcms/ui'
import { PlusIcon } from 'lucide-react'
import React from 'react'

export const AddMediaButton: React.FC<{ path: string }> = ({ path }) => {
    // Target the sibling 'items' array. 'path' is grid.addMultipleMedia
    const arrayPath = path.replace('addMultipleMedia', 'items')
    const { value, setValue } = useField<any[]>({ path: arrayPath })

    const [ListDrawer, ListToggler, { openDrawer }] = useListDrawer({
        collectionSlugs: ['media'],
    })

    const handleSelect = ({ docID }: { docID: string }) => {
        const currentItems = value || []

        // In many Payload versions, onSelect is called for each item or once.
        // If it's once per item, we append it.
        setValue([
            ...currentItems,
            {
                media: docID,
                size: 'medium'
            }
        ])
    }

    return (
        <div style={{ marginBottom: '15px' }}>
            <Button
                buttonStyle="secondary"
                onClick={() => openDrawer()}
                size="small"
                icon={<PlusIcon size={14} />}
            >
                Select from Media Library
            </Button>
            <ListDrawer onSelect={handleSelect} />
        </div>
    )
}
