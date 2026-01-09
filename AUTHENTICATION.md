# Authentication & Cloud Storage Implementation

## Overview

This document describes the authentication and cloud storage implementation for the MITOU Optimizer application.

## Features

### 1. Google OAuth Authentication
- Users can sign in with their Google account
- Secure OAuth 2.0 flow implementation
- Session management with 30-day expiration
- Automatic session verification on page load

### 2. Cloud Draft Storage
- Drafts are saved to Cloudflare KV storage
- Each user's draft is stored separately under their user ID
- Drafts can be loaded from any device after authentication
- Automatic sync between localStorage and cloud storage

### 3. User Management
- User profiles stored in `USERS_KV` binding
- Session tokens stored with expiration
- Secure session verification for all authenticated endpoints

## Architecture

### Data Storage

#### USERS_KV Namespace
Stores user accounts and session data:
```
user:{userId} -> User object (JSON)
session:{token} -> Session object (JSON)
oauth_state:{state} -> timestamp (for CSRF protection)
```

#### MEMORIES_KV Namespace
Stores draft data for each user:
```
draft:{userId} -> Draft object (JSON)
```

### Data Structures

#### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLogin: string;
}
```

#### Session
```typescript
interface Session {
  userId: string;
  expiresAt: number;
}
```

#### Draft
```typescript
interface Draft {
  userId: string;
  data: SectionData;
  updatedAt: string;
}
```

## API Endpoints

### Authentication

#### `GET /api/auth/google/url`
Returns the Google OAuth authorization URL.
- **Response**: `{ authUrl: string }`

#### `POST /api/auth/google/callback`
Handles the OAuth callback and creates a session.
- **Request**: `{ code: string, state: string }`
- **Response**: `{ token: string, user: User }`

#### `GET /api/auth/verify`
Verifies the current session token.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `User` object

#### `POST /api/auth/logout`
Invalidates the current session.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true }`

### Draft Management

#### `POST /api/drafts/save`
Saves the current draft to cloud storage.
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `SectionData` object
- **Response**: `{ success: true }`

#### `GET /api/drafts/load`
Loads the user's draft from cloud storage.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `Draft` object or `{ data: null }`

## Security Considerations

### OAuth State Validation
- Random state parameter generated for each OAuth flow
- State stored in KV with 10-minute expiration
- State verified on callback to prevent CSRF attacks

### Session Management
- Session tokens are cryptographically random (256-bit)
- Sessions expire after 30 days
- Expired sessions are automatically deleted
- Token validation on every authenticated request

### Data Isolation
- Each user's data is stored under their unique user ID
- No cross-user data access possible
- Session verification required for all data operations

## Completing the Google OAuth Implementation

The current implementation includes a mock Google OAuth flow for demonstration purposes. To complete the implementation:

### 1. Set up Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `https://your-worker-domain.workers.dev/api/auth/google/callback`
7. Copy the Client ID and Client Secret

### 2. Update the Code

In `worker.ts`, locate the `GET /api/auth/google/url` endpoint and update:
```typescript
const clientId = env.GOOGLE_CLIENT_ID; // Use environment variable
```

Add Cloudflare secrets:
```bash
echo "your-client-id-here" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "your-client-secret-here" | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### 3. Implement Token Exchange

In the `POST /api/auth/google/callback` endpoint, replace the mock implementation with:

```typescript
// Exchange authorization code for access token
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    code: code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${url.origin}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  }),
});

const tokens = await tokenResponse.json();

// Get user info
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`,
  },
});

const userInfo = await userInfoResponse.json();
```

### 4. Update Environment Variables

Add to `wrangler.jsonc`:
```json
{
  "vars": {
    "GOOGLE_CLIENT_ID": "your-client-id-here"
  }
}
```

And use secrets for sensitive data:
```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## Testing

### Manual Testing Checklist

1. **Authentication Flow**
   - [ ] Click "Sign in with Google" button
   - [ ] Verify redirect to Google OAuth page
   - [ ] Complete Google sign-in
   - [ ] Verify redirect back to application
   - [ ] Verify user info displayed in UI
   - [ ] Verify "Save" button is enabled

2. **Draft Management**
   - [ ] Fill in form fields
   - [ ] Click "Save" button
   - [ ] Verify success message
   - [ ] Reload page
   - [ ] Verify draft is loaded from cloud
   - [ ] Sign out and sign in again
   - [ ] Verify draft persists across sessions

3. **Session Management**
   - [ ] Verify session persists on page reload
   - [ ] Test logout functionality
   - [ ] Verify data is cleared after logout

## Future Enhancements

1. **Multi-Draft Support**: Allow users to save multiple drafts with different names
2. **Draft History**: Keep a version history of drafts
3. **Sharing**: Allow users to share drafts with project managers
4. **Export**: Export drafts as JSON for backup
5. **Import**: Import previously exported drafts
6. **Collaboration**: Real-time collaboration on drafts
