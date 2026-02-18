const { execSync } = require("node:child_process");

function pickIosSimulatorType() {
  if (process.env.DETOX_DEVICE_TYPE) {
    return process.env.DETOX_DEVICE_TYPE;
  }

  const preferredDeviceTypes = [
    "iPhone 16",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 16 Pro Max",
    "iPhone 15",
    "iPhone 15 Pro",
    "iPhone 14",
  ];

  try {
    const output = execSync("xcrun simctl list devicetypes", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const available = new Set(
      output
        .split("\n")
        .map((line) => line.match(/^\s*(iPhone [^(]+)\s+\(/))
        .filter(Boolean)
        .map((match) => match[1].trim()),
    );

    for (const deviceType of preferredDeviceTypes) {
      if (available.has(deviceType)) {
        return deviceType;
      }
    }
  } catch {
    // Fall through to default when simctl is unavailable.
  }

  return "iPhone 16";
}

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/Pillfolio.app",
      build:
        "xcodebuild -workspace ios/Pillfolio.xcworkspace -scheme Pillfolio -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/Pillfolio.app",
      build:
        "xcodebuild -workspace ios/Pillfolio.xcworkspace -scheme Pillfolio -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath:
        "android/app/build/outputs/apk/debug/app-debug.apk",
      build:
        "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      reversePorts: [8081],
    },
    "android.release": {
      type: "android.apk",
      binaryPath:
        "android/app/build/outputs/apk/release/app-release.apk",
      build:
        "cd android && ./gradlew assembleRelease assembleReleaseAndroidTest -DtestBuildType=release",
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: pickIosSimulatorType(),
      },
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_9a",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
    "android.emu.release": {
      device: "emulator",
      app: "android.release",
    },
  },
};
