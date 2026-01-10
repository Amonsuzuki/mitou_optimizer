# Supabase Authentication Setup Guide

This guide explains how to set up Google OAuth authentication using Supabase for the MITOU Optimizer application.

## Prerequisites

- A Google Cloud account
- A Supabase account
- Access to Cloudflare Workers dashboard (for production deployment)

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Fill in the project details:
   - **Organization**: Select existing or create new
   - **Name**: e.g., "mitou-optimizer"
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region (e.g., Asia Pacific)
   - **Pricing Plan**: Free tier is sufficient for development
4. Click **Create new project**
5. Once created, go to **Project Settings** > **API**
6. Note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** (secret key, NOT the anon key)

⚠️ **Important**: Use the `service_role` key, NOT the `anon` key. The service_role key has elevated privileges and should be kept secret.

## Step 2: Configure Google OAuth in Google Cloud Console

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Configure the consent screen:
   - **User Type**: External
   - **App name**: e.g., "MITOU Optimizer"
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. Go to **Credentials** > **Create Credentials** > **OAuth client ID**
7. Configure the OAuth client:
   - **Application type**: Web application
   - **Name**: e.g., "MITOU Optimizer - Web Client"
   - **Authorized redirect URIs**: Add your Supabase callback URL:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```
     (Replace `your-project-ref` with your actual Supabase project reference)
8. Click **Create**
9. Note down:
   - **Client ID**
   - **Client Secret**

## Step 3: Configure Google Provider in Supabase

1. In Supabase Dashboard, go to **Authentication** > **Providers**
2. Find **Google** in the list and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Enter the credentials from Step 2:
   - **Client ID**: Paste the Google OAuth Client ID
   - **Client Secret**: Paste the Google OAuth Client Secret
5. Configure additional settings:
   - **Skip nonce checks**: OFF (default)
   - **Allow users without an email**: ON (optional)
6. Click **Save**

## Step 4: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Set the following:
   - **Site URL**: 
     - Development: `http://localhost:8787`
     - Production: Your deployed Cloudflare Worker URL (e.g., `https://mitou.your-domain.workers.dev`)
   - **Redirect URLs**: Add both:
     - Development: `http://localhost:8787/auth/callback`
     - Production: `https://mitou.your-domain.workers.dev/auth/callback`
3. Click **Save**

## Step 5: Configure Environment Variables

### For Local Development

1. Create a `.dev.vars` file in the project root (if it doesn't exist):
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=your-service-role-secret-key-here
   ```

3. **Never commit this file to Git** - it's already in `.gitignore`

### For Production (Cloudflare Workers)

1. Go to your Cloudflare Workers dashboard
2. Select your worker
3. Go to **Settings** > **Variables**
4. Add the following environment variables:
   - **Variable name**: `SUPABASE_URL`
     - **Value**: Your Supabase Project URL
   - **Variable name**: `SUPABASE_SECRET_KEY`
     - **Value**: Your Supabase service_role key
5. Click **Save and Deploy**

## Step 6: Set Up Database Tables

The application stores draft data and esquisse sessions in Supabase instead of Cloudflare KV. You need to create the DRAFTS and ESQUISSE_SESSIONS tables in your Supabase database.

1. In Supabase Dashboard, go to **SQL Editor**

2. Click **New query**

3. Copy the contents of `supabase-schema.sql` file from the project root

4. Paste it into the SQL editor

5. Click **Run** to execute the SQL commands

This will create:
- A `drafts` table to store user draft application data
- An `esquisse_sessions` table to store esquisse conversation sessions
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for optimal query performance
- Automatic timestamp updates

### Verify Table Creation

To verify the tables were created successfully:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see both `drafts` and `esquisse_sessions` tables in the list
3. Click on each to see the schema

## Step 7: Test the Authentication Flow

### Local Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:8787`

3. Click the "Sign in with Google" button

4. You should be redirected to Google's login page

5. After successful authentication, you should be redirected back to the application

6. Check that your user information is displayed in the top bar

### Troubleshooting

**Issue**: "Google OAuth not configured" error
- **Solution**: Make sure your `.dev.vars` file exists and contains the correct credentials

**Issue**: "Invalid redirect URI" error from Google
- **Solution**: Verify that the redirect URI in Google Cloud Console matches exactly: `https://your-project-ref.supabase.co/auth/v1/callback`

**Issue**: "Authentication failed: No code provided" after Google login
- **Solution**: 
  - This was fixed in the latest version - the app now handles both PKCE flow (with code) and implicit flow (with tokens in URL fragment)
  - Check that Google provider is enabled in Supabase
  - Verify that Client ID and Client Secret are correctly set in Supabase
  - Check browser console for detailed error messages
  - Clear your browser cache and localStorage, then try again

**Issue**: User is logged out immediately
- **Solution**: The JWT token might be invalid. Check that you're using the `service_role` key and not the `anon` key

## Security Notes

1. **Never expose the service_role key**: This key has administrative privileges and should only be used on the server side
2. **Use HTTPS in production**: Always use HTTPS for your production deployment
3. **Regularly rotate credentials**: Consider rotating your Google OAuth credentials and Supabase keys periodically
4. **Monitor authentication logs**: Check Supabase authentication logs for suspicious activity

## Architecture Overview

```
User Browser
    ↓ (Click "Sign in with Google")
    ↓
Cloudflare Worker (/api/auth/google/url)
    ↓ (Generates OAuth URL via Supabase)
    ↓
User redirected to Google
    ↓ (User authenticates)
    ↓
Google redirects to Supabase (/auth/v1/callback)
    ↓ (Supabase validates and creates session)
    ↓
Supabase redirects to App (/auth/callback)
    ↓ (Two possible flows:)
    ↓
    ├─→ PKCE Flow: Worker exchanges code for token
    │   ↓ (Server-side code exchange)
    │   ↓
    └─→ Implicit Flow: Tokens in URL fragment
        ↓ (Client-side JavaScript extracts tokens)
        ↓
User logged in with JWT token stored in localStorage
```

### Authentication Flow Details

The application supports two OAuth flows:

1. **PKCE Flow** (Preferred for security):
   - Supabase returns an authorization `code` as a query parameter
   - Server exchanges the code for tokens
   - Tokens are securely transmitted to the client

2. **Implicit Flow** (Default Supabase behavior):
   - Supabase returns tokens directly in the URL fragment (`#access_token=...`)
   - Client-side JavaScript extracts and stores tokens
   - No server-side code exchange needed

Both flows are supported, and the application automatically handles whichever flow Supabase uses.

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
