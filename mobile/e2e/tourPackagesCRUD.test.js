describe("Tour Packages CRUD Flow", () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("authenticates as admin, creates/updates/deletes package data, variants, and pricing", async () => {
    const packageName = "Detox Test Package 2026";
    const editedPackageName = "Detox Test Package 2026 Edited";
    const variantName = "Luxury Option";
    const pricingName = "Summer Season 2026";

    await element(by.id("tab-profile")).tap();

    if (await evaluateVisibility("menu-sign-out")) {
      await element(by.id("menu-sign-out")).tap();
      await element(by.text("Sign Out")).tap();
      await device.reloadReactNative();
      await element(by.id("tab-profile")).tap();
    }

    await expect(element(by.id("profile-guest-view"))).toBeVisible();
    await element(by.id("login-button")).tap();

    await expect(element(by.id("login-screen"))).toBeVisible();
    await element(by.id("login-dev-bypass-toggle")).tap();
    await element(by.id("login-dev-bypass-token")).typeText("mobile-dev-test-bypass-20260522");
    await device.pressBack();
    await element(by.id("login-dev-bypass-continue")).tap();

    if (await evaluateVisibilityByPlaceholder("you@example.com")) {
      await element(by.placeholder("you@example.com")).typeText("aagamholiday@gmail.com");
      await element(by.placeholder("Your full name")).typeText("Admin Test");
      await device.pressBack();
      await element(by.text("Get started")).tap();
    }

    await expect(element(by.id("home-screen"))).toBeVisible();

    await element(by.id("tab-admin")).tap();
    await expect(element(by.id("admin-dashboard"))).toBeVisible();
    await waitFor(element(by.id("admin-tools-section")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text("Operations")).tap();
    await element(by.id("admin-module-operations")).tap();
    await expect(element(by.id("tour-packages-list-screen"))).toBeVisible();

    await element(by.id("tour-packages-new")).tap();
    await expect(element(by.id("tour-package-new-screen"))).toBeVisible();
    await element(by.id("tour-package-form-name")).typeText(packageName);
    await element(by.id("tour-package-form-location")).tap();
    await element(by.id("tour-package-location-picker-option-0")).tap();

    await element(by.id("tour-package-form-type")).typeText("E2E Test");
    await element(by.id("tour-package-form-duration")).typeText("3 Nights / 4 Days");
    await element(by.id("tour-package-form-transport")).typeText("Private Sedan");
    await element(by.id("tour-package-form-pickup")).typeText("Delhi Airport");
    await element(by.id("tour-package-form-drop")).typeText("Delhi Airport");
    await element(by.id("tour-package-form-price")).typeText("Rs 12000 per person");
    await device.pressBack();

    await element(by.id("tour-package-form-add-day")).tap();
    await expect(element(by.id("tour-package-day-1"))).toBeVisible();
    await element(by.id("tour-package-day-title-1")).typeText("Arrival and Sightseeing");
    await element(by.id("tour-package-day-desc-1")).typeText(
      "Arrive at Delhi airport and transfer to hotel. Enjoy local sightseeing in the evening."
    );
    await element(by.id("tour-package-day-meals-1")).typeText("Dinner");
    await device.pressBack();

    await element(by.id("tour-package-form-submit")).tap();
    await waitFor(element(by.id("tour-package-detail-screen")))
      .toBeVisible()
      .withTimeout(8000);
    await expect(element(by.text(packageName))).toBeVisible();
    await expect(element(by.text("Day 1"))).toBeVisible();

    await element(by.id("tour-package-edit")).tap();
    await expect(element(by.id("tour-package-edit-screen"))).toBeVisible();
    await element(by.id("tour-package-form-name")).clearText();
    await element(by.id("tour-package-form-name")).typeText(editedPackageName);
    await device.pressBack();
    await element(by.id("tour-package-form-submit")).tap();

    await waitFor(element(by.id("tour-package-detail-screen")))
      .toBeVisible()
      .withTimeout(8000);
    await expect(element(by.text(editedPackageName))).toBeVisible();

    await element(by.id("tour-package-manage-variants")).tap();
    await waitFor(element(by.id("tour-package-variants-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("tour-package-variant-add")).tap();
    await expect(element(by.id("variant-new-screen"))).toBeVisible();
    await element(by.id("variant-form-name")).typeText(variantName);
    await element(by.id("variant-form-description")).typeText("Luxury variant with 5-star hotels");
    await element(by.id("variant-form-modifier")).typeText("5000");
    await device.pressBack();
    await element(by.id("variant-form-submit")).tap();

    await waitFor(element(by.text(variantName)))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text(variantName)).tap();
    await waitFor(element(by.id("variant-edit-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("variant-delete-btn")).tap();
    await element(by.text("Delete")).tap();
    await waitFor(element(by.id("tour-package-variants-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.text(variantName))).not.toBeVisible();
    await element(by.id("tour-package-variants-header-back")).tap();

    await element(by.id("tour-package-manage-pricing")).tap();
    await waitFor(element(by.id("tour-package-pricing-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("tour-package-pricing-add")).tap();
    await expect(element(by.id("tour-pricing-new-screen"))).toBeVisible();
    await element(by.id("tour-pricing-form-description")).typeText(pricingName);
    await element(by.id("tour-pricing-form-mealplan")).tap();
    await element(by.id("tour-pricing-picker-option-0")).tap();
    await element(by.id("tour-pricing-form-price-0")).typeText("15000");
    await device.pressBack();
    await element(by.id("tour-pricing-form-submit")).tap();

    await waitFor(element(by.text(pricingName)))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text(pricingName)).tap();
    await waitFor(element(by.id("tour-pricing-edit-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("tour-pricing-delete-btn")).tap();
    await element(by.text("Delete")).tap();
    await waitFor(element(by.id("tour-package-pricing-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.text(pricingName))).not.toBeVisible();
    await element(by.id("tour-package-pricing-header-back")).tap();

    await waitFor(element(by.id("tour-package-detail-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("tour-package-detail-screen")).scrollTo("bottom");
    await expect(element(by.id("tour-package-danger-zone"))).toBeVisible();
    await element(by.id("tour-package-delete-btn")).tap();
    await expect(element(by.text("Delete package"))).toBeVisible();
    await element(by.text("Delete")).tap();

    await waitFor(element(by.id("tour-packages-list-screen")))
      .toBeVisible()
      .withTimeout(8000);
    await expect(element(by.text(editedPackageName))).not.toBeVisible();
  });
});

async function evaluateVisibility(testID) {
  try {
    await expect(element(by.id(testID))).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

async function evaluateVisibilityByPlaceholder(placeholder) {
  try {
    await expect(element(by.placeholder(placeholder))).toBeVisible();
    return true;
  } catch {
    return false;
  }
}
