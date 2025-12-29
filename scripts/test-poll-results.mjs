import { chromium } from '@playwright/test';

async function testPollResults() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to poll tool...');
    await page.goto('http://localhost:5174/tools/poll');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Filling poll details...');
    await page.fill('#question', 'What should we discuss?');
    
    console.log('3. Creating poll...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    console.log('4. Checking if results view is visible...');
    const resultsVisible = await page.isVisible('.results-display');
    console.log(`Results display visible: ${resultsVisible}`);
    
    const viewModeControls = await page.isVisible('.view-mode-controls');
    console.log(`View mode controls visible: ${viewModeControls}`);
    
    if (viewModeControls) {
      const text = await page.textContent('.view-mode-controls');
      console.log(`View mode controls text: ${text}`);
    }
    
    if (resultsVisible) {
      const resultsText = await page.textContent('.results-display');
      console.log(`Results display text (first 200 chars): ${resultsText?.substring(0, 200)}`);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'poll-results-test.png', fullPage: true });
    console.log('Screenshot saved as poll-results-test.png');
    
    console.log('\n5. Waiting 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testPollResults();
