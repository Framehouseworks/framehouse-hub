# Feature Specifications

This directory contains the product and engineering specifications for each major Framehouse Hub feature. Every spec has been audited against the current codebase — implementation status is recorded at the top of each file.

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
