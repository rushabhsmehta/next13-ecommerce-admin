describe('Profile Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate to profile tab', async () => {
    await element(by.id('tab-profile')).tap();
    await expect(element(by.id('profile-screen'))).toBeVisible();
  });

  it('should show profile menu items for guest user', async () => {
    await element(by.id('tab-profile')).tap();

    // Verify menu items exist
    await expect(element(by.id('menu-edit-profile'))).toBeVisible();
    await expect(element(by.id('menu-my-enquiries'))).toBeVisible();
    await expect(element(by.id('menu-whatsapp'))).toBeVisible();
    await expect(element(by.id('menu-call'))).toBeVisible();
  });

  it('should show sign out confirmation', async () => {
    // This test assumes user is logged in
    // In practice, you'd need to log in first via API or mock

    await element(by.id('tab-profile')).tap();

    // Tap sign out
    await element(by.id('menu-sign-out')).tap();

    // Verify alert appears
    await expect(element(by.text('Sign Out'))).toBeVisible();
    await expect(element(by.text('Are you sure you want to sign out?'))).toBeVisible();

    // Cancel
    await element(by.text('Cancel')).tap();

    // Verify still on profile
    await expect(element(by.id('profile-screen'))).toBeVisible();
  });
});