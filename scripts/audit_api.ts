import dotenv from 'dotenv'
import path from 'path'
import { getPayload } from 'payload'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function audit() {
    const config = (await import('../src/payload.config')).default
    const payload = await getPayload({ config })

    const portfolios = await payload.find({
        collection: 'portfolios',
        limit: 5
    })

    portfolios.docs.forEach(doc => {
        console.log(`\nPortfolio ID: ${doc.id} | Name: ${doc.name}`)
        doc.layoutBlocks?.forEach((block, bIdx) => {
            if (block.blockType === 'grid') {
                console.log(`  Grid Block #${bIdx} | itemsOrder: ${block.itemsOrder}`)
                block.items?.forEach((item, iIdx) => {
                    console.log(`    Item #${iIdx} Keys:`, Object.keys(item))
                    console.log(`    instanceId Value:`, item.instanceId)
                })
            }
        })
    })

    process.exit(0)
}

audit()
