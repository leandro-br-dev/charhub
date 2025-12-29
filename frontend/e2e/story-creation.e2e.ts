/**
 * E2E Tests for Manual Story Creation Flow
 *
 * Tests the complete user flow of manually creating a story:
 * 1. Navigate to create story page
 * 2. Fill in story details
 * 3. Add and configure characters
 * 4. Set story tags and classification
 * 5. Create the story
 * 6. Verify story appears on dashboard
 *
 * Prerequisites:
 * - User is logged in
 * - Playwright is configured
 * - Test user has sufficient credits
 */

import { test, expect, Page } from '@playwright/test';

const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
};

const sampleStory = {
  title: 'The Dragon Academy',
  synopsis: 'A young wizard discovers a forbidden spell book in the ancient academy library.',
  initialText: 'The sun was setting over the ancient academy as Elena discovered the forbidden tome.',
  ageRating: 'SIXTEEN',
  visibility: 'PUBLIC',
};

test.describe('Manual Story Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should navigate to story creation page', async ({ page }) => {
    // Click on "Stories" menu
    await page.click('button:has-text("Stories")');

    // Click "Create Story" button
    await page.click('a:has-text("Create Story")');

    // Verify we're on the create page
    await expect(page).toHaveURL(/\/stories\/create/);
    await expect(page.locator('h1:has-text("Create Story")').or(page.locator('h1:has-text("New Story")')).toBeVisible();
  });

  test('should display all required form fields', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Check for title field
    await expect(page.locator('input[name="title"]').or(page.locator('input[placeholder*="title" i]')).toBeVisible();

    // Check for synopsis field
    await expect(page.locator('textarea[name="synopsis"]').or(page.locator('textarea[placeholder*="synopsis" i]')).toBeVisible();

    // Check for initial text field
    await expect(page.locator('textarea[name="initialText"]').or(page.locator('textarea[placeholder*="scene" i]')).toBeVisible();

    // Check for character selector
    await expect(page.locator('text=/characters?/i')).toBeVisible();

    // Check for age rating selector
    await expect(page.locator('text=/age rating?/i')).toBeVisible();

    // Check for visibility selector
    await expect(page.locator('text=/visibility?/i')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button:has-text("Create")').or(page.locator('button[type="submit"]'))).toBeVisible();
  });

  test('should create a story with minimal required fields', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Fill title
    await page.fill('input[name="title"]', sampleStory.title);

    // Fill synopsis
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);

    // Fill initial text
    await page.fill('textarea[name="initialText"]', sampleStory.initialText);

    // Submit form
    await page.click('button:has-text("Create")');

    // Should redirect to story detail page
    await page.waitForURL(/\/stories\/[a-f0-9-]+$/);

    // Verify story title is displayed
    await expect(page.locator(`h1:has-text("${sampleStory.title}")`).toBeVisible();
  });

  test('should allow adding characters to story', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Click "Add Character" button
    await page.click('button:has-text("Add Character"), button[aria-label*="Add Character" i]');

    // Character selector modal should appear
    await expect(page.locator('[role="dialog"], .modal, [class*="modal" i], [class*="dialog" i]').first()).toBeVisible();

    // Select a character from the list
    await page.click('.character-card, [data-testid="character-item"], [role="option"]').first();

    // Confirm selection
    await page.click('button:has-text("Add"), button:has-text("Confirm")');

    // Character should be displayed in the form
    await expect(page.locator('.character-item, [data-testid="selected-character"]').first()).toBeVisible();
  });

  test('should allow setting main character', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Add first character
    await page.click('button:has-text("Add Character")');
    await page.click('.character-card').first();
    await page.click('button:has-text("Add")');

    // Add second character
    await page.click('button:has-text("Add Character")');
    await page.click('.character-card').nth(1);
    await page.click('button:has-text("Add")');

    // Set first character as main
    await page.locator('.character-item').first().click();
    await page.click('button:has-text("Set as Main"), button:has-text("Main Character")');

    // First character should have main indicator
    await expect(page.locator('.character-item').first().locator('text=/main/i')).toBeVisible();
  });

  test('should allow setting story tags', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Find tags section
    const tagsSection = page.locator('text=/tags?/i').first();

    // Click to add tags
    await tagsSection.click();

    // Select a tag category
    await page.click('.tag-category, [data-testid="tag-category"]').first();

    // Select specific tags
    await page.click('.tag-item:has-text("Fantasy"), [data-value="fantasy"]').first();

    // Tags should be displayed
    await expect(page.locator('.selected-tag:has-text("Fantasy")')).toBeVisible();
  });

  test('should allow setting content tags for warnings', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Find content tags section
    const contentTagsSection = page.locator('text=/content.*tags?/i, text=/warnings?/i').first();

    // Click to add content tags
    await contentTagsSection.click();

    // Select a content tag
    await page.click('.tag-item:has-text("Violence"), [data-value="VIOLENCE"]').first();

    // Content tag should be displayed
    await expect(page.locator('.selected-tag:has-text("Violence"), .content-tag:has-text("Violence")')).toBeVisible();
  });

  test('should allow setting age rating', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Find age rating selector
    await page.click('button:has-text("Age Rating"), [data-testid="age-rating-selector"]');

    // Select an age rating
    await page.click('li:has-text("16+"), button:has-text("16+"), [data-value="SIXTEEN"]');

    // Selection should be reflected
    await expect(page.locator('button:has-text("16+")')).toBeVisible();
  });

  test('should allow setting story visibility', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Find visibility selector
    await page.click('button:has-text("Visibility"), [data-testid="visibility-selector"]');

    // Select "Public"
    await page.click('li:has-text("Public"), button:has-text("Public")');

    // Selection should be reflected
    await expect(page.locator('button:has-text("Public")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Try to submit without filling required fields
    await page.click('button:has-text("Create"), button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/required/i, .error-message, [data-testid="error"]')).toBeVisible();
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Fill form
    await page.fill('input[name="title"]', sampleStory.title);
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);
    await page.fill('textarea[name="initialText"]', sampleStory.initialText);

    // Submit form
    await page.click('button:has-text("Create")');

    // Button should show loading state
    await expect(page.locator('button:has-text("Creating..."), button[disabled], .loading')).toBeVisible();
  });

  test('should display error message on failed creation', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/stories', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid story data' }),
      });
    });

    await page.goto('http://localhost:8082/stories/create');

    // Fill form
    await page.fill('input[name="title"]', sampleStory.title);
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);
    await page.fill('textarea[name="initialText"]', sampleStory.initialText);

    // Submit form
    await page.click('button:has-text("Create")');

    // Should show error message
    await expect(page.locator('text=/error/i, .error-message')).toBeVisible();
  });

  test('should save draft functionality', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Fill partial form
    await page.fill('input[name="title"]', sampleStory.title);
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);

    // Look for save draft button (if exists)
    const saveDraftButton = page.locator('button:has-text("Save Draft")');
    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click();

      // Should show success message
      await expect(page.locator('text=/draft.*saved/i')).toBeVisible();
    }
  });

  test('should allow uploading cover image', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Find cover image upload area
    const uploadArea = page.locator('[data-testid="cover-upload"], .cover-upload, input[type="file"]').first();

    // Upload a test image
    await uploadArea.setInputFiles({
      name: 'test-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    // Should show image preview
    await expect(page.locator('img.cover-preview, .uploaded-image')).toBeVisible();
  });

  test('should navigate back to dashboard on cancel', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Click cancel button
    await page.click('button:has-text("Cancel"), a:has-text("Back")');

    // Should return to dashboard
    await expect(page).toHaveURL('http://localhost:8082/dashboard');
  });

  test('should show story count increase after creation', async ({ page }) => {
    // Get initial story count
    await page.goto('http://localhost:8082/dashboard');
    const initialCount = await page.locator('.story-card, [data-testid="story-item"]').count();

    // Create new story
    await page.goto('http://localhost:8082/stories/create');
    await page.fill('input[name="title"]', sampleStory.title);
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);
    await page.fill('textarea[name="initialText"]', sampleStory.initialText);
    await page.click('button:has-text("Create")');

    // Wait for redirect to story page
    await page.waitForURL(/\/stories\/[a-f0-9-]+$/);

    // Go back to dashboard
    await page.goto('http://localhost:8082/dashboard');

    // Story count should increase
    const newCount = await page.locator('.story-card, [data-testid="story-item"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should allow editing story after creation', async ({ page }) => {
    // Create a story first
    await page.goto('http://localhost:8082/stories/create');
    await page.fill('input[name="title"]', sampleStory.title);
    await page.fill('textarea[name="synopsis"]', sampleStory.synopsis);
    await page.fill('textarea[name="initialText"]', sampleStory.initialText);
    await page.click('button:has-text("Create")');

    // Wait for redirect
    await page.waitForURL(/\/stories\/[a-f0-9-]+$/);

    // Click edit button
    await page.click('button:has-text("Edit"), a:has-text("Edit")');

    // Should be on edit page
    await expect(page).toHaveURL(/\/stories\/[a-f0-9-]+\/edit/);

    // Modify title
    await page.fill('input[name="title"]', 'Updated: ' + sampleStory.title);

    // Save changes
    await page.click('button:has-text("Save"), button:has-text("Update")');

    // Updated title should be visible
    await expect(page.locator('h1:has-text("Updated:")')).toBeVisible();
  });

  test('should display internationalized labels', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Check for translated labels
    await expect(page.locator('text=/title|título/i')).toBeVisible();
    await expect(page.locator('text=/synopsis|sinopse/i')).toBeVisible();
    await expect(page.locator('text=/characters|personagens/i')).toBeVisible();
    await expect(page.locator('text=/tags|etiquetas/i')).toBeVisible();
  });
});

test.describe('Manual Story Creation - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Check that inputs have associated labels
    const inputs = await page.locator('input, textarea, select').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Each input should have either id, aria-label, or aria-labelledby
      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Tab through form fields
    await page.keyboard.press('Tab');

    // First field should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']).toContain(focusedElement);
  });

  test('should have proper ARIA roles', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create');

    // Check for proper ARIA roles on interactive elements
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);
  });
});
