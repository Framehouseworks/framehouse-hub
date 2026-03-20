// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'

import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from '@/collections/Categories'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Portfolios } from '@/collections/Portfolios'
import { Users } from '@/collections/Users'

import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { plugins } from './plugins'



const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

import { ensureFolderParenting, protectLibraryFolder } from '@/collections/Portfolios/hooks/protectLibrary'

export default buildConfig({
  admin: {
    components: {
      graphics: {
        Logo: '@/components/Logo/Logo#Logo',
        Icon: '@/components/Logo/LogoIcon#LogoIcon',
      },
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard'],
    },
    meta: {
      title: 'Framehouse Admin Panel',
      description: 'Framehouse Admin Panel',
      icons: [
        {
          url: '@/assets/favicon.svg',
          rel: 'icon',
          type: 'image/svg',
          sizes: '32x32',
        },
        {
          url: '@/assets/favicon-96x96.png',
          rel: 'icon',
          type: 'image/png',
          sizes: '96x96',
        },
      ],
    },
    user: Users.slug,
  },
  collections: [Users, Pages, Categories, Media, Portfolios],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages'],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  //email: nodemailerAdapter(),
  endpoints: [
    {
      path: '/library-id',
      method: 'get',
      handler: async (req) => {
        try {
          const folders = await req.payload.find({
            collection: 'payload-folders',
            where: {
              and: [
                { name: { equals: 'Portfolio Library' } },
                { folder: { exists: false } },
              ],
            },
            depth: 0,
            limit: 1,
          })

          if (folders.docs.length > 0) {
            return Response.json({ id: folders.docs[0].id })
          }

          // Create it if it doesn't exist
          const newFolder = await req.payload.create({
            collection: 'payload-folders',
            data: {
              name: 'Portfolio Library',
            },
          })

          return Response.json({ id: newFolder.id })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Error in /library-id endpoint' })
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    // storage-adapter-placeholder
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  folders: {
    collectionOverrides: [
      async ({ collection }) => {
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeDelete: [...(collection.hooks?.beforeDelete || []), protectLibraryFolder],
            beforeChange: [...(collection.hooks?.beforeChange || []), ensureFolderParenting],
          },
        }
      },
    ],
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // sharp,
})
