#!/usr/bin/env node

/**
 * Validation script for draft storage migration to Supabase
 * 
 * This script validates that:
 * 1. The worker.ts file has been updated correctly
 * 2. Required Supabase methods are being used
 * 3. KV methods for MEMORIES_KV are no longer used for drafts
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, 'worker.ts');
const workerContent = fs.readFileSync(workerPath, 'utf-8');

const checks = [];

// Check 1: Supabase import exists
const hasSupabaseImport = workerContent.includes("import { createClient } from '@supabase/supabase-js'");
checks.push({
  name: 'Supabase import',
  passed: hasSupabaseImport,
  message: hasSupabaseImport ? 'Found Supabase import' : 'Missing Supabase import'
});

// Check 2: DRAFTS table operations in save endpoint
const hasDraftsUpsert = workerContent.includes("from('drafts')") && 
                        workerContent.includes(".upsert(");
checks.push({
  name: 'Supabase drafts upsert',
  passed: hasDraftsUpsert,
  message: hasDraftsUpsert ? 'Found drafts table upsert operation' : 'Missing drafts table upsert operation'
});

// Check 3: DRAFTS table operations in load endpoint
const hasDraftsSelect = workerContent.includes("from('drafts')") && 
                        workerContent.includes(".select(") &&
                        workerContent.includes(".eq('user_id'");
checks.push({
  name: 'Supabase drafts query',
  passed: hasDraftsSelect,
  message: hasDraftsSelect ? 'Found drafts table select operation' : 'Missing drafts table select operation'
});

// Check 4: No more MEMORIES_KV.put for drafts
const hasDraftKVPut = workerContent.includes("env.MEMORIES_KV.put(`draft:");
checks.push({
  name: 'No KV put for drafts',
  passed: !hasDraftKVPut,
  message: hasDraftKVPut ? 'Found deprecated KV put operation for drafts' : 'No deprecated KV put operations found'
});

// Check 5: No more MEMORIES_KV.get for drafts
const hasDraftKVGet = workerContent.includes("env.MEMORIES_KV.get(`draft:");
checks.push({
  name: 'No KV get for drafts',
  passed: !hasDraftKVGet,
  message: hasDraftKVGet ? 'Found deprecated KV get operation for drafts' : 'No deprecated KV get operations found'
});

// Check 6: Draft interface updated
const hasDraftInterface = workerContent.includes('interface Draft') &&
                          workerContent.includes('id?: string;');
checks.push({
  name: 'Draft interface updated',
  passed: hasDraftInterface,
  message: hasDraftInterface ? 'Draft interface includes optional id field' : 'Draft interface not properly updated'
});

// Check 7: Schema file exists
const schemaPath = path.join(__dirname, 'supabase-schema.sql');
const hasSchemaFile = fs.existsSync(schemaPath);
checks.push({
  name: 'Schema file exists',
  passed: hasSchemaFile,
  message: hasSchemaFile ? 'Found supabase-schema.sql' : 'Missing supabase-schema.sql'
});

// Check 8: Migration guide exists
const migrationPath = path.join(__dirname, 'MIGRATION_GUIDE.md');
const hasMigrationGuide = fs.existsSync(migrationPath);
checks.push({
  name: 'Migration guide exists',
  passed: hasMigrationGuide,
  message: hasMigrationGuide ? 'Found MIGRATION_GUIDE.md' : 'Missing MIGRATION_GUIDE.md'
});

// Print results
console.log('\n🔍 Validating Draft Storage Migration to Supabase\n');
console.log('=' .repeat(60));

let allPassed = true;
checks.forEach(check => {
  const status = check.passed ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${check.message}`);
  if (!check.passed) allPassed = false;
});

console.log('=' .repeat(60));

if (allPassed) {
  console.log('\n✅ All validation checks passed!\n');
  console.log('Next steps:');
  console.log('1. Set up the DRAFTS table in Supabase using supabase-schema.sql');
  console.log('2. Deploy the worker: npm run deploy');
  console.log('3. Test draft save/load functionality');
  console.log('\nSee MIGRATION_GUIDE.md for detailed instructions.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some validation checks failed!\n');
  console.log('Please review the failed checks above and fix any issues.\n');
  process.exit(1);
}
