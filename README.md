# Pillfolio

Local-first React Native app (Expo + Expo Router) for managing patient prescriptions.

## Requirements
- Node.js 20+
- Yarn 1.x
- Xcode + iOS Simulator (for Detox iOS E2E)

## Setup
```bash
yarn install
```

## Run the app
```bash
yarn start
```

## Scripts
- `yarn lint`: ESLint checks.
- `yarn test`: Jest watch mode.
- `yarn test:watch`: Jest watch mode alias.
- `yarn test:ci`: Jest CI mode.
- `yarn e2e`: Detox against `ios.sim.debug`.
- `yarn e2e:ci`: Detox against `ios.sim.release`.
- `yarn e2e:ios`: Prebuild + iOS Detox build + iOS Detox run.
- `yarn e2e:android`: Prebuild + Android Detox build + Android Detox run.
- `yarn e2e:android:build:ci`: Detox Android release build.
- `yarn e2e:android:run:ci`: Detox Android release test run.
- `yarn e2e:android:ci`: Prebuild + Android Detox release build + Android Detox release run.

## CI Gatekeeping (F5)
GitHub Actions workflow: `.github/workflows/ci.yml`

Required jobs:
- `lint`
- `unit`
- `e2e-ios`

Pipeline behavior:
- Triggers on pushes to `main` and pull requests targeting `main`.
- Blocks merge when any required job fails.

Branch protection should require these status checks before merge.

## Pre-merge Checklist
Use this checklist before merging into `main`:
- [ ] `yarn lint` passes.
- [ ] `yarn test:ci` passes.
- [ ] `yarn e2e:ci` passes (or a documented reason is provided).
- [ ] GitHub Actions `lint`, `unit`, and `e2e-ios` are green.
- [ ] Feature scope and regression risk reviewed.
