import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Force debug logging
process.env.LOG_LEVEL = 'debug';

console.log('🧪 Testing Software Component extraction...\n');

// Read cached token
const tokenCacheFile = join(__dirname, '..', 'token-cache.json');
if (!existsSync(tokenCacheFile)) {
  console.error('❌ No cached token found. Run authentication first with: npm run test:auth');
  process.exit(1);
}

const tokenCache = JSON.parse(readFileSync(tokenCacheFile, 'utf8'));
const token = tokenCache.access_token;

console.log('📋 Using cached authentication token\n');

// Import and test the SAP Notes API
const { SapNotesApiClient } = await import('../dist/sap-notes-api.js');

const config_obj = {
  pfxPath: process.env.PFX_PATH,
  pfxPassphrase: process.env.PFX_PASSPHRASE,
  coveoOrg: process.env.COVEO_ORG || 'sapamericaproductiontyfzmfz0',
  coveoHost: process.env.COVEO_HOST || 'platform.cloud.coveo.com',
  maxJwtAgeH: parseInt(process.env.MAX_JWT_AGE_H || '12'),
  headful: process.env.HEADFUL === 'true',
  logLevel: 'debug'
};

const sapNotesClient = new SapNotesApiClient(config_obj);

try {
  console.log('🔍 Fetching SAP Note 3687749 (SQL Injection with S4CORE versions)...\n');
  
  const noteDetail = await sapNotesClient.getNote('3687749', token);
  
  if (noteDetail) {
    console.log('\n✅ Note details retrieved!');
    console.log(`   ID: ${noteDetail.id}`);
    console.log(`   Title: ${noteDetail.title.substring(0, 80)}...`);
    console.log(`   CVSS Score: ${noteDetail.cvssScore}`);
    console.log(`   Component: ${noteDetail.component}`);
    
    if (noteDetail.affectedVersions && noteDetail.affectedVersions.length > 0) {
      console.log(`\n📦 Affected Software Versions (${noteDetail.affectedVersions.length}):`);
      for (const version of noteDetail.affectedVersions) {
        console.log(`   - ${version.component} ${version.version} → ${version.supportPackage}`);
      }
      console.log('\n🎉 SUCCESS: Software component extraction is working!');
    } else {
      console.log('\n❌ FAILURE: No affected versions found');
      console.log('   Expected S4CORE versions 102-109');
    }
  } else {
    console.log('❌ Could not retrieve note details');
  }

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
}
