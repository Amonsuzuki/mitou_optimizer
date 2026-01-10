/**
 * PDF Text Extraction Script
 * Extracts text from MITOU application PDFs and classifies them by sections
 */

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Section titles to look for (Japanese)
const SECTION_PATTERNS = [
  { id: 1, pattern: /(?:1\s*[\.．]?\s*何をつくるか|^何をつくるか)/i, title: '何をつくるか' },
  { id: 2, pattern: /(?:2\s*[\.．]?\s*斬新さの主張|^斬新さの主張|^斬新さ|期待される効果)/i, title: '斬新さの主張、期待される効果など' },
  { id: 3, pattern: /(?:3\s*[\.．]?\s*どんな出し方|^どんな出し方)/i, title: 'どんな出し方を考えているか' },
  { id: 4, pattern: /(?:4\s*[\.．]?\s*具体的な進め方|^具体的な進め方|^進め方と予算)/i, title: '具体的な進め方と予算' },
  { id: 5, pattern: /(?:5\s*[\.．]?\s*(?:私の)?腕前|^腕前を証明)/i, title: '私の腕前を証明できるもの' },
  { id: 6, pattern: /(?:6\s*[\.．]?\s*特記事項|プロジェクト遂行)/i, title: 'プロジェクト遂行にあたっての特記事項' },
  { id: 7, pattern: /(?:7\s*[\.．]?\s*(?:ソフトウェア作成以外|勉強.*特技.*趣味)|^ソフトウェア作成以外)/i, title: 'ソフトウェア作成以外の勉強、特技、生活、趣味など' },
  { id: 8, pattern: /(?:8\s*[\.．]?\s*将来のソフトウェア|^将来.*ソフトウェア.*技術)/i, title: '将来のソフトウェア技術に対して思うこと・期待すること' }
];

/**
 * Extracts text from a PDF file
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      useSystemFonts: true
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error(`Error extracting text from ${pdfPath}:`, error.message);
    return '';
  }
}

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
    
    // Check if this line matches any section header
    let foundSection = false;
    for (const pattern of SECTION_PATTERNS) {
      if (pattern.pattern.test(line)) {
        // Save previous section content
        if (currentSection > 0 && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = pattern.id;
        sectionContent = [];
        foundSection = true;
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
  
  // Limit each section to reasonable length (first 1000 characters)
  for (let i = 1; i <= 8; i++) {
    if (sections[i] && sections[i].length > 1000) {
      sections[i] = sections[i].substring(0, 1000) + '...';
    }
  }
  
  return sections;
}

/**
 * Gets a short name from the filename
 */
function getShortName(filename) {
  // Remove extension
  let name = filename.replace('.pdf', '');
  
  // Extract meaningful parts
  if (name.includes('wada')) return '和田さん';
  if (name.includes('水野')) return '水野さん';
  if (name.includes('matsuura')) return '松浦さん';
  if (name.includes('yoshiki')) return 'Yoshikiさん';
  if (name.includes('smartgoal')) return 'SmartGoalプロジェクト';
  if (name.includes('ニューラル')) return '日本語入力システム';
  if (name.includes('proposal')) return 'Proposal';
  if (name.includes('1st_screening')) return '1st Screening';
  if (name.includes('report')) return 'Report';
  
  // Default: truncate long names
  if (name.length > 30) {
    return name.substring(0, 27) + '...';
  }
  
  return name;
}

/**
 * Main function to process all PDFs
 */
async function main() {
  const examplesDir = path.join(__dirname, 'examples');
  const outputPath = path.join(__dirname, 'extracted-sections.json');
  
  const allProjects = [];
  
  // Process both open and closed directories
  const subdirs = ['open', 'closed'];
  
  for (const subdir of subdirs) {
    const dirPath = path.join(examplesDir, subdir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory not found: ${dirPath}`);
      continue;
    }
    
    const files = fs.readdirSync(dirPath);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    console.log(`\nProcessing ${pdfFiles.length} PDFs in ${subdir}...`);
    
    for (const file of pdfFiles) {
      const pdfPath = path.join(dirPath, file);
      console.log(`  Extracting: ${file}`);
      
      const text = await extractTextFromPDF(pdfPath);
      
      if (!text) {
        console.log(`    ⚠ No text extracted`);
        continue;
      }
      
      const sections = splitIntoSections(text, file);
      
      // Count how many sections have content
      const filledSections = Object.values(sections).filter(s => s && s.length > 10).length;
      console.log(`    ✓ Extracted ${filledSections} sections`);
      
      allProjects.push({
        name: getShortName(file),
        filename: file,
        category: subdir,
        sections: sections
      });
    }
  }
  
  // Sort projects by category (directory) first, then by name
  allProjects.sort((a, b) => {
    if (a.category !== b.category) {
      // 'open' comes before 'closed'
      return a.category === 'open' ? -1 : 1;
    }
    // Within same category, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
  
  // Save to JSON file
  const output = {
    generated: new Date().toISOString(),
    sectionTitles: SECTION_PATTERNS.map(p => ({ id: p.id, title: p.title })),
    projects: allProjects
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✓ Extracted data saved to ${outputPath}`);
  console.log(`  Total projects: ${allProjects.length}`);
}

main().catch(console.error);
