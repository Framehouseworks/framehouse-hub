import 'dotenv/config'

import { getPayload } from 'payload'
import config from '../payload.config'
import { seedHubContent } from './index'

const seed = async () => {
  try {
    console.log('--- Starting Standalone Seed ---')
    
    const payload = await getPayload({ config })
    
    await seedHubContent(payload)
    
    console.log('--- Seeding Completed Successfully ---')
    process.exit(0)
  } catch (error) {
    console.error('--- Seeding Failed ---')
    console.error(error)
    process.exit(1)
  }
}

seed()
