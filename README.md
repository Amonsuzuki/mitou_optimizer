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

## Troubleshooting

### "Google OAuth not configured" Error

If you see this error when trying to log in:

1. **Check environment variables**: Make sure you have created a `.dev.vars` file (for local development) or set the secrets in Cloudflare (for production)
2. **Verify credentials**: Ensure your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
3. **Check redirect URI**: Verify that the redirect URI in your Google Cloud Console matches your application URL
4. **Restart the dev server**: After adding `.dev.vars`, restart your development server with `npm run dev`

### OAuth Callback Errors

If you're redirected back to the app but login fails:

1. **Check redirect URI configuration**: The redirect URI must exactly match what's configured in Google Cloud Console
2. **Verify client secret**: Make sure the `GOOGLE_CLIENT_SECRET` is correctly set
3. **Check browser console**: Look for detailed error messages in the browser developer console
4. **Review worker logs**: Use `wrangler tail` to see real-time logs from your Cloudflare Worker

### Testing OAuth Flow

To test the OAuth flow locally:

1. Start the development server: `npm run dev`
2. Open `http://localhost:8787` in your browser
3. Click the "Login with Google" button
4. You should be redirected to Google's login page
5. After authorizing, you should be redirected back and logged in
6. Your user info should appear in the top-right corner

## License

MIT
