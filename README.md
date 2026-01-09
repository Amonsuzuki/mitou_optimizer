# MITOU Optimizer - 未踏IT人材発掘・育成事業 申請書作成ツール

A web application hosted on Cloudflare Workers that helps users create application documents for the MITOU IT project in LaTeX/PDF format.

## Overview

This tool provides a user-friendly web interface for creating MITOU (未踏IT人材発掘・育成事業) project application documents. Users can fill in 8 required sections through a web form, and the backend converts the content to LaTeX format, which can then be compiled into a PDF.

## Features

- 📝 **Easy-to-use web form** with 8 sections matching MITOU requirements
- 🚀 **Hosted on Cloudflare Workers** for fast, global access
- 📄 **LaTeX generation** with proper escaping and formatting
- 💾 **Auto-save** functionality using localStorage
- 🔐 **Google Account Authentication** for secure login
- ☁️ **Cloud Draft Saving** - Save and sync your drafts across devices using Cloudflare KV
- 📱 **Responsive design** that works on desktop and mobile
- 🎨 **Clean, modern UI** for better user experience

## Sections

The application includes the following 8 sections as required by MITOU:

1. 何をつくるか (What will you create?)
2. 斬新さの主張、期待される効果など (Innovation claims and expected effects)
3. どんな出し方を考えているか (How do you plan to release it?)
4. 具体的な進め方と予算 (Specific approach and budget)
5. 私の腕前を証明できるもの (Evidence of your skills)
6. プロジェクト遂行にあたっての特記事項 (Special notes for project execution)
7. ソフトウェア作成以外の勉強、特技、生活、趣味など (Studies, skills, life, hobbies outside of software)
8. 将来のソフトウェア技術に対して思うこと・期待すること (Thoughts and expectations for future software technology)

## Project Structure

```
mitou_optimizer/
├── worker.ts           # Main Cloudflare Worker (backend + frontend)
├── wrangler.jsonc      # Cloudflare Workers configuration
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── *.pdf              # Example successful application documents
```

## Setup and Deployment

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Cloudflare account (for deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:8787`

### Regenerating Example Sections Data

If you add new PDF files to the `examples/open` or `examples/closed` directories, you can regenerate the extracted sections data:

```bash
python3 extract-pdf-sections.py
```

This will update the `extracted-sections.json` file with content from all PDFs.

### Deployment to Cloudflare Workers

1. Login to Cloudflare:
```bash
npx wrangler login
```

2. Configure Google OAuth (Required for authentication):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" and create an OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-worker-domain.workers.dev/api/auth/google/callback`
   - Copy the Client ID and Client Secret
   - Update the `worker.ts` file to use your Client ID (search for `YOUR_GOOGLE_CLIENT_ID`)
   - (Optional) Store the Client ID as a Cloudflare secret:
     ```bash
     echo "your-client-id-here" | npx wrangler secret put GOOGLE_CLIENT_ID
     echo "your-client-secret-here" | npx wrangler secret put GOOGLE_CLIENT_SECRET
     ```

3. Verify KV namespaces are configured in `wrangler.jsonc`:
   - `USERS_KV`: Stores user accounts and sessions
   - `MEMORIES_KV`: Stores draft data for each user

4. Deploy the worker:
```bash
npm run deploy
```

## Usage

### Creating Your Application

1. Access the web application
2. **(Optional)** Sign in with Google to enable cloud draft saving
3. Navigate to the "編集" (Editing) tab
4. Fill in all 8 sections with your project details
5. If logged in, click "Save" to save your draft to the cloud
6. Click "Download LaTeX" or "Download PDF" to generate and download the LaTeX file
7. Compile the LaTeX file using your preferred LaTeX compiler (e.g., platex, xelatex)
8. The generated PDF is ready for submission

### User Authentication & Cloud Storage

The application now supports Google Account authentication for enhanced functionality:

- **Sign in with Google**: Click the "Sign in with Google" button in the action bar
- **Automatic Draft Sync**: Your draft is automatically saved to Cloudflare KV storage when you click "Save"
- **Access Anywhere**: Sign in on any device to access your saved draft
- **Secure Storage**: All user data and drafts are stored securely in Cloudflare KV
- **Local Backup**: The application still uses localStorage for auto-save, even without login

**Note**: You need to configure Google OAuth credentials before deployment. See the Configuration section below.

### Viewing Example Applications

1. Navigate to the "過去採択者の申請書" (Successful Applicants' Examples) tab
2. Click on any of the 8 section buttons to view content from multiple successful applications
3. Compare how different applicants approached each section
4. Use the examples as inspiration for your own application (but write in your own words!)

### Compiling LaTeX to PDF

After downloading the `.tex` file, compile it using:

```bash
# Using platex (requires jarticle support)
platex mitou_application.tex
dvipdfmx mitou_application.dvi
```

**For detailed compilation instructions and troubleshooting, see [LATEX_GUIDE.md](LATEX_GUIDE.md)**

You can also use online services like [Overleaf](https://www.overleaf.com/) for easier compilation.

## Reference Documents

The repository includes successful application documents from 10 projects as references:
- **Closed directory**: 2 example PDFs (和田さん, 水野さん)
- **Open directory**: 8 example PDFs from various successful applicants

The application now extracts and organizes content from these PDFs by section, making it easy to compare approaches across different successful applications.

## Technologies Used

- **Cloudflare Workers**: Serverless platform for hosting
- **TypeScript**: Type-safe development
- **LaTeX**: Document generation format
- **HTML/CSS/JavaScript**: Frontend interface
- **Python/PyPDF2**: PDF text extraction for example documents

## Features Detail

### Section-Based Example Viewing (New!)
- Automatically extracts text from example PDF documents
- Organizes content by the 8 standard MITOU sections
- Allows side-by-side comparison of multiple successful applications
- Helps applicants understand what to write in each section

### LaTeX Generation
- Proper escaping of special LaTeX characters
- Japanese document support using jarticle class
- Clean formatting with appropriate spacing

### User Experience
- Form validation
- Auto-save to prevent data loss
- Clear button with confirmation
- Loading states and error handling
- Responsive design for all screen sizes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
