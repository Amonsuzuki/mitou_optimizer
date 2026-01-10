# MITOU Optimizer

A web application that helps users create MITOU IT project application documents in LaTeX/PDF format.

## Features

- Interactive form for filling out MITOU application sections
- LaTeX generation from form data
- Examples from successful applicants stored as text files
- Auto-save functionality with Google OAuth
- Multi-language support (Japanese/English)

## Extracted Sections

The `extracted_sections/` directory contains extracted text from successful MITOU application PDFs. These files are organized by section (section_1 through section_8) and serve as examples for applicants.

### Structure

```
extracted_sections/
  section_1/
    和田さん_section_1.txt
    水野さん_section_1.txt
    ...
  section_2/
    ...
  ...
  section_8/
    ...
```

### Regenerating Extracted Sections

To extract text from PDFs and update the text files:

```bash
python3 extract-pdf-sections.py
```

This will:
1. Extract text from PDFs in `examples/open/` and `examples/closed/`
2. Save each section as individual text files in `extracted_sections/`
3. Update `extracted-sections.json` for backward compatibility

### Building

The build process automatically generates `extracted-sections-data.ts` from the text files:

```bash
npm run generate-data  # Generate TypeScript data file
npm run dev           # Development with auto-generation
npm run deploy        # Deploy with auto-generation
```

## Development

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run deploy
```

## File Structure

- `worker.ts` - Main Cloudflare Worker
- `extract-pdf-sections.py` - Python script to extract text from PDFs
- `generate-sections-data.js` - Node script to convert text files to TypeScript module
- `extracted_sections/` - Extracted text files from successful applications
- `examples/` - Original PDF files from successful applications
