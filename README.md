# MITOU Optimizer - 未踏IT人材発掘・育成事業 申請書作成ツール

A web application hosted on Cloudflare Workers that helps users create application documents for the MITOU IT project in LaTeX/PDF format.

## Overview

This tool provides a user-friendly web interface for creating MITOU (未踏IT人材発掘・育成事業) project application documents. Users can fill in 8 required sections through a web form, and the backend converts the content to LaTeX format, which can then be compiled into a PDF.

## Features

- 📝 **Easy-to-use web form** with 8 sections matching MITOU requirements
- 🚀 **Hosted on Cloudflare Workers** for fast, global access
- 📄 **LaTeX generation** with proper escaping and formatting
- 💾 **Auto-save** functionality using localStorage
- 👤 **Account registration and login** for cloud-based memory storage
- ☁️ **Cloud memory storage** using Cloudflare KV to save your application data
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

### Deployment to Cloudflare Workers

1. Login to Cloudflare:
```bash
npx wrangler login
```

2. Create KV namespaces for storing user data and memories:
```bash
# Create production KV namespaces
npx wrangler kv:namespace create "USERS_KV"
npx wrangler kv:namespace create "MEMORIES_KV"

# Create preview KV namespaces for development
npx wrangler kv:namespace create "USERS_KV" --preview
npx wrangler kv:namespace create "MEMORIES_KV" --preview
```

3. Update `wrangler.jsonc` with the KV namespace IDs from the output above:
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "USERS_KV",
      "id": "your-production-id-here",
      "preview_id": "your-preview-id-here"
    },
    {
      "binding": "MEMORIES_KV",
      "id": "your-production-id-here",
      "preview_id": "your-preview-id-here"
    }
  ]
}
```

4. Deploy the worker:
```bash
npm run deploy
```

**Note:** If you cannot create KV namespaces (e.g., due to account limitations or permissions), please inform the repository owner. The KV setup is required for account registration and memory storage features to work in production.

## Usage

### Account Registration and Cloud Storage

1. Click the "Login" button in the top navigation bar
2. Click "Don't have an account? Register" to create a new account
3. Fill in your username, email, and password
4. After registration, login with your credentials
5. Once logged in, the "Save" button becomes active
6. Click "Save" to store your application data to the cloud
7. Your data is securely stored in Cloudflare KV and can be accessed from any device

### Creating Application Documents

1. Access the web application
2. Fill in all 8 sections with your project details
3. Optionally add your name
4. Click "LaTeX生成・ダウンロード" to generate and download the LaTeX file
5. Compile the LaTeX file using your preferred LaTeX compiler (e.g., platex, xelatex)
6. The generated PDF is ready for submission

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

The repository includes two successful application documents as references:
- `wada_未踏一次審査資料.pdf`
- `水野竣介_提案プロジェクト詳細資料.pdf`

## Technologies Used

- **Cloudflare Workers**: Serverless platform for hosting
- **TypeScript**: Type-safe development
- **LaTeX**: Document generation format
- **HTML/CSS/JavaScript**: Frontend interface

## Features Detail

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
