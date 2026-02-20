import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Force debug logging
process.env.LOG_LEVEL = 'debug';

console.log('🧪 Testing CVSS extraction for SAP Note 3675151...\n');

// Read cached token
const tokenCacheFile = join(__dirname, '..', 'token-cache.json');
if (!existsSync(tokenCacheFile)) {
  console.error('❌ No cached token found. Run authentication first with: npm run test:auth');
  process.exit(1);
}

const tokenCache = JSON.parse(readFileSync(tokenCacheFile, 'utf8'));
const token = tokenCache.access_token;

console.log('📋 Using cached authentication token');
console.log(`   Token length: ${token.length} characters\n`);

// Import and test the SAP Notes API
const { SapNotesApiClient } = await import('../dist/sap-notes-api.js');

const config_obj = {
  pfxPath: process.env.PFX_PATH,
  pfxPassphrase: process.env.PFX_PASSPHRASE,
  coveoOrg: process.env.COVEO_ORG || 'sapamericaproductiontyfzmfz0',
  coveoHost: process.env.COVEO_HOST || 'platform.cloud.coveo.com',
  maxJwtAgeH: parseInt(process.env.MAX_JWT_AGE_H || '12'),
  headful: process.env.HEADFUL === 'true',
  logLevel: 'debug' // Force debug mode
};

const sapNotesClient = new SapNotesApiClient(config_obj);

try {
  console.log('🔍 Fetching SAP Note 3675151 (should have CVSS 8.4)...\n');
  
  const noteDetail = await sapNotesClient.getNote('3675151', token);
  
  if (noteDetail) {
    console.log('\n✅ Note details retrieved!');
    console.log(`   ID: ${noteDetail.id}`);
    console.log(`   Title: ${noteDetail.title}`);
    console.log(`   CVSS Score: ${noteDetail.cvssScore || 'NULL ❌'}`);
    console.log(`   CVSS Vector: ${noteDetail.cvssVector || 'NULL ❌'}`);
    console.log(`   Content preview: ${noteDetail.content.substring(0, 100)}...`);
    
    if (noteDetail.cvssScore) {
      console.log('\n🎉 SUCCESS: CVSS extraction is working!');
      console.log(`   Expected: 8.4, Got: ${noteDetail.cvssScore}`);
    } else {
      console.log('\n❌ FAILURE: CVSS score is null');
      console.log('   This means extractCvssFromPage is not finding the CVSS tab');
    }
  } else {
    console.log('❌ Could not retrieve note details for 3675151');
  }

} catch (error) {
  console.error('\n❌ CVSS extraction test failed:', error.message);
  console.error('Stack trace:', error.stack);
}
