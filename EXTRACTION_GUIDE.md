# PDF Text Extraction Guide

This guide explains how to extract text from MITOU application PDFs and organize them into individual text files by section.

## Overview

The `extract-pdf-sections.py` script processes PDF files from the `examples/` directory and extracts content for all 8 standard MITOU application sections. Each section from each person is saved as a separate text file.

## Usage

### Running the Extraction Script

```bash
python3 extract-pdf-sections.py
```

The script will:
1. Process all PDF files in `examples/open/` and `examples/closed/` directories
2. Extract text content for each of the 8 sections
3. Save individual text files organized by section
4. Generate a JSON summary file for backward compatibility

### Output Structure

The extracted text files are organized in the following structure:

```
extracted_sections/
├── section_1/
│   ├── {person_name}_section_1.txt
│   ├── {person_name}_section_1.txt
│   └── ...
├── section_2/
│   ├── {person_name}_section_2.txt
│   └── ...
├── section_3/
│   └── ...
├── section_4/
│   └── ...
├── section_5/
│   └── ...
├── section_6/
│   └── ...
├── section_7/
│   └── ...
└── section_8/
    └── ...
```

### The 8 Sections

1. **Section 1**: 何をつくるか (What will you create?)
2. **Section 2**: 斬新さの主張、期待される効果など (Innovation claims and expected effects)
3. **Section 3**: どんな出し方を考えているか (How do you plan to release it?)
4. **Section 4**: 具体的な進め方と予算 (Specific approach and budget)
5. **Section 5**: 私の腕前を証明できるもの (Evidence of your skills)
6. **Section 6**: プロジェクト遂行にあたっての特記事項 (Special notes for project execution)
7. **Section 7**: ソフトウェア作成以外の勉強、特技、生活、趣味など (Studies, skills, life, hobbies outside of software)
8. **Section 8**: 将来のソフトウェア技術に対して思うこと・期待すること (Thoughts and expectations for future software technology)

## File Naming Convention

Each text file follows this naming pattern:
- **Format**: `{person_name}_section_{section_id}.txt`
- **Example**: `和田さん_section_1.txt`, `松浦さん_section_2.txt`

Person names are automatically extracted from the PDF filename using predefined patterns.

## Features

### Full Text Extraction

Unlike the JSON output (which truncates sections at 1000 characters), text files contain the **complete extracted content** for each section without any length limitations.

### Empty Section Handling

If a section cannot be extracted from a PDF (e.g., the PDF has a different structure), the text file will contain:
```
(このセクションの内容は抽出されませんでした)
```

This ensures that all expected files are created, making it easier to identify which sections are missing.

## Adding New PDFs

To process new PDF files:

1. Add your PDF files to either:
   - `examples/open/` - for openly available applications
   - `examples/closed/` - for private/sensitive applications

2. Run the extraction script:
   ```bash
   python3 extract-pdf-sections.py
   ```

3. The new text files will be automatically created in the `extracted_sections/` directory

## Requirements

- Python 3.x
- PyPDF2 library (automatically installed if missing)

## Output Files

The script generates two types of output:

1. **Text Files** (NEW): Individual `.txt` files for each section of each person
   - Location: `extracted_sections/section_{1-8}/`
   - Format: Plain text with UTF-8 encoding
   - Content: Full extracted text without truncation

2. **JSON File**: Summary of all extracted data
   - Location: `extracted-sections.json`
   - Format: JSON with UTF-8 encoding
   - Content: Truncated to 1000 characters per section (for web display)

## Notes

- The `extracted_sections/` directory is automatically added to `.gitignore` since these are generated files
- Person names are sanitized to be safe for use in filenames (special characters are replaced with underscores)
- The extraction quality depends on the PDF structure and formatting
- Some PDFs may not have well-defined section boundaries, resulting in partial or empty extractions

## Troubleshooting

### No text extracted from a PDF

Some PDFs may use image-based text or have unusual formatting. In such cases:
- The text file will contain the "content not extracted" message
- You may need to use OCR tools for image-based PDFs
- Check if the PDF follows the standard MITOU application format

### Missing sections

If certain sections are consistently missing:
- The PDF may use different section headers than expected
- Check the `SECTION_PATTERNS` in `extract-pdf-sections.py` to adjust the recognition patterns
- Some PDFs may combine multiple sections into one

### File encoding issues

All text files are saved with UTF-8 encoding to properly handle Japanese characters. If you encounter encoding issues when opening files, make sure your text editor is set to UTF-8.
