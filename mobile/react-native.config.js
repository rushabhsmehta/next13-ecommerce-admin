// @clerk/expo pulls Solana wallet-adapter JS; the native protocol module is optional for this app
// and its Android build.gradle pins AGP 9.x, which breaks Expo/RN 8.12 release graphs on EAS.
module.exports = {
  dependencies: {
    "@solana-mobile/mobile-wallet-adapter-protocol": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
