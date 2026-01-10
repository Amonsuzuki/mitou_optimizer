# MITOU Optimizer

未踏IT人材発掘・育成事業の申請書作成ツール

A tool to help create application documents for the MITOU IT Personnel Discovery and Development Project.

## Features

- Web-based form for creating MITOU application documents
- LaTeX document generation
- Google authentication via Supabase
- Draft saving functionality
- Example documents from successful applicants

## Setup

### 1. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com/dashboard)
2. Go to **Authentication** > **Providers**
3. Enable **Google** provider:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to **Credentials** and create an OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     - For development: `https://your-project-ref.supabase.co/auth/v1/callback`
     - For production: `https://your-domain.workers.dev/api/auth/callback`
   - Copy the Client ID and Client Secret
   - Paste them into Supabase Google provider settings
4. Go to **Settings** > **API**
5. Copy the following values:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)

### 2. Cloudflare Workers Setup

#### Local Development

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Create a \`.dev.vars\` file (copy from \`.dev.vars.example\`):
\`\`\`bash
cp .dev.vars.example .dev.vars
\`\`\`

3. Edit \`.dev.vars\` and add your Supabase credentials:
\`\`\`
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

The application will be available at \`http://localhost:8787\`

#### Production Deployment

1. Set environment variables in Cloudflare Workers:
\`\`\`bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
\`\`\`

Or set them in the Cloudflare Dashboard:
- Go to your Worker > Settings > Variables
- Add the environment variables:
  - \`SUPABASE_URL\`: Your Supabase project URL
  - \`SUPABASE_ANON_KEY\`: Your Supabase anon/public key

2. Deploy to Cloudflare Workers:
\`\`\`bash
npm run deploy
\`\`\`

### 3. Configure Google OAuth Redirect URIs

After deployment, add your Cloudflare Workers URL to the authorized redirect URIs:

1. In Supabase, go to **Authentication** > **Providers** > **Google**
2. Add your production URL: \`https://your-worker.your-subdomain.workers.dev/api/auth/callback\`
3. Save the settings

## Development

### Generate sections data
\`\`\`bash
npm run generate-data
\`\`\`

### Validate data
\`\`\`bash
npm run validate-data
\`\`\`

### Run development server
\`\`\`bash
npm run dev
\`\`\`

### Deploy to production
\`\`\`bash
npm run deploy
\`\`\`

## Authentication Flow

1. User clicks "Sign in with Google"
2. Frontend calls \`/api/auth/google/url\` to get the OAuth URL
3. User is redirected to Google for authentication
4. Google redirects back to \`/api/auth/callback\` with auth code
5. Backend exchanges the code for a session via Supabase
6. User is redirected to the main page with access token
7. Frontend exchanges the token with backend to get user info
8. User can now save drafts

## Architecture

- **Frontend**: Pure HTML/CSS/JavaScript embedded in the Worker
- **Backend**: Cloudflare Workers with TypeScript
- **Authentication**: Supabase Auth with Google OAuth
- **Storage**: Cloudflare KV for user data and drafts
- **LaTeX Generation**: Server-side in the Worker

## License

MIT
