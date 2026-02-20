import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Inspecting SupportPackage structure...\n');

const tokenCacheFile = join(__dirname, '..', 'token-cache.json');
if (!existsSync(tokenCacheFile)) {
  console.error('❌ No cached token found');
  process.exit(1);
}

const tokenCache = JSON.parse(readFileSync(tokenCacheFile, 'utf8'));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

if (tokenCache.cookies && Array.isArray(tokenCache.cookies)) {
  await context.addCookies(tokenCache.cookies);
}

const page = await context.newPage();
const noteId = '3687749'; // SQL Injection note with version table
const rawUrl = `https://me.sap.com/backend/raw/sapnotes/Detail?q=${noteId}&t=E&isVTEnabled=false`;

await page.goto(rawUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const bodyText = await page.locator('body').textContent();
const jsonData = JSON.parse(bodyText);

if (jsonData.Response && jsonData.Response.SAPNote) {
  const sapNote = jsonData.Response.SAPNote;
  
  console.log('📦 SupportPackage structure:');
  if (sapNote.SupportPackage) {
    console.log(JSON.stringify(sapNote.SupportPackage, null, 2));
  } else {
    console.log('  ❌ No SupportPackage field');
  }
  
  console.log('\n📦 SupportPackagePatch structure:');
  if (sapNote.SupportPackagePatch) {
    console.log(JSON.stringify(sapNote.SupportPackagePatch, null, 2));
  } else {
    console.log('  ❌ No SupportPackagePatch field');
  }
  
  console.log('\n📦 CorrectionInstructions structure:');
  if (sapNote.CorrectionInstructions) {
    console.log(JSON.stringify(sapNote.CorrectionInstructions, null, 2).substring(0, 2000));
  } else {
    console.log('  ❌ No CorrectionInstructions field');
  }
}

await browser.close();
