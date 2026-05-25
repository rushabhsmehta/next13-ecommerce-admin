/** @type {import('detox').DetoxConfig} */
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const withVariant = (variant, command) =>
  process.platform === "win32"
    ? `set APP_VARIANT=${variant}&& ${command}`
    : `APP_VARIANT=${variant} ${command}`;
const androidBuild = (variant, tasks) =>
  `cd android && ${withVariant(variant, `${gradlew} ${tasks}`)}`;

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
      binaryPath: 'android/app/build/outputs/apk/publicApp/debug/app-publicApp-debug.apk',
      build: androidBuild(
        "public",
        "assemblePublicAppDebug assemblePublicAppDebugAndroidTest -DtestBuildType=debug"
      ),
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/publicApp/release/app-publicApp-release.apk',
      build: androidBuild(
        "public",
        "assemblePublicAppRelease assemblePublicAppReleaseAndroidTest -DtestBuildType=release"
      ),
    },
    'android.staff.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/staff/debug/app-staff-debug.apk',
      build: androidBuild(
        "staff",
        "assembleStaffDebug assembleStaffDebugAndroidTest -DtestBuildType=debug"
      ),
    },
    'android.finance.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/finance/debug/app-finance-debug.apk',
      build: androidBuild(
        "finance",
        "assembleFinanceDebug assembleFinanceDebugAndroidTest -DtestBuildType=debug"
      ),
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
    'android.emu.staff.debug': {
      device: 'emulator',
      app: 'android.staff.debug',
    },
    'android.emu.finance.debug': {
      device: 'emulator',
      app: 'android.finance.debug',
    },
  },
};
