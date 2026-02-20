import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Inspecting raw JSON response for CVSS data...\n');

// Read cached token
const tokenCacheFile = join(__dirname, '..', 'token-cache.json');
if (!existsSync(tokenCacheFile)) {
  console.error('❌ No cached token found. Run authentication first');
  process.exit(1);
}

const tokenCache = JSON.parse(readFileSync(tokenCacheFile, 'utf8'));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Add cached cookies
if (tokenCache.cookies && Array.isArray(tokenCache.cookies)) {
  await context.addCookies(tokenCache.cookies);
  console.log(`🍪 Added ${tokenCache.cookies.length} cookies\n`);
}

const page = await context.newPage();

// Navigate to raw API
const noteId = '3675151';
const rawUrl = `https://me.sap.com/backend/raw/sapnotes/Detail?q=${noteId}&t=E&isVTEnabled=false`;
console.log(`📡 Fetching: ${rawUrl}\n`);

await page.goto(rawUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const bodyText = await page.locator('body').textContent();

try {
  const jsonData = JSON.parse(bodyText);
  
  console.log('✅ JSON Response Structure:');
  console.log('   Keys:', Object.keys(jsonData));
  
  if (jsonData.Response && jsonData.Response.SAPNote) {
    const sapNote = jsonData.Response.SAPNote;
    console.log('\n📄 SAP Note structure:');
    console.log('   Keys:', Object.keys(sapNote));
    
    // Check for CVSS in various places
    console.log('\n🔍 Looking for CVSS data...');
    
    // Check  Header
    if (sapNote.Header) {
      console.log('\n   Header keys:', Object.keys(sapNote.Header));
      const headerStr = JSON.stringify(sapNote.Header, null, 2);
      if (headerStr.includes('CVSS') || headerStr.includes('cvss')) {
        console.log('   ✅ Found CVSS in Header!');
        console.log(headerStr.substring(0, 500));
      }
    }
    
    // Check LongText
    if (sapNote.LongText && sapNote.LongText.value) {
      const longText = sapNote.LongText.value;
      if (longText.includes('CVSS')) {
        console.log('\n   ℹ️ CVSS mentioned in LongText (HTML content)');
        const cvssMatch = longText.match(/CVSS[^<>]{0,100}/gi);
        if (cvssMatch) {
          console.log('   Matches:', cvssMatch.slice(0, 3));
        }
      }
    }
    
    // Check all top-level keys for CVSS
    for (const [key, value] of Object.entries(sapNote)) {
      const valueStr = JSON.stringify(value);
      if (valueStr.includes('CVSS') || valueStr.includes('cvss')) {
        console.log(`\n   ✅ Found CVSS in key "${key}":`);
        console.log('   ', JSON.stringify(value, null, 2).substring(0, 500));
      }
    }
    
    // Print full JSON for manual inspection
    console.log('\n\n📋 Full JSON Response (first 5000 chars):');
    console.log(JSON.stringify(jsonData, null, 2).substring(0, 5000));
  }
  
} catch (e) {
  console.error('❌ Failed to parse JSON:', e.message);
}

await browser.close();
