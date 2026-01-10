#!/usr/bin/env node
/**
 * Validation script to check that extracted sections data is properly generated
 */

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'extracted-sections-data.ts');

// Check if file exists
if (!fs.existsSync(dataFile)) {
  console.error('❌ Error: extracted-sections-data.ts not found!');
  console.log('   Run: npm run generate-data');
  process.exit(1);
}

// Load the data
let data;
try {
  // Read the file and extract the JSON
  const content = fs.readFileSync(dataFile, 'utf-8');
  const jsonMatch = content.match(/export default ({[\s\S]+});/);
  if (!jsonMatch) {
    throw new Error('Could not parse exported data');
  }
  data = JSON.parse(jsonMatch[1]);
} catch (error) {
  console.error('❌ Error loading data:', error.message);
  process.exit(1);
}

// Validate structure
const errors = [];

if (!data.generated) {
  errors.push('Missing "generated" timestamp');
}

if (!Array.isArray(data.sectionTitles) || data.sectionTitles.length !== 8) {
  errors.push('Invalid "sectionTitles" - should have 8 sections');
}

if (!Array.isArray(data.projects)) {
  errors.push('Invalid "projects" - should be an array');
} else {
  // Check each project
  data.projects.forEach((project, idx) => {
    if (!project.name) {
      errors.push(`Project ${idx} missing name`);
    }
    if (!project.category) {
      errors.push(`Project ${idx} (${project.name}) missing category`);
    }
    if (!project.sections || typeof project.sections !== 'object') {
      errors.push(`Project ${idx} (${project.name}) missing sections`);
    } else {
      // Check that all 8 sections exist
      for (let i = 1; i <= 8; i++) {
        if (!(i in project.sections)) {
          errors.push(`Project ${project.name} missing section ${i}`);
        }
      }
    }
  });
}

// Report results
if (errors.length > 0) {
  console.error('❌ Validation failed with errors:');
  errors.forEach(err => console.error('   - ' + err));
  process.exit(1);
} else {
  console.log('✓ Validation passed!');
  console.log(`  Projects: ${data.projects.length}`);
  console.log(`  Generated: ${data.generated}`);
  
  // Count non-empty sections
  let totalSections = 0;
  let nonEmptySections = 0;
  data.projects.forEach(project => {
    for (let i = 1; i <= 8; i++) {
      totalSections++;
      if (project.sections[i] && project.sections[i].length > 10) {
        nonEmptySections++;
      }
    }
  });
  console.log(`  Non-empty sections: ${nonEmptySections}/${totalSections}`);
  
  process.exit(0);
}
