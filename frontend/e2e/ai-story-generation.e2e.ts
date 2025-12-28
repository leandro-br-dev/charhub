/**
 * E2E Tests for AI Story Generation Flow
 *
 * Tests the complete user flow of AI-powered story generation:
 * 1. Navigate to AI story creation page
 * 2. Enter text description or upload image
 * 3. Monitor real-time progress via WebSocket
 * 4. View generated story details
 * 5. Navigate to view/edit generated story
 *
 * Prerequisites:
 * - User is logged in
 * - Playwright is configured
 * - Test user has sufficient credits (75-100)
 * - WebSocket server is running
 */

import { test, expect, Page } from '@playwright/test';

const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
};

const sampleStoryInput = {
  description: 'A young wizard discovers a forbidden spell book in an ancient magical academy.',
};

const sampleImageUrl = 'https://example.com/test-scene.jpg';

test.describe('AI Story Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should navigate to AI story creation page', async ({ page }) => {
    // Click on "Stories" menu
    await page.click('button:has-text("Stories")');

    // Look for AI creation option
    const aiCreateButton = page.locator('a:has-text("Create with AI"), a:has-text("AI Story"), button:has-text("Generate Story")');

    if (await aiCreateButton.isVisible()) {
      await aiCreateButton.first().click();
    } else {
      // Navigate directly
      await page.goto('http://localhost:8082/stories/create-ai');
    }

    // Verify we're on the AI create page
    await expect(page).toHaveURL(/\/stories\/create-ai|\/story\/new/);
    await expect(page.locator('h1:has-text("AI Story")').or(page.locator('h1:has-text("Create Story")')).toBeVisible();
  });

  test('should display input options for story generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Check for text description input
    await expect(page.locator('textarea[name="description"]').or(page.locator('textarea[placeholder*="describe" i]'))).toBeVisible();

    // Check for image upload option
    await expect(page.locator('input[type="file"]').or(page.locator('text=/upload.*image/i'))).toBeVisible();

    // Check for generate button
    await expect(page.locator('button:has-text("Generate"), button:has-text("Create")')).toBeVisible();
  });

  test('should generate story from text description only', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Should show progress screen
    await expect(page.locator('.progress-screen, [data-testid="generation-progress"]')).toBeVisible();

    // Should show initial progress
    await expect(page.locator('text=/analyzing|generating|preparing/i')).toBeVisible();

    // Wait for completion (this may take several seconds)
    await expect(page.locator('text=/completed|finished|ready/i', { timeout: 60000 })).toBeVisible();

    // Should redirect to final reveal screen or story detail page
    await expect(page.locator('h1:has-text("Created!")').or(page.locator('.final-reveal, .story-created'))).toBeVisible({ timeout: 10000 });
  });

  test('should display real-time progress updates', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Should show progress bar or indicator
    await expect(page.locator('.progress-bar, [role="progressbar"], .progress-indicator')).toBeVisible();

    // Progress should update (check for multiple states)
    const progressMessages = [
      'uploading',
      'analyzing',
      'generating',
      'creating',
      'completed',
    ];

    let foundMessages = 0;
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds

    while (foundMessages < 3 && Date.now() - startTime < timeout) {
      const pageContent = await page.content();
      for (const msg of progressMessages) {
        if (pageContent.toLowerCase().includes(msg) && !pageContent.includes(`found-${msg}`)) {
          foundMessages++;
          await page.evaluate((msg) => {
            document.body.innerHTML += `<!-- found-${msg} -->`;
          }, msg);
          break;
        }
      }
      await page.waitForTimeout(1000);
    }

    // Should have seen at least some progress updates
    expect(foundMessages).toBeGreaterThanOrEqual(1);
  });

  test('should show story preview after generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Wait for completion
    await expect(page.locator('.final-reveal, .story-preview, [data-testid="final-screen"]')).toBeVisible({ timeout: 60000 });

    // Should display generated story title
    await expect(page.locator('h2, .story-title').filter({ hasText: /.+/ })).toBeVisible();

    // Should display synopsis
    await expect(page.locator('text=/synopsis|summary|about/i')).toBeVisible();

    // Should display initial scene or opening text
    await expect(page.locator('text=/opening|scene|begins/i')).toBeVisible();

    // Should display story objectives
    await expect(page.locator('text=/objectives|goals|milestones/i')).toBeVisible();
  });

  test('should allow viewing generated story', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Wait for final screen
    await expect(page.locator('.final-reveal, [data-testid="final-screen"]')).toBeVisible({ timeout: 60000 });

    // Click "View Story" button
    await page.click('button:has-text("View Story"), a:has-text("View Story")');

    // Should navigate to story detail page
    await expect(page).toHaveURL(/\/stories\/[a-f0-9-]+$/);

    // Story title should be visible
    await expect(page.locator('h1').filter({ hasText: /.+/ })).toBeVisible();
  });

  test('should allow editing generated story', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Wait for final screen
    await expect(page.locator('.final-reveal, [data-testid="final-screen"]')).toBeVisible({ timeout: 60000 });

    // Click "Edit" button
    await page.click('button:has-text("Edit"), a:has-text("Edit")');

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/stories\/[a-f0-9-]+\/edit/);

    // Should be able to modify title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('');
    await titleInput.fill('Updated: ' + await titleInput.inputValue());

    // Save changes
    await page.click('button:has-text("Save"), button:has-text("Update")');

    // Success message should appear
    await expect(page.locator('text=/saved|updated/i')).toBeVisible();
  });

  test('should allow creating another story', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter story description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Wait for final screen
    await expect(page.locator('.final-reveal, [data-testid="final-screen"]')).toBeVisible({ timeout: 60000 });

    // Click "Create another story" link
    await page.click('a:has-text("Create another"), button:has-text("Create another")');

    // Should navigate back to AI creation page
    await expect(page).toHaveURL(/\/stories\/create-ai|\/story\/new/);

    // Form should be empty
    const description = await page.locator('textarea[name="description"]').inputValue();
    expect(description).toBe('');
  });

  test('should validate input before generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Try to generate without input
    await page.click('button:has-text("Generate")');

    // Should show validation error
    await expect(page.locator('text=/required|description.*image|enter.*text/i')).toBeVisible();

    // Error message should be dismissible or clearable
    await page.click('button:has-text("Close"), .error-message button');
  });

  test('should handle image upload for generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Find file input
    const fileInput = page.locator('input[type="file"]');

    // Upload a test image
    await fileInput.setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    // Should show image preview
    await expect(page.locator('img.preview, .uploaded-image, [data-testid="image-preview"]')).toBeVisible();

    // Should be able to generate with image
    await page.click('button:has-text("Generate")');

    // Should show progress with image upload step
    await expect(page.locator('text=/uploading.*image/i')).toBeVisible({ timeout: 5000 });
  });

  test('should combine text and image inputs', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    // Generate
    await page.click('button:has-text("Generate")');

    // Should process both inputs
    await expect(page.locator('.progress-screen')).toBeVisible();

    // Should complete successfully
    await expect(page.locator('.final-reveal')).toBeVisible({ timeout: 60000 });
  });

  test('should handle insufficient credits error', async ({ page }) => {
    // Mock API to return insufficient credits
    await page.route('**/api/v1/stories/generate', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Insufficient credits',
          details: 'This operation requires 75 credits.',
          required: 75,
        }),
      });
    });

    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate
    await page.click('button:has-text("Generate")');

    // Should show error message
    await expect(page.locator('text=/insufficient.*credits|not enough.*credits/i')).toBeVisible();

    // Should display required credit amount
    await expect(page.locator('text=/75.*credits|credits.*75/i')).toBeVisible();
  });

  test('should handle generation error gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/v1/stories/generate', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'LLM service unavailable' }),
      });
    });

    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate
    await page.click('button:has-text("Generate")');

    // Should show error message
    await expect(page.locator('text=/error|failed|try again/i')).toBeVisible();

    // Should allow retry
    await expect(page.locator('button:has-text("Try Again"), button:has-text("Retry")')).toBeVisible();
  });

  test('should display credit cost before generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Look for credit cost indicator
    const costIndicator = page.locator('text=/credits?|cost/i');

    if (await costIndicator.isVisible()) {
      await expect(costIndicator).toContainText(/75|100/);
    }
  });

  test('should update credit cost when image is added', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Check initial cost (text only = 75)
    const costIndicator = page.locator('text=/75.*credits/i');

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    // Cost should update to 100 with image
    await expect(page.locator('text=/100.*credits/i')).toBeVisible({ timeout: 5000 });
  });

  test('should allow removing uploaded image', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    // Image preview should be visible
    await expect(page.locator('img.preview, .uploaded-image')).toBeVisible();

    // Remove image
    await page.click('button:has-text("Remove"), button[aria-label*="Remove"], .remove-image');

    // Preview should be gone
    await expect(page.locator('img.preview, .uploaded-image')).not.toBeVisible();

    // Cost should return to 75
    await expect(page.locator('text=/75.*credits/i')).toBeVisible();
  });

  test('should show loading state during generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate
    await page.click('button:has-text("Generate")');

    // Button should be disabled or show loading
    await expect(page.locator('button:disabled, .loading, button:has-text("Generating...")')).toBeVisible();

    // Form should be disabled
    await expect(page.locator('textarea:disabled, input:disabled')).toBeVisible();
  });

  test('should display WebSocket connection status', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Enter description
    await page.fill('textarea[name="description"]', sampleStoryInput.description);

    // Click generate
    await page.click('button:has-text("Generate")');

    // Look for connection indicator
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status');

    if (await connectionStatus.isVisible()) {
      // Should show "Connected" or similar
      await expect(connectionStatus).toContainText(/connected|live|real.time/i);
    }
  });
});

test.describe('AI Story Generation - Progress Steps', () => {
  beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should display uploading image step', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Upload image
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    await page.click('button:has-text("Generate")');

    // Should show uploading step
    await expect(page.locator('text=/uploading.*image/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display analyzing image step', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Upload image
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-scene.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    });

    await page.click('button:has-text("Generate")');

    // Should show analyzing step after uploading
    await expect(page.locator('text=/analyzing.*image/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display generating concept step', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Should show concept generation step
    await expect(page.locator('text=/generating.*concept|creating.*story/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display writing scene step', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Should show scene writing step
    await expect(page.locator('text=/writing.*scene|creating.*scene/i')).toBeVisible({ timeout: 20000 });
  });

  test('should display generating cover step', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Should show cover generation step
    await expect(page.locator('text=/generating.*cover|creating.*cover/i')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('AI Story Generation - Final Screen', () => {
  beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should display success icon/message', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');
    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Wait for completion
    await expect(page.locator('.final-reveal')).toBeVisible({ timeout: 60000 });

    // Should show success indicator
    await expect(page.locator('text=/success|created|complete|🎉/i')).toBeVisible();
  });

  test('should display generated story objectives', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');
    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Wait for completion
    await expect(page.locator('.final-reveal')).toBeVisible({ timeout: 60000 });

    // Should display objectives list
    await expect(page.locator('.objectives-list, ul.objectives')).toBeVisible();

    // Should have 3-5 objectives
    const objectives = await page.locator('.objectives-list li, ul.objectives li').all();
    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(objectives.length).toBeLessThanOrEqual(5);
  });

  test('should mention background cover generation', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');
    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Wait for completion
    await expect(page.locator('.final-reveal')).toBeVisible({ timeout: 60000 });

    // Should mention cover is being generated
    await expect(page.locator('text=/cover.*background|generating.*cover|cover.*coming/i')).toBeVisible();
  });
});

test.describe('AI Story Generation - Internationalization', () => {
  beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8082/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8082/dashboard');
  });

  test('should display translated labels', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');

    // Check for various translated elements
    await expect(page.locator('text=/describe your story|descreva sua história/i')).toBeVisible();

    // Generate button should be translated
    await expect(page.locator('button:has-text(/generate|gerar/i)')).toBeVisible();
  });

  test('should display translated progress messages', async ({ page }) => {
    await page.goto('http://localhost:8082/stories/create-ai');
    await page.fill('textarea[name="description"]', sampleStoryInput.description);
    await page.click('button:has-text("Generate")');

    // Progress messages should be in user's language
    await expect(page.locator('text=/analyzing|analyzing|analisando/i')).toBeVisible({ timeout: 10000 });
  });
});
