import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000); // Wait for entry animations
  
  const artifactDir = 'C:\\Users\\CHOU\\.gemini\\antigravity\\brain\\52995de4-cfac-4a5b-9eb2-49534335130d\\scratch';
  
  // Ch0
  await page.screenshot({ path: path.join(artifactDir, 'ch0.png') });
  
  // Ch1
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'ch1.png') });
  
  // Ch2
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'ch2.png') });
  
  // Ch3
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'ch3.png') });

  await browser.close();
})();
