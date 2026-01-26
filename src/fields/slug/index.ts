import type { CheckboxField, TextField } from 'payload'

import { deepMerge } from '@/utilities/deepMerge'
import { formatSlug } from './formatSlug'

type SlugField = (
    fieldToUse?: string,
    overrides?: {
        slugOverrides?: Partial<TextField>
        checkboxOverrides?: Partial<CheckboxField>
    },
) => [TextField, CheckboxField]

export const slugField: SlugField = (fieldToUse = 'title', overrides = {}) => {
    const { slugOverrides, checkboxOverrides } = overrides

    const checkboxField: CheckboxField = {
        name: 'slugLock',
        type: 'checkbox',
        admin: {
            hidden: true,
            position: 'sidebar',
        },
        defaultValue: true,
    }

    const slugField: TextField = {
        name: 'slug',
        type: 'text',
        admin: {
            position: 'sidebar',
        },
        hooks: {
            beforeValidate: [formatSlug(fieldToUse)],
        },
        index: true,
        label: 'Slug',
        required: true,
    }

    return [
        deepMerge(slugField, slugOverrides || {}),
        deepMerge(checkboxField, checkboxOverrides || {}),
    ]
}
