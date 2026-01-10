# MITOU Optimizer

A web application that helps users create MITOU IT project application documents in LaTeX/PDF format.

## Features

- Interactive form for creating MITOU project applications
- Google OAuth authentication for saving drafts
- PDF generation in LaTeX format
- Auto-save functionality for logged-in users

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Google Cloud Platform account for OAuth setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **Google Identity** services
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   - For local development: `http://localhost:8787/api/auth/google/callback`
   - For production: `https://your-domain.workers.dev/api/auth/google/callback`
8. Copy the **Client ID** and **Client Secret**

### Environment Configuration

For **local development**, create a `.dev.vars` file in the root directory:

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and add your Google OAuth credentials:

```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

For **production deployment**, set the secrets using Wrangler:

```bash
# Set Google Client ID
npx wrangler secret put GOOGLE_CLIENT_ID

# Set Google Client Secret
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Make sure you've set the required secrets before deploying.

## Project Structure

- `worker.ts` - Main Cloudflare Worker with API endpoints and frontend
- `wrangler.jsonc` - Cloudflare Workers configuration
- `extracted-sections.json` - Document sections data
- `deadline-config.json` - Deadline configuration

## KV Namespaces

The application uses two Cloudflare KV namespaces:

- `USERS_KV` - Stores user data and sessions
- `MEMORIES_KV` - Stores draft documents

## License

MIT
