# Pillfolio MVP Tasks

> Granular tasks ordered so core foundations are completed first and feature work can proceed in parallel.

## Central Foundations (Must Finish First)
### F1) Project Setup
- Initialize React Native app (Expo or bare; choose and document).
- Add core dependencies: navigation, SQLite, image picker/camera, image compression, file system, UI kit (if any).
- Add test dependencies: Jest, React Native Testing Library, Detox, and mocks for native modules.
- Create base folder structure:
  - `src/screens`, `src/components`, `src/db`, `src/services`, `src/utils`, `src/types`, `src/assets`.
- Configure linting/formatting (ESLint/Prettier) and add scripts.
- Configure test scripts: `test`, `test:watch`, `test:ci`, `e2e`, `e2e:ci`.
- Define app constants (app name, storage dirs, default patient label).

### F2) Data Model & Local Storage
- Define SQLite schema:
  - `patients` (id, name, relationship, createdAt, updatedAt).
  - `prescriptions` (id, patientId, photoUri, doctorName, doctorSpecialty, condition, tagsJson, visitDate, notes, createdAt, updatedAt).
- Create DB initialization + migration runner.
- Implement DB access layer (CRUD helpers for patients and prescriptions).
- Add validation utilities for required fields (doctor, condition, tags, date, patient).

### F3) Navigation Skeleton
- Define app routes: Home (Patients), Timeline, Add/Edit Prescription, Detail, Settings.
- Set up root navigation container and stack transitions.

### F4) Test Architecture & Mocks
- Define module boundaries and interfaces (DB, file storage, image picker, compression, clock).
- Implement mock/stub layers for each boundary with dependency injection.
- Add base test utilities and fixtures (patients, prescriptions, dates, tags).
- Add Detox config and base app launch/smoke test.

### F5) CI Gatekeeping
- Add CI pipeline to run lint, unit tests, and Detox E2E tests.
- Enforce “tests + CI must pass before merge to main”.
- Add pre-merge checklist in README or contributing guide.

Dependencies:
- F2 depends on F1.
- F3 depends on F1.
- F4 depends on F1.
- F5 depends on F1 and F4.

---

## Parallel Feature Tracks (After F1–F5)

### Track A: Patient Profiles
- Build Patients (Home) screen UI:
  - List of patients.
  - CTA: Add Patient.
- Create Add/Edit Patient screen:
  - Name required, relationship optional.
- Implement Delete Patient flow:
  - Modal with choices: delete all prescriptions OR reassign to another patient.
  - DB operations for cascade delete or reassignment.
- Unit tests for patient CRUD and delete/reassign logic.
- Detox tests for patient create/edit/delete flows.

Dependencies:
- F2, F3, F4.

### Track B: Add Prescription Flow
- Build Add/Edit Prescription screen UI:
  - Photo section (camera/gallery).
  - Doctor name, specialty (optional).
  - Condition.
  - Tags input (chip-style).
  - Date picker (default today).
  - Notes.
- Integrate camera/gallery picker.
- Add image compression before save.
- Save image to app document directory; store file URI in DB.
- Validate required fields; block save on missing data.
- On save, show confirmation and navigate to detail screen.
- Unit tests for validation, image save, and DB persistence.
- Detox tests for add prescription flow.

Dependencies:
- F2, F3, F4.

### Track C: Timeline + Detail Viewer
- Build Timeline screen for selected patient:
  - Search bar placeholder.
  - List of prescription cards sorted by visitDate desc.
  - Each card shows date, doctor, condition, tags, thumbnail.
- Build Prescription Detail screen:
  - Full image view (tap to fullscreen/zoom).
  - Metadata summary.
  - Actions: Edit, Delete.
- Implement fullscreen image viewer with pinch-to-zoom.
- Unit tests for list ordering and rendering.
- Detox tests for timeline navigation and detail viewer.

Dependencies:
- F2, F3, F4.

### Track D: Search + Filters
- Implement search queries:
  - doctorName substring match.
  - condition substring match.
  - tags contains match (simple JSON string contains for MVP).
- Default search in selected patient.
- Optional toggle: Search all patients.
- Add optional tag filter chips (phase-2 if time).
- Unit tests for search queries and filters.
- Detox tests for search interactions.

Dependencies:
- F2, Track C (needs Timeline UI).

### Track E: Edit / Delete
- Implement edit prescription flow (reuse add screen).
- Update DB record + updatedAt on save.
- Delete prescription with confirm modal.
- Ensure image file is removed from storage on delete.
- Unit tests for edit and delete logic.
- Detox tests for edit/delete flows.

Dependencies:
- Track B, Track C.

### Track F: Settings
- Build Settings screen:
  - Local-only privacy warning.
  - “Export/backup” placeholder (disabled).
- Add About section and app version.
- Unit tests for settings rendering.

Dependencies:
- F3.

---

## Cross-Cutting QA & Polish (Run in Parallel Once Core Screens Exist)
- Blurry photo: allow retake before save.
- Duplicate uploads allowed (no dedupe logic).
- Large images: compress to target size/quality.
- Handle missing metadata errors gracefully with inline hints.
- Empty states for no patients / no prescriptions.
- Ensure timeline loads within 1–2s for ~200 prescriptions.
- Test offline behavior (no network required).
- Validate data persistence across app restarts.
- Test delete patient reassignment path.
- Test search accuracy with multiple tags.

---

## Release Readiness (Optional)
- Add app icon/splash.
- Basic crash logging (local only if desired).
- Write a short README for build/run instructions.

---

## Backlog
- Upgrade `SqlDriver.runAsync` to return write metadata (e.g., `changes`, `lastInsertRowId`) instead of `Promise<void>`.
- Update driver implementations (`expo` async/sync adapters), mocks, and unit tests to use the returned metadata for write-success assertions.

---

## Testing Stack Recommendation (Concrete)
- Unit/Integration: Jest + React Native Testing Library (RNTL).
- E2E: Detox.
- Mocking: Jest mocks + module boundary interfaces for DB, file system, image picker, compression, and clock.
- Test organization:
  - `src/__tests__/unit/*` for pure logic.
  - `src/__tests__/integration/*` for screen logic with mocked services.
  - `e2e/*.test.js` (Detox).
- Scripts:
  - `test` => Jest watch
  - `test:ci` => Jest CI (coverage optional)
  - `e2e` => Detox local
  - `e2e:ci` => Detox CI

## CI Outline (GitHub Actions)
- Workflow jobs:
  - `lint` -> run lint/format check.
  - `unit` -> run Jest unit/integration tests.
  - `e2e-ios` -> run Detox on macOS (iOS simulator).
  - `e2e-android` -> run Detox on Ubuntu (Android emulator), optional if time.
- Required checks: lint + unit + at least one Detox job before merge.
- Cache node_modules and Gradle (if Android).
