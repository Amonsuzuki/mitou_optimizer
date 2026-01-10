# MITOU Optimizer

A web application to help users create MITOU IT project application documents in LaTeX/PDF format.

## Overview

This Cloudflare Worker serves a web interface that allows applicants to:
- Fill in all required sections for a MITOU project proposal
- View examples from successful past applications
- Download the completed application as LaTeX or PDF

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

## KV Namespaces

The worker uses two KV namespaces:
- `USERS_KV` - Stores user authentication data
- `MEMORIES_KV` - Stores draft application data

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
