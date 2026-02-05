import dotenv from 'dotenv'
import path from 'path'
import pg from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const connectionString = process.env.DATABASE_URI || 'postgres://postgres:postgres@127.0.0.1:5432/framehouse'

async function inspect() {
    console.log(`Connecting to DB...`)
    const client = new pg.Client({ connectionString })

    try {
        await client.connect()

        console.log('\n--- GRID BLOCK (1 row) ---')
        const gridRes = await client.query('SELECT * FROM portfolios_blocks_grid LIMIT 1')
        if (gridRes.rows.length > 0) {
            console.log(JSON.stringify(gridRes.rows[0], null, 2))

            // Try to find items for this specific block
            const blockId = gridRes.rows[0]._uuid || gridRes.rows[0].id
            console.log(`\nLikely Block ID: ${blockId}`)

            if (blockId) {
                console.log(`\n--- ITEMS LINKED TO ${blockId} ---`)
                const itemsRes = await client.query('SELECT * FROM portfolios_blocks_grid_items WHERE _parent_id = $1', [blockId])
                if (itemsRes.rows.length === 0) {
                    console.log('No items found with this _parent_id.')
                } else {
                    itemsRes.rows.forEach(r => {
                        console.log(`Item ID: ${r.id} | InstanceID: ${r.instance_id}`)
                    })
                }
            }
        } else {
            console.log('No Grid Rows found.')
        }

        console.log('\n--- RANDOM ITEM DUMP (Top 3) ---')
        const itemsRes = await client.query('SELECT * FROM portfolios_blocks_grid_items LIMIT 3')
        itemsRes.rows.forEach(r => {
            console.log(`Item Parent: ${r._parent_id} | InstanceID: ${r.instance_id}`)
        })

    } catch (err) {
        console.error('Inspection Failed:', err)
    } finally {
        await client.end()
    }
}

inspect()
