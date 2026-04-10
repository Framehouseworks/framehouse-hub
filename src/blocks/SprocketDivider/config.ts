import type { Block } from 'payload'

export const SprocketDivider: Block = {
  slug: 'sprocketDivider',
  interfaceName: 'SprocketDividerBlock',
  fields: [
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Surface Low', value: 'surface_low' },
      ],
    },
    {
      name: 'speed',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Slow', value: 'slow' },
        { label: 'Medium', value: 'medium' },
        { label: 'Fast', value: 'fast' },
      ],
    },
  ],
}
