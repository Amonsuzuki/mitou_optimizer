# MITOU Optimizer

A web application to help users create MITOU IT project application documents in LaTeX/PDF format.

## Overview

This Cloudflare Worker serves a web interface that allows applicants to:
- Use the **Esquisse** (思考の過程) feature to develop ideas through AI-guided conversation
- Fill in all required sections for a MITOU project proposal
- View examples from successful past applications
- Download the completed application as LaTeX or PDF

### Esquisse Feature

The Esquisse feature helps users develop and articulate their project ideas through an interactive AI conversation. Users can choose between two approaches:

- **順算 (Forward)**: Starting from intrinsic motivation
  - Explore what you want to create
  - Identify the meaning and impact
  - Determine whose problems you're solving
  
- **逆算 (Backward)**: Starting from an issue/problem
  - Identify a problem to solve
  - Understand why it hasn't been solved yet
  - Articulate why you're the right person to solve it

After completing the conversation, users can click "資料に反映する" to automatically populate the application form with content generated from their responses.

## Development

### Prerequisites

- Node.js (v18 or later)
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
   
   The `postinstall` script will automatically generate the required `extracted-sections-data.ts` file from the section text files.

### Build Process

The application uses a generated TypeScript file (`extracted-sections-data.ts`) that contains data extracted from PDF examples. This file is:
- Generated from text files in the `extracted_sections/` directory
- Listed in `.gitignore` (not tracked by git)
- Automatically regenerated when needed

To manually generate this file:
```bash
npm run generate-data
```

### Available Scripts

- `npm run generate-data` - Generate the extracted-sections-data.ts file
- `npm run validate-data` - Validate the generated data
- `npm run build` - Generate data and validate it
- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers

### Local Development

Start the development server:
```bash
npm run dev
```

The server will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Architecture

- **worker.ts** - Main Cloudflare Worker entry point
- **generate-sections-data.js** - Script to generate TypeScript data from extracted sections
- **extracted_sections/** - Directory containing text files extracted from PDF examples
- **extracted-sections-data.ts** - Generated TypeScript module (not in git)

## Environment Variables

Configure these in Cloudflare Workers dashboard or `.dev.vars` file:

- `SUPABASE_URL` - Supabase project URL (required for authentication)
- `SUPABASE_SECRET_KEY` - Supabase service_role key (required for authentication, NOT the anon key)
- `OPENROUTER_API_KEY` - OpenRouter API key (required for Esquisse AI feature)

### Setting up OpenRouter

1. **Get an API Key**
   - Go to https://openrouter.ai/
   - Sign up or log in
   - Navigate to API Keys and create a new key
   
2. **Configure the API Key**
   - For local development, add `OPENROUTER_API_KEY=your-key-here` to `.dev.vars`
   - For production, set this in Cloudflare Workers dashboard under Settings > Variables

The Esquisse feature uses the `google/gemma-3-27b-it:free` model which is free to use.

### Setting up Supabase Authentication

1. **Create a Supabase Project**
   - Go to https://supabase.com/ and create a new project
   - Note down your Project URL and service_role key from Project Settings > API

2. **Configure Google OAuth in Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one
   - Enable the Google OAuth consent screen
   - Create OAuth 2.0 Client ID credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Note down the Client ID and Client Secret

3. **Configure Google Provider in Supabase**
   - In Supabase Dashboard, go to Authentication > Providers
   - Enable Google provider
   - Enter your Google OAuth Client ID and Client Secret
   - Save the configuration

4. **Configure Redirect URLs in Supabase**
   - In Supabase Dashboard, go to Authentication > URL Configuration
   - Add your application URL to Site URL (e.g., `http://localhost:8787` for development)
   - Add callback URL to Redirect URLs (e.g., `http://localhost:8787/auth/callback`)

5. **Set Environment Variables**
   - For local development, create a `.dev.vars` file (copy from `.dev.vars.example`)
   - For production, set these in Cloudflare Workers dashboard under Settings > Variables

## Storage

The application uses different storage solutions for different data:

### Supabase Database
- **DRAFTS table** - Stores user draft application data with PostgreSQL for better data integrity and querying capabilities
- **ESQUISSE_SESSIONS table** - Stores esquisse conversation sessions (replaces the temporary KV storage with persistent database storage)
- **Authentication** - Manages user sessions and Google OAuth

### Cloudflare KV Namespaces
- `USERS_KV` - Caches user authentication data for quick access (optional performance optimization)

## Troubleshooting

### Build Error: "Could not resolve './extracted-sections-data'"

This means the generated data file is missing. Run:
```bash
npm run generate-data
```

Or simply run the build command which will automatically generate it:
```bash
npm run build
```

## License

MIT
