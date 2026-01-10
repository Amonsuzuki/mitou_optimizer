# MITOU Optimizer

A web application that helps users create MITOU IT project application documents in LaTeX/PDF format.

## Features

- Interactive form for filling out MITOU application sections
- LaTeX generation from form data
- Examples from successful applicants stored as text files
- Auto-save functionality with Google OAuth
- Multi-language support (Japanese/English)

## Extracted Sections

The `extracted_sections/` directory contains extracted text from successful MITOU application PDFs. These files are **permanently stored in the repository** and serve as examples for applicants.

### Structure

```
extracted_sections/
  section_1/
    和田さん_section_1.txt
    水野さん_section_1.txt
    松浦さん_section_1.txt
    ...
  section_2/
    ...
  ...
  section_8/
    ...
```

Each section directory contains text files from different applicants, organized by person name and section number.

### How It Works

1. **Source**: PDF files in `examples/open/` and `examples/closed/`
2. **Extraction**: Run `python3 extract-pdf-sections.py` to extract text from PDFs
3. **Storage**: Text files are saved in `extracted_sections/` (committed to repository)
4. **Build**: `generate-sections-data.js` reads text files and generates TypeScript module
5. **Worker**: The Cloudflare Worker imports the generated TypeScript module

### Regenerating Extracted Sections

To extract text from PDFs and update the text files:

```bash
python3 extract-pdf-sections.py
```

This will:
1. Extract text from PDFs in `examples/open/` and `examples/closed/`
2. Save each section as individual text files in `extracted_sections/`
3. Update `extracted-sections.json` for backward compatibility

After running the extraction, commit the updated text files to the repository.

### Building

The build process automatically generates `extracted-sections-data.ts` from the text files:

```bash
npm run generate-data  # Generate TypeScript data file from text files
npm run validate-data  # Validate the generated data structure
npm run build         # Validate data (runs validate-data)
npm run dev           # Development with auto-generation
npm run deploy        # Deploy with auto-generation and validation
```

The `extracted-sections-data.ts` file is **not committed** to the repository (it's in `.gitignore`) because it's automatically regenerated from the source text files during the build process.

## Development

```bash
# Install dependencies
npm install

# Generate data and start development server
npm run dev
```

The development server will:
1. Generate TypeScript data from text files
2. Start Wrangler dev server
3. Watch for changes and hot-reload

## Deployment

```bash
npm run deploy
```

This will:
1. Generate TypeScript data from text files
2. Validate the data structure
3. Deploy to Cloudflare Workers

## File Structure

- `worker.ts` - Main Cloudflare Worker that serves the web application
- `extract-pdf-sections.py` - Python script to extract text from PDFs into text files
- `generate-sections-data.js` - Node script to convert text files to TypeScript module
- `validate-data.js` - Node script to validate the generated data structure
- `extracted_sections/` - **Permanently stored** text files from successful applications
- `examples/` - Original PDF files from successful applications (referenced but displayed via text files)
- `extracted-sections-data.ts` - Generated TypeScript module (auto-generated, not committed)

## Why Text Files?

The previous approach stored extracted text only in `extracted-sections.json`. The new approach:

1. **Stores text files permanently** in the repository (`extracted_sections/`)
2. Text files are **easier to version control** and review in pull requests
3. Text files are **human-readable** and can be manually edited if needed
4. The worker reads from a **generated TypeScript module** that's built from the text files
5. This separation allows for **easier maintenance** and **better collaboration**

## Contributing

If you extract new PDF examples:

1. Add the PDF to `examples/open/` or `examples/closed/`
2. Run `python3 extract-pdf-sections.py` to extract the text
3. Review the generated text files in `extracted_sections/`
4. Commit both the PDF and the text files
5. The build system will automatically use the new text files
