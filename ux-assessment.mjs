import { chromium } from '@playwright/test';

async function assessUX() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('🚀 Opening app...');
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');

  // Take screenshot in light mode
  console.log('📸 Taking screenshot in LIGHT mode...');
  await page.screenshot({ 
    path: 'ux-light-mode.png',
    fullPage: true 
  });

  // Switch to dark mode
  console.log('🌙 Switching to DARK mode...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(500);

  // Take screenshot in dark mode
  console.log('📸 Taking screenshot in DARK mode...');
  await page.screenshot({ 
    path: 'ux-dark-mode.png',
    fullPage: true 
  });

  // Check text contrast in light mode
  console.log('\n📊 Analyzing text contrast in LIGHT mode...');
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  await page.waitForTimeout(500);

  const lightModeColors = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, h1, h2, h3, span, div');
    const colors = new Set();
    elements.forEach(el => {
      const color = window.getComputedStyle(el).color;
      const bg = window.getComputedStyle(el).backgroundColor;
      if (color && color !== 'rgba(0, 0, 0, 0)') {
        colors.add(JSON.stringify({ color, bg }));
      }
    });
    return Array.from(colors).map(c => JSON.parse(c));
  });

  console.log('Light mode text colors found:');
  lightModeColors.slice(0, 10).forEach(c => {
    console.log(`  Text: ${c.color} on Background: ${c.bg}`);
  });

  // Check text contrast in dark mode
  console.log('\n📊 Analyzing text contrast in DARK mode...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(500);

  const darkModeColors = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, h1, h2, h3, span, div');
    const colors = new Set();
    elements.forEach(el => {
      const color = window.getComputedStyle(el).color;
      const bg = window.getComputedStyle(el).backgroundColor;
      if (color && color !== 'rgba(0, 0, 0, 0)') {
        colors.add(JSON.stringify({ color, bg }));
      }
    });
    return Array.from(colors).map(c => JSON.parse(c));
  });

  console.log('Dark mode text colors found:');
  darkModeColors.slice(0, 10).forEach(c => {
    console.log(`  Text: ${c.color} on Background: ${c.bg}`);
  });

  console.log('\n✅ UX assessment complete!');
  console.log('Screenshots saved:');
  console.log('  - ux-light-mode.png');
  console.log('  - ux-dark-mode.png');
  console.log('\n⏸️  Browser will stay open for manual inspection...');
  console.log('Press Ctrl+C to close when done.');

  // Keep browser open for manual inspection
  await page.waitForTimeout(300000); // 5 minutes
  await browser.close();
}

assessUX().catch(console.error);
