# Feature Specifications & Spec-Driven Development (SDD) Protocol

This directory contains the product and engineering specifications for each major Framehouse Hub feature. Every spec has been audited against the current codebase — implementation status is recorded at the top of each file.

---

## Spec-Driven Development (SDD) Workflow

All feature and bug work follows a three-phase SDD protocol with human test gates.

### Phase 1: Ticket-to-Spec Ingestion

1. **Developer provides a ticket prompt** — a description of the feature or bug.
2. **Agent performs scoped file reading** using targeted glob patterns (never full-repo scans):
   - Schema/collections: `src/collections/**/*.ts`
   - API routes: `src/app/api/**/*.ts`
   - Components: `src/components/**/*.tsx`
   - Hooks: `src/collections/**/hooks/*.ts`
   - Migrations: `src/migrations/*.ts`
   - Access: `src/access/*.ts`
3. **Agent drafts an initial spec** in `docs/features/` using the template below, named `FRH-{ticket}-{short-name}.md`.

### Phase 2: 5-Issue Adversarial Codebase Audit

Before the spec is approved for implementation, the agent MUST:

1. Cross-examine the spec against the **actual codebase** (not assumptions).
2. Identify at least **5 potential issues** across these categories:
   - **Edge cases** in existing hook chains or access control
   - **Migration flaws** (FK drift, missing index updates, sequence conflicts)
   - **Storage path issues** (path contract violations, unsigned URL leaks)
   - **Free-tier violations** (memory, instance count, region misalignment)
   - **UI/UX regressions** (broken fallback chains, stale signed URLs, missing progress states)
3. Record all findings in **Section 4 ("Adversarial Review & Self-Correction Log")** of the spec.
4. Update the implementation plan to address each finding.

### Phase 3: Phased Execution with Human Test Gates

Implementation proceeds strictly phase-by-phase:

| Phase | Layer | Example Targets |
|-------|-------|-----------------|
| 1 | Database / Schema | `src/collections/`, `src/migrations/` |
| 2 | API & Service | `src/app/api/`, `scripts/worker/` |
| 3 | UI & Frontend | `src/app/(dashboard)/`, `src/components/` |

**Each phase output MUST supply:**
1. **Exact code modifications** (diffs, not full files).
2. **Manual infrastructure steps** (if any — e.g., secret creation, gcloud commands).
3. **Step-by-step verification test steps** for the engineer.

**Max Loop Cap:** If the agent encounters build/test failures during a phase, it MUST stop after **3 failed fix attempts** and report to the engineer.

---

## Status Key

| Badge | Meaning |
|-------|---------|
| **IMPLEMENTED** | Fully shipped. Spec reflects current behaviour. |
| **PARTIALLY IMPLEMENTED** | Core shipped; some deferred items remain. |
| **SPECCED — NOT STARTED** | Approved spec awaiting development. |

## Feature Index

| Spec | Ticket | Status | Key Components |
|------|--------|--------|----------------|
| [Smart Collections](FRH-47-smart-collections.md) | FRH-47 | **IMPLEMENTED** | `SmartCollections` collection, `SmartCollectionsView`, `CollectionRuleEditor`, `/api/smart-collections/**` |
| [Expanded Collection View](FRH-49-expanded-collection-view.md) | FRH-49 | **IMPLEMENTED** | `CollectionExpandedView`, `FilterBar`, `CompactGrid`, `/dashboard/library/collections/[id]` |
| [Asset Viewer](FRH-56-asset-viewer.md) | FRH-56 | **IMPLEMENTED** | `AssetViewer/` directory — `MediaStage`, `MetadataPanel`, `ActionBar`, `NavControls`, `ProgressiveImage` |
| [Portfolio Viewer](FRH-58-portfolio-viewer.md) | FRH-58 | **IMPLEMENTED** | `(portfolio)` route group, `PortfolioRenderer`, `PortfolioLightbox`, `PortfolioThemeProvider` |
| [Client Review Portal](FRH-62-client-review-portal.md) | FRH-62 | **IMPLEMENTED** | `Portfolio/review/**`, `PortfolioClientSessions`, `PortfolioClientReviews`, `/api/portfolio-review/**` |
| [Unified Creative Profile](FRH-64-unified-profile-spec.md) | FRH-64 | **SPECCED — NOT STARTED** | `/account` overhaul, creative settings cockpit, admin UI security fix |
| [Link Transfer Generation](FRH-67-link-transfer-generation.md) | FRH-67 | **IMPLEMENTED** | `LinkTransfers` collection, `/api/transfers/**`, download packaging |
| [File Download Expiry & Purge](FRH-68-file-download-expiry-purge.md) | FRH-68 | **IMPLEMENTEDD** | Transfer lifecycle, GCS cleanup, storage state mirroring |
| [Curated Background Artwork](FRH-83-curated-background-artwork.md) | FRH-83 | **SPECCED — NOT STARTED** | `TransferWallpapers` collection, `TransferWallpaperCanvas`, `/transfer/[shareHash]`, `/t/[slug]` |
| [Admin Oversight Dashboard](FRH-admin-oversight.md) | FRH-Admin | **IMPLEMENTED** | `AdminDiagnosticSessions`, `DiagnosticBanner/`, `CreativeOversightView`, `/api/admin/**` |
| [Portfolio Creation Engine](FRH-portfolio-creation-engine.md) | FRH-58+ | **IMPLEMENTED** | `Portfolios/wizard/**`, `PortfolioEditorPage`, `/dashboard/portfolios/new` |
| [Section Layout Builder](FRH-section-layout-builder.md) | FRH-60 | **IMPLEMENTED** | Section fields on `Portfolios`, `WizardStepSectionLayout`, `SectionLane`, `ModernMasonryEditor` |
| [Global Search](global-search.md) | FRH-GS | **IMPLEMENTED** | `GlobalSearch/` component, `TopBar`, `SearchInput`, `/api/media/search`, GIN index |
| [Ingest Sessions](ingest-sessions.md) | FRH-IS | **IMPLEMENTED** | `Sessions` collection, `Sessions/` components, `UploadBatches` collection |
| [Manual Collections](manual-collections.md) | FRH-MC | **IMPLEMENTED** | `SmartCollections` collection (manual type), `ManualOverridesPanel`, `MediaPickerModal` |
| [Media Showcase](media-showcase.md) | FRH-MS | **PARTIALLY IMPLEMENTED** | Layout blocks exist; AI-powered showcase surface deferred |

## Notes for New Engineers

- Specs are design-first documents — they describe intent and UX rationale, not always the exact final implementation.
- Where the spec differs from the codebase, **trust the codebase**. The spec header will call out major divergences.
- The `ForensicDrawer` component referenced in older docs was **replaced** by `AssetViewer/` (FRH-56).
- The `(app)` route group originally hosted `/p/[slug]` — it now lives in its own `(portfolio)` route group.
- Smart Collections and Manual Collections share the same `SmartCollections` collection with a `type` discriminator field (`rule-based` | `manual` | `hybrid`).
- FRH-67 and FRH-68 are sequential — FRH-67 must merge before FRH-68 can begin.
