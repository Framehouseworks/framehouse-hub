# Framehouse Hub

**Framehouse Hub** is a premium digital asset management and high-resolution gallery platform. Built with a focus on professional creatives and their clients, it provides a seamless workflow for managing, proofing, and delivering high-quality visual content.

This platform features a powerful administrative backend for creatives and a sleek, performant gallery frontend for clients to access their assets.

Core features:

- [Integrated Management](#how-it-works)
- [Secure Authentication](#users-authentication)
- [Granular Access Control](#access-control)
- [Dynamic Layout Builder](#layout-builder)
- [Draft & Live Preview](#draft-preview)
- [On-demand Revalidation](#on-demand-revalidation)
- [Built-in SEO](#seo)
- [Advanced Search & Filters](#search)
- [Asset Library & Folders](#media)
- [Client Galleries](#website)
- [Automated Tests](#tests)

## Getting Started

Follow these steps to set up the project locally.

### 1. Database Setup (Docker)

To run the PostgreSQL database locally using Docker, execute the following command:

```bash
docker run -d --name framehouse-hub-admin -p 5432:5432 -e POSTGRES_PASSWORD=<Your Password> postgres
```

**Useful details:**
- **Connection String**: `postgresql://postgres:<Your Password>@localhost:5432/postgres`

### 2. Application Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd framehouse-hub
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and configure the following:
    - `DATABASE_URI`: `postgresql://postgres:<Your Password>@localhost:5432/postgres`
    - `PAYLOAD_SECRET`: A random string for security (e.g., `your-local-secret-key`).
    - `NEXT_PUBLIC_SERVER_URL`: `http://localhost:3000`
    - `PAYLOAD_PUBLIC_SERVER_URL`: `http://localhost:3000`

> [!NOTE]
> The database password and `PAYLOAD_SECRET` are user-specific and should be kept secure. Do not commit your `.env` file to version control.

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.
    Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) to create your first admin user.

## How it works

Framehouse Hub is built on a robust architecture that prioritizes performance and security. The configuration is tailored to the specific needs of creative professionals:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel and unpublished content. See [Access Control](#access-control) for more details.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Pages

  All pages are layout builder enabled so you can generate unique layouts for each page using layout-building blocks, see [Layout Builder](#layout-builder) for more details. Pages are also draft-enabled so you can preview them before publishing them to your website, see [Draft Preview](#draft-preview) for more details.

- #### Media

  This is the uploads enabled collection used by pages, posts, and projects to contain media like images, videos, downloads, and other assets. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

  **Note**: In the current local development setup, assets are stored in the local file system at `public/media`. For production or MVP, this is designed to be replaced with cloud storage (e.g., S3/GCS) using Payload storage adapters.

- #### Categories

  A taxonomy used to group products together.

- ### Carts

  Used to track user and guest carts within Payload. Added by the [ecommerce plugin](https://payloadcms.com/docs/ecommerce/plugin#carts).

- ### Addresses

  Saves user's addresses for easier checkout. Added by the [ecommerce plugin](https://payloadcms.com/docs/ecommerce/plugin#addresses).

- ### Orders

  Tracks orders once a transaction successfully completes. Added by the [ecommerce plugin](https://payloadcms.com/docs/ecommerce/plugin#orders).

- ### Transactions

  Tracks transactions from initiation to completion, once completed they will have a related Order item. Added by the [ecommerce plugin](https://payloadcms.com/docs/ecommerce/plugin#transactions).

- ### Products and Variants

  Primary collections for product details such as pricing per currency and optionally supports variants per product. Added by the [ecommerce plugin](https://payloadcms.com/docs/ecommerce/plugin#products).

### Globals

See the [Globals](https://payloadcms.com/docs/configuration/globals) docs for details on how to extend this functionality.

- `Header`

  The data required by the header on your front-end like nav links.

- `Footer`

  Same as above but for the footer of your site.

## Holistic Architecture

### System Overview
This platform is built as a unified application where the frontend and backend are tightly integrated using **Next.js 15** and **Payload CMS v3**.

- **Frontend**: A modern React application utilizing the Next.js App Router, Tailwind CSS, and Radix UI components.
- **Backend/CMS**: Powered by Payload CMS v3, which runs as part of the Next.js app. It provides both the API and the Admin UI.
- **Database**: PostgreSQL serves as the relational data store, managing content and relationships efficiently.
- **Media Functions**: Asset management is handled through Payload, with current local storage in `public/media` and scalability for cloud storage integration.

### Data Flow
1.  **Client Interaction**: Users interact with the React frontend in their browser.
2.  **Server Rendering/API**: Next.js Server Components fetch data using Payload's Local API for fast rendering. Client-side interactions use Payload's REST or GraphQL endpoints.
3.  **CMS Logic**: Payload processes requests, enforces access control roles (e.g., Admin vs. Creative), and performs data validation.
4.  **Database Layer**: All structured data is persisted in the PostgreSQL database.
5.  **Asset Handling**: Uploaded media is processed (e.g., generated thumbnails using `sharp`) and stored/served from the specified directory.

## Access control

Basic access control is setup to limit access to various content based based on publishing status.

- `users`: Users with the `admin` role can access the admin panel and create or edit content, users with the `customer` role can only access the frontend and the relevant collection items to themselves.
- `pages`: Everyone can access published pages, but only admin users can create, update, or delete them.
- `products` `variants`: Everyone can access published products, but only admin users can create, update, or delete them.
- `carts`: Customers can access their own saved cart, guest users can access any unclaimed cart by ID.
- `addresses`: Customers can access their own addresses for record keeping.
- `transactions`: Only admins can access these as they're meant for internal tracking.
- `orders`: Only admins and users who own the orders can access these.

For more details on how to extend this functionality, see the [Payload Access Control](https://payloadcms.com/docs/access-control/overview#access-control) docs.

## User accounts

## Guests

## Layout Builder

Create unique page layouts for any type of content using a powerful layout builder. This template comes pre-configured with the following layout building blocks:

- Hero
- Content
- Media
- Call To Action
- Archive

Each block is fully designed and built into the front-end website that comes with this template. See [Website](#website) for more details.

## Lexical editor

A deep editorial experience that allows complete freedom to focus just on writing content without breaking out of the flow with support for Payload blocks, media, links and other features provided out of the box. See [Lexical](https://payloadcms.com/docs/rich-text/overview) docs.

## Draft Preview

All products and pages are draft-enabled so you can preview them before publishing them to your website. To do this, these collections use [Versions](https://payloadcms.com/docs/configuration/collections#versions) with `drafts` set to `true`. This means that when you create a new product or page, it will be saved as a draft and will not be visible on your website until you publish it. This also means that you can preview your draft before publishing it to your website. To do this, we automatically format a custom URL which redirects to your front-end to securely fetch the draft version of your content.

Since the front-end of this template is statically generated, this also means that pages, products, and projects will need to be regenerated as changes are made to published documents. To do this, we use an `afterChange` hook to regenerate the front-end when a document has changed and its `_status` is `published`.

For more details on how to extend this functionality, see the official [Draft Preview Example](https://github.com/payloadcms/payload/tree/examples/draft-preview).

## Live preview

In addition to draft previews you can also enable live preview to view your end resulting page as you're editing content with full support for SSR rendering. See [Live preview docs](https://payloadcms.com/docs/live-preview/overview) for more details.

## On-demand Revalidation

We've added hooks to collections and globals so that all of your pages, products, footer, or header changes will automatically be updated in the frontend via on-demand revalidation supported by Nextjs.

> Note: if an image has been changed, for example it's been cropped, you will need to republish the page it's used on in order to be able to revalidate the Nextjs image cache.

## SEO

This template comes pre-configured with the official [Payload SEO Plugin](https://payloadcms.com/docs/plugins/seo) for complete SEO control from the admin panel. All SEO data is fully integrated into the front-end website that comes with this template. See [Website](#website) for more details.

## Search

This template comes with SSR search features can easily be implemented into Next.js with Payload. See [Website](#website) for more details.

## Orders and Transactions

Transactions are intended for keeping a record of any payment made, as such it will contain information regarding an order or billing address used or the payment method used and amount. Only admins can access transactions.

An order is created only once a transaction is successfully completed. This is a record that the user who completed the transaction has access so they can keep track of their history. Guests can also access their own orders by providing an order ID and the email associated with that order.

## Currencies

By default the template ships with support only for USD however you can change the supported currencies via the [plugin configuration](https://payloadcms.com/docs/ecommerce/plugin#currencies). You will need to ensure that the supported currencies in Payload are also configured in your Payment platforms.

## Stripe

By default we ship with the Stripe adapter configured, so you'll need to setup the `secretKey`, `publishableKey` and `webhookSecret` from your Stripe dashboard. Follow [Stripe's guide](https://docs.stripe.com/get-started/api-request?locale=en-GB) on how to set this up.

## Tests

We provide automated tests out of the box for both E2E and Int tests along with this template. They are being run in our CI to ensure the stability of this template over time. You can integrate them into your CI or run them locally as well via:

To run Int tests wtih Vitest:

```bash
pnpm test:int
```

To run E2Es with Playwright:

```bash
pnpm test:e2e
```

or

```bash
pnpm test
```

To run both.

## Jobs and Scheduled Publish

We have configured [Scheduled Publish](https://payloadcms.com/docs/versions/drafts#scheduled-publish) which uses the [jobs queue](https://payloadcms.com/docs/jobs-queue/jobs) in order to publish or unpublish your content on a scheduled time. The tasks are run on a cron schedule and can also be run as a separate instance if needed.

> Note: When deployed on Vercel, depending on the plan tier, you may be limited to daily cron only.

## Website

Framehouse Hub includes a beautifully designed, production-ready frontend built with the [Next.js App Router](https://nextjs.org). This provides a seamless experience for both administrators and clients.

Core features:

- [Next.js App Router](https://nextjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [React Hook Form](https://react-hook-form.com)
- [Payload Admin Bar](https://github.com/payloadcms/payload/tree/main/packages/admin-bar)
- [TailwindCSS styling](https://tailwindcss.com/)
- [shadcn/ui components](https://ui.shadcn.com/)
- User Accounts and Authentication
- Fully featured blog
- Publication workflow
- Dark mode
- Pre-made layout building blocks
- SEO
- Search
- Live preview
- Stripe payments

### Cache

Although Next.js includes a robust set of caching strategies out of the box, Payload Cloud proxies and caches all files through Cloudflare using the [Official Cloud Plugin](https://www.npmjs.com/package/@payloadcms/payload-cloud). This means that Next.js caching is not needed and is disabled by default. If you are hosting your app outside of Payload Cloud, you can easily reenable the Next.js caching mechanisms by removing the `no-store` directive from all fetch requests in `./src/app/_api` and then removing all instances of `export const dynamic = 'force-dynamic'` from pages files, such as `./src/app/(pages)/[slug]/page.tsx`. For more details, see the official [Next.js Caching Docs](https://nextjs.org/docs/app/building-your-application/caching).

## Development

To spin up this example locally, follow the [Quick Start](#quick-start). Then [Seed](#seed) the database with a few pages, posts, and projects.

### Working with Postgres

Postgres and other SQL-based databases follow a strict schema for managing your data. In comparison to our MongoDB adapter, this means that there's a few extra steps to working with Postgres.

Note that often times when making big schema changes you can run the risk of losing data if you're not manually migrating it.

#### Local development

Ideally we recommend running a local copy of your database so that schema updates are as fast as possible. By default the Postgres adapter has `push: true` for development environments. This will let you add, modify and remove fields and collections without needing to run any data migrations.

If your database is pointed to production you will want to set `push: false` otherwise you will risk losing data or having your migrations out of sync.

#### Migrations

[Migrations](https://payloadcms.com/docs/database/migrations) are essentially SQL code versions that keeps track of your schema. When deploy with Postgres you will need to make sure you create and then run your migrations.

Locally create a migration

```bash
pnpm payload migrate:create
```

This creates the migration files you will need to push alongside with your new configuration.

On the server after building and before running `pnpm start` you will want to run your migrations

```bash
pnpm payload migrate
```

This command will check for any migrations that have not yet been run and try to run them and it will keep a record of migrations that have been run in the database.

### Docker (Quick Start)

The provided Docker run command in the [Getting Started](#getting-started) section is the recommended way to spin up the required PostgreSQL database for local development.

```bash
docker run -d --name framehouse-hub-admin -p 5432:5432 -e POSTGRES_PASSWORD=jason7866 postgres
```

### Seed

To seed the database with a few pages, products, and orders you can click the 'seed database' link from the admin panel.

The seed script will also create a demo user for demonstration purposes only:

- Demo Customer
  - Email: `customer@example.com`
  - Password: `password`

> NOTICE: seeding the database is destructive because it drops your current database to populate a fresh one from the seed template. Only run this command if you are starting a new project or can afford to lose your current data.

## Production

To run Payload in production, you need to build and start the Admin panel. To do so, follow these steps:

1. Invoke the `next build` script by running `pnpm build` or `npm run build` in your project root. This creates a `.next` directory with a production-ready admin bundle.
1. Finally run `pnpm start` or `npm run start` to run Node in production and serve Payload from the `.build` directory.
1. When you're ready to go live, see Deployment below for more details.

### Deploying to Vercel

This template can also be deployed to Vercel for free. You can get started by choosing the Vercel DB adapter during the setup of the template or by manually installing and configuring it:

```bash
pnpm add @payloadcms/db-vercel-postgres
```

```ts
// payload.config.ts
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

export default buildConfig({
  // ...
  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
    },
  }),
  // ...
```

We also support Vercel's blob storage:

```bash
pnpm add @payloadcms/storage-vercel-blob
```

```ts
// payload.config.ts
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

export default buildConfig({
  // ...
  plugins: [
    vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
  // ...
```

### Self-hosting

Before deploying your app, you need to:

1. Ensure your app builds and serves in production. See [Production](#production) for more details.
2. You can then deploy Payload as you would any other Node.js or Next.js application either directly on a VPS, DigitalOcean's Apps Platform, via Coolify or more. More guides coming soon.

You can also deploy your app manually, check out the [deployment documentation](https://payloadcms.com/docs/production/deployment) for full details.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).
