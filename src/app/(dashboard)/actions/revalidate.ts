'use server'

import { revalidatePath } from 'next/cache'

/** Bust the router cache for the collections list so navigating back shows fresh data. */
export async function revalidateCollections() {
  revalidatePath('/dashboard/library/collections')
}
