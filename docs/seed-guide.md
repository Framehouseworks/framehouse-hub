# Seed Guide

Reference for the local development seed (`pnpm seed` / `src/seed/index.ts`).

---

## Running the seed

```bash
# Against an ephemeral blank-slate DB (recommended before PR):
./scripts/verify-local.sh --keep-open
DATABASE_URI=<printed URI> pnpm seed

# Against a running local DB directly:
pnpm seed
```

The seed is idempotent — re-running realigns all users, pages, globals, and re-seeds any fixture media whose enclave files are missing from disk.

---

## Seeded users

All passwords are `password123`.

| Email | Name | Role |
|---|---|---|
| `sys.admin@framehouseworks.com` | System Admin | `admin` |
| `creative@framehouseworks.com` | Creative User | `creative` |
| `alex.chen@framehouseworks.com` | Alex Chen | `creative` |
| `maya.patel@framehouseworks.com` | Maya Patel | `creative` |
| `leo.strand@framehouseworks.com` | Leo Strand | `creative` |
| `viewer@framehouseworks.com` | Viewer User | `viewer` |

---

## Seeded media fixtures

12 fixture images distributed across 4 shoot groups, one `UploadBatch` per creative user.

| Filename | Owner | Shoot | Dims | Camera |
|---|---|---|---|---|
| `alpine-summit-01.jpg` | creative | Seed: Main Portfolio | 1600×1200 | FUJIFILM X-T5 |
| `urban-neon-02.jpg` | creative | Seed: Main Portfolio | 1200×1800 | Sony A7IV |
| `mountain-mist-07.jpg` | creative | Seed: Main Portfolio | 1920×1280 | FUJIFILM X-T5 |
| `coastal-dawn-03.jpg` | alex.chen | Seed: Street & Shore | 2000×1000 | Canon EOS R5 |
| `night-market-08.jpg` | alex.chen | Seed: Street & Shore | 1080×1620 | Sony A7IV |
| `studio-portrait-04.jpg` | maya.patel | Seed: Studio & Nature | 1400×1400 | Nikon Z8 |
| `rooftop-light-10.jpg` | maya.patel | Seed: Studio & Nature | 1500×2000 | Nikon Z8 |
| `tide-pools-09.jpg` | maya.patel | Seed: Studio & Nature | 2200×1100 | Canon EOS R5 |
| `forest-canopy-05.jpg` | leo.strand | Seed: Landscape | 1800×1200 | FUJIFILM GFX100S |
| `desert-horizon-06.jpg` | leo.strand | Seed: Landscape | 2400×1350 | Leica Q3 |
| `dune-shadows-11.jpg` | leo.strand | Seed: Landscape | 2560×1440 | Leica Q3 |
| `moss-grove-12.jpg` | leo.strand | Seed: Landscape | 1600×1067 | FUJIFILM GFX100S |

Fixture JPGs and pre-built WebP derivatives (`small`, `medium`) live in `src/seed/fixtures/`. Regenerate JPGs with:

```bash
npx tsx src/seed/fixtures/generate.ts
```

---

## Seeded pages & globals

| Resource | Slug / Global |
|---|---|
| About page | `/about` |
| Hub page | `/hub` |
| Pricing global | — |
| Header global | — |
| Footer global | — |

---

## Orphan cleanup

On each run, the seed drops any media doc whose `shootName` contains `"Seed"` and whose enclave file is missing from `public/media/`. User-uploaded media is untouched.
