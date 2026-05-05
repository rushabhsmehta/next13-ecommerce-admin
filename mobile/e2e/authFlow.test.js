describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login prompt when accessing chat while logged out', async () => {
    // Navigate to Trips tab (chat)
    await element(by.id('tab-trips')).tap();

    // Should show login prompt
    await expect(element(by.id('chat-login-prompt'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should navigate to login screen from chat prompt', async () => {
    await element(by.id('tab-trips')).tap();
    await expect(element(by.id('chat-login-prompt'))).toBeVisible();

    // Tap login button
    await element(by.id('login-button')).tap();

    // Verify login screen
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should show login prompt on profile tab when logged out', async () => {
    // Navigate to Profile tab
    await element(by.id('tab-profile')).tap();

    // Should show guest profile with login button
    await expect(element(by.id('profile-guest-view'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });
});