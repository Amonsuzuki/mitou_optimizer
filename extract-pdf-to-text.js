/**
 * PDF to Text Extraction Script
 * Extracts full text from MITOU application PDFs without section splitting
 * Saves each PDF as a complete text file in extracted_files directory
 */

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

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
 * Main function to process all PDFs
 */
async function main() {
  const examplesDir = path.join(__dirname, 'examples');
  const outputDir = path.join(__dirname, 'extracted_files');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }
  
  // Process both open and closed directories
  const subdirs = ['open', 'closed'];
  let totalProcessed = 0;
  
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
      
      // Create output filename (remove .pdf and add .txt)
      const outputFilename = file.replace('.pdf', '.txt');
      const outputPath = path.join(outputDir, outputFilename);
      
      // Save the full text to file
      fs.writeFileSync(outputPath, text, 'utf-8');
      
      const lineCount = text.split('\n').length;
      console.log(`    ✓ Extracted ${lineCount} lines to ${outputFilename}`);
      totalProcessed++;
    }
  }
  
  console.log(`\n✓ Successfully processed ${totalProcessed} PDF files`);
  console.log(`  Output directory: ${outputDir}`);
}

main().catch(console.error);
