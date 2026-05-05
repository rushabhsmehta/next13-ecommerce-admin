describe('Browse Packages Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display home screen with packages', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.id('search-input'))).toBeVisible();
    await expect(element(by.id('package-list'))).toBeVisible();
  });

  it('should search for packages and show results', async () => {
    // Tap search input
    await element(by.id('search-input')).tap();
    await element(by.id('search-input')).typeText('Goa');
    await device.pressBack(); // dismiss keyboard

    // Wait for debounce + API call
    await waitFor(element(by.id('package-list')))
      .toBeVisible()
      .withTimeout(5000);

    // Check that package cards are rendered
    await expect(element(by.id('package-card-0'))).toBeVisible();
  });

  it('should filter packages by category', async () => {
    // Scroll to category chips
    await element(by.id('category-chips')).scrollTo('right');

    // Tap a category chip
    await element(by.id('category-chip-International')).tap();

    // Wait for filtered results
    await waitFor(element(by.id('package-list')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify filter badge appears
    await expect(element(by.id('filter-badge'))).toBeVisible();
  });

  it('should navigate to package detail from home', async () => {
    // Wait for package cards to load
    await waitFor(element(by.id('package-card-0')))
      .toBeVisible()
      .withTimeout(10000);

    // Tap first package card
    await element(by.id('package-card-0')).tap();

    // Verify package detail screen
    await expect(element(by.id('package-detail-screen'))).toBeVisible();
    await expect(element(by.id('package-image-gallery'))).toBeVisible();
    await expect(element(by.id('tab-itinerary'))).toBeVisible();
    await expect(element(by.id('tab-inclusions'))).toBeVisible();
    await expect(element(by.id('tab-policies'))).toBeVisible();
  });

  it('should switch tabs on package detail', async () => {
    // Navigate to package detail first
    await waitFor(element(by.id('package-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('package-card-0')).tap();
    await expect(element(by.id('package-detail-screen'))).toBeVisible();

    // Tap Inclusions tab
    await element(by.id('tab-inclusions')).tap();
    await expect(element(by.id('inclusions-content'))).toBeVisible();

    // Tap Policies tab
    await element(by.id('tab-policies')).tap();
    await expect(element(by.id('policies-content'))).toBeVisible();

    // Tap back to Itinerary
    await element(by.id('tab-itinerary')).tap();
    await expect(element(by.id('itinerary-content'))).toBeVisible();
  });

  it('should show enquiry CTA and open WhatsApp', async () => {
    await waitFor(element(by.id('package-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('package-card-0')).tap();
    await expect(element(by.id('package-detail-screen'))).toBeVisible();

    // Scroll to bottom to see CTA
    await element(by.id('package-detail-scroll')).scrollTo('bottom');

    // Verify CTA exists
    await expect(element(by.id('enquiry-cta'))).toBeVisible();

    // Tap CTA (this will open external WhatsApp, we just verify it doesn't crash)
    await element(by.id('enquiry-cta')).tap();

    // Give time for system dialog or app switch
    await device.takeScreenshot('whatsapp-enquiry');
  });
});