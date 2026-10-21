import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

/**
 * Validates that endDate is after or equal to startDate if both are provided.
 */
export const validateDateRange: CollectionBeforeValidateHook = ({ data }) => {
  if (data?.startDate && data?.endDate) {
    const start = new Date(data.startDate).getTime()
    const end = new Date(data.endDate).getTime()

    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      throw new ValidationError({
        errors: [
          {
            path: 'endDate',
            message: 'End date must be after or equal to start date.',
          },
        ],
      })
    }
  }

  return data
}
