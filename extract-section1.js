#!/usr/bin/env node
/**
 * Extract Section 1 from extracted text files
 * This script reads the extracted_files directory and extracts section 1 content
 * to the extracted_sections/section_1 directory
 */

const fs = require('fs');
const path = require('path');

// Section 1 patterns to look for
const SECTION_1_PATTERNS = [
  /(?:1\s*[\.．]?\s*何をつくるか|^何をつくるか)/i,
  /(?:1\s*[\.．]?\s*なにをつくるか|^なにをつくるか)/i,
  /(?:①\s*なにをつくるか)/i,
  /(?:1\s*[\.．]\s*プロジェクトの背景|プロジェクトの背景)/i,
  /(?:1\s*[\.．]\s*なにを作るか|^なにを作るか)/i,
  /【提案.*?詳細】/i,
  /なにをつくるか/i,
  /何をつくるか/i,
  /何\s*を\s*つくるか/i
];

// Section 2 patterns to find the end of section 1
const SECTION_2_PATTERNS = [
  /(?:2\s*[\.．]?\s*斬新さの主張|^斬新さの主張|^斬新さ|期待される効果)/i,
  /(?:2\s*[\.．]?\s*どんな出し方|^どんな出し方)/i,
  /(?:2\s*[\.．]?\s*開発に関する未踏性|^開発に関する未踏性)/i,
  /(?:2\s*[\.．]\s*どんな出し方を考えているか)/i,
  /(?:②\s*)/i
];

// Map of filenames to project names (matching generate-sections-data.js)
const FILE_TO_PROJECT_MAP = {
  'proposal.txt': 'Proposal',
  '提案プロジェクト詳細資料.txt': 'プロジェクト詳細',
  'yoshiki4.txt': 'Yoshikiさん',
  'mitou_application_matsuura_2019.txt': '松浦さん',
  '1st_screening.txt': '1st Screening',
  'ニューラル言語モデルによる個人最適な日本語入力システムの開発-未踏提案書.docx.txt': '日本語入力システム',
  '提案書_smartgoal.txt': 'SmartGoalプロジェクト',
  'report.txt': 'Report',
  '水野竣介_提案プロジェクト詳細資料.txt': '水野さん',
  'wada_未踏一次審査資料.txt': '和田さん'
};

/**
 * Extracts section 1 content from text
 */
function extractSection1(text, filename) {
  const lines = text.split('\n');
  let section1Start = -1;
  let section2Start = -1;
  
  // Find section 1 start - also check the full text at the beginning
  const fullTextStart = text.substring(0, Math.min(3000, text.length));
  for (const pattern of SECTION_1_PATTERNS) {
    if (pattern.test(fullTextStart)) {
      section1Start = 0;
      break;
    }
  }
  
  // If not found at the start, search line by line
  if (section1Start === -1) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      for (const pattern of SECTION_1_PATTERNS) {
        if (pattern.test(line)) {
          section1Start = i;
          break;
        }
      }
      if (section1Start !== -1) break;
    }
  }
  
  // If section 1 not found, return empty
  if (section1Start === -1) {
    console.log(`  ⚠ Section 1 not found in ${filename}`);
    return '';
  }
  
  // Find section 2 start (end of section 1)
  for (let i = section1Start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const pattern of SECTION_2_PATTERNS) {
      if (pattern.test(line)) {
        section2Start = i;
        break;
      }
    }
    if (section2Start !== -1) break;
  }
  
  // If section 2 not found, take a reasonable amount of text (e.g., 100 lines)
  if (section2Start === -1) {
    section2Start = Math.min(section1Start + 100, lines.length);
  }
  
  // Extract the section content
  const sectionLines = lines.slice(section1Start, section2Start);
  const content = sectionLines.join('\n').trim();
  
  // Limit to reasonable length (first 5000 characters)
  if (content.length > 5000) {
    return content.substring(0, 5000) + '...';
  }
  
  return content;
}

/**
 * Main function
 */
function main() {
  const extractedFilesDir = path.join(__dirname, 'extracted_files');
  const section1Dir = path.join(__dirname, 'extracted_sections', 'section_1');
  
  // Create section_1 directory if it doesn't exist
  if (!fs.existsSync(section1Dir)) {
    fs.mkdirSync(section1Dir, { recursive: true });
  }
  
  console.log('Extracting Section 1 from extracted files...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each file
  for (const [filename, projectName] of Object.entries(FILE_TO_PROJECT_MAP)) {
    const inputPath = path.join(extractedFilesDir, filename);
    const outputFilename = `${projectName}_section_1.txt`;
    const outputPath = path.join(section1Dir, outputFilename);
    
    console.log(`Processing: ${filename}`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`  ⚠ File not found: ${filename}`);
      failCount++;
      continue;
    }
    
    const text = fs.readFileSync(inputPath, 'utf-8');
    const section1Content = extractSection1(text, filename);
    
    if (section1Content) {
      fs.writeFileSync(outputPath, section1Content, 'utf-8');
      console.log(`  ✓ Extracted ${section1Content.length} characters to ${outputFilename}`);
      successCount++;
    } else {
      // Write placeholder if content not found
      fs.writeFileSync(outputPath, '(このセクションの内容は抽出されませんでした)\n', 'utf-8');
      console.log(`  ⚠ No content extracted, wrote placeholder to ${outputFilename}`);
      failCount++;
    }
  }
  
  console.log(`\n✓ Completed: ${successCount} successful, ${failCount} failed`);
}

main();
