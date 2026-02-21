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
- `yarn e2e:android:run:verbose`: Same as run but with Detox verbose logs.
- `yarn e2e:android:clean`: Uninstall app and test app from connected device/emulator (use if `pm install` fails).
- `yarn e2e:android:build:ci`: Detox Android release build.
- `yarn e2e:android:run:ci`: Detox Android release test run.
- `yarn e2e:android:ci`: Prebuild + Android Detox release build + Android Detox release run.

### Android E2E: "waiting for ready" / first-time setup

The Android app must include Detox's native module so it can connect to the test runner and send "ready". The project uses **expo-detox-config-plugin** in `app.json`; it is applied when you run `expo prebuild`. After adding or updating the plugin, **regenerate the native Android project** and rebuild:

```bash
yarn prebuild:android --clean
yarn e2e:android:build
```

Then run tests with Metro (see below).

### Android E2E: run tests (Metro required)

The debug app loads the JS bundle from **Metro**. Start Metro in a **separate terminal**, then run the tests:

```bash
# Terminal 1 – start Metro and leave it running
yarn start

# Terminal 2 – build (once) then run tests
yarn e2e:android:build
yarn e2e:android:run
```

If Metro isn’t running, tests fail with “Failed to run application on the device” / “waiting for ready message (over WebSocket)”.

### Android E2E: install failing

If tests fail with `pm install ... exited with code #1`, the app install on the emulator is being rejected (often due to a previous install with a different signature). With the emulator running and connected:

```bash
yarn e2e:android:clean
yarn e2e:android:run
```

If it still fails, run the install manually to see the real error:

```bash
adb install -r -g -t android/app/build/outputs/apk/debug/app-debug.apk
```

**INSTALL_FAILED_NO_MATCHING_ABIS**: The Detox Android build is configured for `arm64-v8a` (Pixel_9a on Apple Silicon). Rebuild and re-run: `yarn e2e:android:build` then `yarn e2e:android:run`.

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
