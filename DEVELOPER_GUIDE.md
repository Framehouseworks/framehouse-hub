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
