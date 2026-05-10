/** @type {import('detox').DetoxConfig} */
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
module.exports = {
  logger: {
    level: process.env.CI ? 'debug' : 'trace',
  },
  testRunner: {
    $0: 'jest',
    args: {
      config: 'e2e/jest.config.js',
      _: ['e2e'],
    },
  },
  artifacts: {
    plugins: {
      log: process.env.CI ? 'failing' : 'all',
      screenshot: 'failing',
      video: 'failing',
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: `cd android && ${gradlew} assembleDebug assembleAndroidTest -DtestBuildType=debug`,
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: `cd android && ${gradlew} assembleRelease assembleAndroidTest -DtestBuildType=release`,
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        // Match a local AVD name (`emulator -list-avds`). Override with DETOX_AVD_NAME if needed.
        avdName: process.env.DETOX_AVD_NAME || 'Pixel_6',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};