beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', location: 'always' },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// Global test utilities
global.byTestId = (testID) => by.id(testID);
global.byText = (text) => by.text(text);
global.byLabel = (label) => by.label(label);