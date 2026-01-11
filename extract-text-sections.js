/**
 * Text Section Extraction Script
 * Extracts sections from text files in extracted_files and classifies them by sections
 */

const fs = require('fs');
const path = require('path');

// Section titles to look for (Japanese)
// Using \s to match both regular and full-width spaces
const SECTION_PATTERNS = [
  { id: 1, pattern: /^1[\s\.\．]*何.*つくる/i, title: '何をつくるか' },
  { id: 2, pattern: /^2[\s\.\．]*(?:斬.*新.*主.*張|期.*待.*効.*果)/i, title: '斬新さの主張、期待される効果など' },
  { id: 3, pattern: /^3[\s\.\．]*どんな.*出.*方/i, title: 'どんな出し方を考えているか' },
  { id: 4, pattern: /^4[\s\.\．]*(?:具.*的.*進.*方|進.*方.*予.*算)/i, title: '具体的な進め方と予算' },
  { id: 5, pattern: /^5[\s\.\．]*(?:腕.*前|証.*明)/i, title: '私の腕前を証明できるもの' },
  { id: 6, pattern: /^6[\s\.\．]*(?:特.*記.*事.*項|プロジェクト.*遂.*行)/i, title: 'プロジェクト遂行にあたっての特記事項' },
  { id: 7, pattern: /^7[\s\.\．]*(?:ソフト.*ウェア.*作.*成.*以.*外|勉.*強.*特.*技.*趣.*味|IT.*以.*外)/i, title: 'ソフトウェア作成以外の勉強、特技、生活、趣味など' },
  { id: 8, pattern: /^8[\s\.\．]*(?:将.*来.*ソフト|将.*来.*IT|将.*来.*技.*術)/i, title: '将来のソフトウェア技術に対して思うこと・期待すること' }
];

/**
 * Splits text into sections based on section patterns
 */
function splitIntoSections(text, filename) {
  const sections = {};
  const lines = text.split('\n');
  
  // Initialize sections
  for (let i = 1; i <= 8; i++) {
    sections[i] = '';
  }
  
  let currentSection = 0;
  let sectionContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Normalize spaces (convert full-width spaces to regular spaces and collapse multiple spaces)
    const normalizedLine = line.replace(/[\s　]+/g, ' ');
    
    // Check if this line matches any section header
    let foundSection = false;
    for (const pattern of SECTION_PATTERNS) {
      if (pattern.pattern.test(normalizedLine)) {
        // Save previous section content
        if (currentSection > 0 && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = pattern.id;
        sectionContent = [];
        foundSection = true;
        console.log(`  Found section ${pattern.id}: ${line.substring(0, 50)}...`);
        break;
      }
    }
    
    // If not a section header and we're in a section, add to content
    if (!foundSection && currentSection > 0) {
      sectionContent.push(line);
    }
  }
  
  // Save last section content
  if (currentSection > 0 && sectionContent.length > 0) {
    sections[currentSection] = sectionContent.join('\n').trim();
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
  if (name.includes('提案プロジェクト') || name.includes('プロジェクト詳細')) return 'プロジェクト詳細';
  
  // Default: truncate long names
  if (name.length > 30) {
    return name.substring(0, 27) + '...';
  }
  
  return name;
}

/**
 * Main function to process all text files
 */
async function main() {
  const extractedFilesDir = path.join(__dirname, 'extracted_files');
  const extractedSectionsDir = path.join(__dirname, 'extracted_sections');
  
  if (!fs.existsSync(extractedFilesDir)) {
    console.error(`Directory not found: ${extractedFilesDir}`);
    return;
  }
  
  const files = fs.readdirSync(extractedFilesDir);
  const textFiles = files.filter(f => f.endsWith('.txt'));
  
  console.log(`\nProcessing ${textFiles.length} text files...`);
  
  for (const file of textFiles) {
    const filePath = path.join(extractedFilesDir, file);
    console.log(`\nExtracting: ${file}`);
    
    const text = fs.readFileSync(filePath, 'utf-8');
    
    if (!text) {
      console.log(`  ⚠ No text in file`);
      continue;
    }
    
    const sections = splitIntoSections(text, file);
    const shortName = getShortName(file);
    
    // Save each section to appropriate directory
    let savedCount = 0;
    for (let sectionId = 1; sectionId <= 8; sectionId++) {
      const sectionDir = path.join(extractedSectionsDir, `section_${sectionId}`);
      
      // Create section directory if it doesn't exist
      if (!fs.existsSync(sectionDir)) {
        fs.mkdirSync(sectionDir, { recursive: true });
      }
      
      const outputFileName = `${shortName}_section_${sectionId}.txt`;
      const outputPath = path.join(sectionDir, outputFileName);
      
      const sectionContent = sections[sectionId];
      if (sectionContent && sectionContent.length > 10) {
        fs.writeFileSync(outputPath, sectionContent, 'utf-8');
        savedCount++;
      } else {
        // Write placeholder for empty sections
        fs.writeFileSync(outputPath, '(このセクションの内容は抽出されませんでした)\n', 'utf-8');
      }
    }
    
    console.log(`  ✓ Extracted ${savedCount} sections with content`);
  }
  
  console.log(`\n✓ Extraction complete!`);
}

main().catch(console.error);
