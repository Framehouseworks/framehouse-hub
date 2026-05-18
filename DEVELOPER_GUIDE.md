# Framehouse Hub: Developer Verification Guide

To maintain our "Museum-Grade" engineering standards and ensure 100% deployment uptime, all developers must follow this **Local-First** validation workflow.

---

## 1. The 'Pre-Flight' Check (Automated)

We use **Husky** to automate safety gates. You don't need to do anything special—they will trigger automatically:

- **At Commit**: `lint-staged` runs in seconds. It automatically fixes your linting and formats your code.
- **At Push**: The "Heavy Gate" runs. It performs a global lint, a production build, and a blank-slate database test.

---

## 2. Local 'Blank-Slate' Verification

Before raising a Pull Request, you must verify that your database migrations and seeding logic work from "Day Zero."

### **Standard Verification**

This is the fastest way to prove your code is PR-Ready:

```bash
./scripts/verify-local.sh
```

_What happens:_ It spins up a temporary Docker database, runs migrations, seeds the data, and cleans up.

### **Manual Content Inspection**

If you want to load the site and verify your new blocks/content visually:

```bash
./scripts/verify-local.sh --keep-open
```

1.  Wait for success.
2.  Run the command provided in the terminal (e.g., `DATABASE_URI=... npm run dev`).
3.  Open `localhost:3000` to inspect the seeded site.
4.  When finished, run the dismantle script:
    ```bash
    ./scripts/cleanup-local.sh
    ```

---

## 3. Best Practices for New Features

- **Schema Changes**: Always create a migration (`npm run payload migrate:create`).
- **Seeding**: If you add a new Page or Global, update `src/seed/index.ts`.
- **Environment Variables**: Never hardcode URLs. Always use `NEXT_PUBLIC_SERVER_URL` for dynamic resolution.
- **Unfinished Code**: If a component isn't ready, set its seeded status to `_status: 'draft'` to hide it from the public Hub while keeping the pipeline green.

---

## 4. Troubleshooting the Pipeline

If the **GitHub Actions** `validate-remote-migrations` job fails:

1.  **Check the logs**: It usually means a validation error in your seed data or a conflicting migration.
2.  **Reproduce locally**: Run `./scripts/verify-local.sh`. If it fails locally, it will fail in the cloud. Fix it locally first!

**By following this workflow, we ensure that our `dev` branch remains a stable, high-fidelity mirror of our vision.**

---

## 5. Cloud Staging & Production Setup (GCP & Neon DB Free Tier)

To deploy the MVP to staging/production on Neon PostgreSQL (free tier) and GCP Cloud Storage (free tier), follow these setup steps.

### **Neon PostgreSQL Setup (Free Tier)**

1.  **Create a Project**: Sign up at [neon.tech](https://neon.tech) and create a new project. Select the **PostgreSQL 16+** version.
2.  **Retrieve Connection URI**: Copy your direct and pooled connection strings from the Neon Console:
    ```env
    DATABASE_URI=postgresql://[user]:[password]@[neon-hostname]/neondb?sslmode=require
    ```
3.  **Local vs. Cloud Sequence Readiness**: Neon PostgreSQL utilizes shared sequences differently than local Docker servers. Ensure that:
    - All migrations (especially `20260514_230000_intelligence_and_scale.ts`) are fully applied.
    - Do **NOT** drop tables manually; always use Payload's migrations (`pnpm payload migrate`) to safely sync sequences on Neon without disrupting active curatorial accession counters.

### **GCP Cloud Storage Setup (Free Tier)**

We use `@payloadcms/storage-gcs` for robust media file storage in production.

1.  **Create a GCP Account**: Sign up on the [Google Cloud Console](https://console.cloud.google.com/) and enable the free trial.
2.  **Create a Cloud Storage Bucket**:
    - Set bucket name (e.g. `framehouse-assets-prod`).
    - Choose a single region close to your Neon database (e.g. `us-east1` or `europe-west1`) for minimal network latency.
    - Set **Access Control** to Fine-grained or Uniform. Ensure public read access is permitted if serving direct media URLs.
3.  **Create Service Account Credentials**:
    - Navigate to **IAM & Admin > Service Accounts**.
    - Create a new service account with **Storage Object Admin** permissions.
    - Generate and download a JSON Private Key.
4.  **Define Environment Variables**:
    Configure these production environment variables in your hosting environment (e.g. Vercel, GCP Cloud Run, Render):
    ```env
    GCS_BUCKET=framehouse-assets-prod
    GCS_PROJECT_ID=your-gcp-project-id
    GCS_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
    GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
    ```

### **Local vs. Cloud Configuration Flags**

The application dynamically toggles between Local disk storage (fallback) and GCP Cloud Storage based on the environment keys.

- **If Cloud Storage is not yet set up**: Keep the `GCS_` variables empty in your local `.env`. The codebase automatically falls back to local uploads inside `public/media` to let you develop locally without internet requirements or API quota overhead.
- **In CI/CD Build Pipelines**: The build phase dynamically resolves these variables during bundling, so they should be defined as placeholder secrets in your GitHub Actions runner if performing end-to-end integration tests.
