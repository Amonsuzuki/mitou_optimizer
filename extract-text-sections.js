/**
 * Text File Section Extraction Script
 * Reads text files from extracted_files and splits them into sections
 * Saves each section to extracted_sections directory
 */

const fs = require('fs');
const path = require('path');

// Section titles to look for (Japanese)
const SECTION_PATTERNS = [
  { id: 1, pattern: /1\s*[\.．]\s*.*?(?:何をつくるか|なにをつくるか)/i, title: '何をつくるか' },
  { id: 2, pattern: /2\s*[\.．]\s*.*?(?:斬新さ|期待される効果)/i, title: '斬新さの主張、期待される効果など' },
  { id: 3, pattern: /3\s*[\.．]\s*.*?(?:どんな出し方|出し方を考えているか)/i, title: 'どんな出し方を考えているか' },
  { id: 4, pattern: /4\s*[\.．]\s*.*?(?:具体的な進め方|進め方と予算)/i, title: '具体的な進め方と予算' },
  { id: 5, pattern: /5\s*[\.．]\s*.*?(?:腕前|証明できるもの)/i, title: '私の腕前を証明できるもの' },
  { id: 6, pattern: /6\s*[\.．]\s*.*?(?:特記事項|プロジェクト遂行)/i, title: 'プロジェクト遂行にあたっての特記事項' },
  { id: 7, pattern: /7\s*[\.．]\s*.*?(?:IT以外|ソフトウェア作成以外|勉強|特技|趣味|生活)/i, title: 'ソフトウェア作成以外の勉強、特技、生活、趣味など' },
  { id: 8, pattern: /8\s*[\.．]\s*.*?(?:将来|ソフトウェア技術|IT.*思うこと)/i, title: '将来のソフトウェア技術に対して思うこと・期待すること' }
];

/**
 * Splits text into sections based on section patterns
 */
function splitIntoSections(text, filename) {
  const sections = {};
  
  // Initialize sections
  for (let i = 1; i <= 8; i++) {
    sections[i] = '';
  }
  
  // Find all section markers in the text
  const sectionMarkers = [];
  for (const pattern of SECTION_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      sectionMarkers.push({
        id: pattern.id,
        index: match.index,
        matchLength: match[0].length
      });
    }
  }
  
  // Sort markers by position
  sectionMarkers.sort((a, b) => a.index - b.index);
  
  // Extract content between markers
  for (let i = 0; i < sectionMarkers.length; i++) {
    const marker = sectionMarkers[i];
    const start = marker.index + marker.matchLength;
    const end = i < sectionMarkers.length - 1 ? sectionMarkers[i + 1].index : text.length;
    
    let content = text.substring(start, end).trim();
    
    // Clean up the content - remove excessive whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    // Limit to reasonable length (first 1000 characters)
    if (content.length > 1000) {
      content = content.substring(0, 1000) + '...';
    }
    
    sections[marker.id] = content;
  }
  
  return sections;
}

/**
 * Gets a short name from the filename
 */
function getShortName(filename) {
  // Remove extension
  let name = filename.replace('.txt', '');
  
  // Extract meaningful parts
  if (name.includes('wada') || name.includes('和田')) return '和田さん';
  if (name.includes('水野')) return '水野さん';
  if (name.includes('matsuura') || name.includes('松浦')) return '松浦さん';
  if (name.includes('yoshiki')) return 'Yoshikiさん';
  if (name.includes('smartgoal')) return 'SmartGoalプロジェクト';
  if (name.includes('ニューラル') || name.includes('日本語入力')) return '日本語入力システム';
  if (name.includes('proposal')) return 'Proposal';
  if (name.includes('1st_screening')) return '1st Screening';
  if (name.includes('report')) return 'Report';
  if (name.includes('提案プロジェクト詳細') || name.includes('詳細資料')) return 'プロジェクト詳細';
  
  // Default: truncate long names
  if (name.length > 30) {
    return name.substring(0, 27) + '...';
  }
  
  return name;
}

/**
 * Main function to process all text files
 */
function main() {
  const extractedFilesDir = path.join(__dirname, 'extracted_files');
  const extractedSectionsDir = path.join(__dirname, 'extracted_sections');
  
  // Create section directories if they don't exist
  for (let i = 1; i <= 8; i++) {
    const sectionDir = path.join(extractedSectionsDir, `section_${i}`);
    if (!fs.existsSync(sectionDir)) {
      fs.mkdirSync(sectionDir, { recursive: true });
      console.log(`Created directory: ${sectionDir}`);
    }
  }
  
  // Get all text files from extracted_files
  const textFiles = fs.readdirSync(extractedFilesDir).filter(f => f.endsWith('.txt'));
  
  console.log(`\nProcessing ${textFiles.length} text files from extracted_files...`);
  
  let processedCount = 0;
  
  for (const file of textFiles) {
    const filePath = path.join(extractedFilesDir, file);
    console.log(`\n  Processing: ${file}`);
    
    // Read the text file
    const text = fs.readFileSync(filePath, 'utf-8');
    
    if (!text || text.length < 100) {
      console.log(`    ⚠ File too short, skipping`);
      continue;
    }
    
    // Split into sections
    const sections = splitIntoSections(text, file);
    
    // Get short name for output files
    const shortName = getShortName(file);
    
    // Count how many sections have content
    let filledSections = 0;
    
    // Save each section to its directory
    for (let i = 1; i <= 8; i++) {
      const sectionDir = path.join(extractedSectionsDir, `section_${i}`);
      const outputFilename = `${shortName}_section_${i}.txt`;
      const outputPath = path.join(sectionDir, outputFilename);
      
      if (sections[i] && sections[i].length > 10) {
        // Write actual content
        fs.writeFileSync(outputPath, sections[i], 'utf-8');
        filledSections++;
      } else {
        // Write placeholder message
        fs.writeFileSync(outputPath, '(このセクションの内容は抽出されませんでした)\n', 'utf-8');
      }
    }
    
    console.log(`    ✓ Extracted ${filledSections} sections (saved as "${shortName}")`);
    processedCount++;
  }
  
  console.log(`\n✓ Successfully processed ${processedCount} text files`);
  console.log(`  Sections saved to: ${extractedSectionsDir}`);
}

main();
