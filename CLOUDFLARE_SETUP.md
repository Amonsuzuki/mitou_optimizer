# Cloudflare KV Setup Guide

This document explains how to set up Cloudflare KV namespaces for the account registration and memory storage features.

## What is Cloudflare KV?

Cloudflare KV (Key-Value) is a globally distributed data store that allows you to store and retrieve data with low latency. It's perfect for storing user account information and application memories.

## Required Setup Steps

### 1. Create KV Namespaces

You need to create two KV namespaces:
- **USERS_KV**: Stores user account information and session data
- **MEMORIES_KV**: Stores user application memories/documents

Run these commands after logging in to Cloudflare:

```bash
# Login to Cloudflare
npx wrangler login

# Create production namespaces
npx wrangler kv:namespace create "USERS_KV"
npx wrangler kv:namespace create "MEMORIES_KV"

# Create preview namespaces (for local development)
npx wrangler kv:namespace create "USERS_KV" --preview
npx wrangler kv:namespace create "MEMORIES_KV" --preview
```

### 2. Update wrangler.jsonc

After creating the namespaces, Wrangler will output IDs like:

```
{ binding = "USERS_KV", id = "abc123def456" }
{ binding = "USERS_KV", preview_id = "xyz789uvw012" }
```

Copy these IDs into `wrangler.jsonc`:

```jsonc
{
  "name": "mitou",
  "main": "worker.ts",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    {
      "binding": "USERS_KV",
      "id": "abc123def456",          // Replace with your production ID
      "preview_id": "xyz789uvw012"    // Replace with your preview ID
    },
    {
      "binding": "MEMORIES_KV",
      "id": "ghi345jkl678",          // Replace with your production ID
      "preview_id": "mno901pqr234"    // Replace with your preview ID
    }
  ]
}
```

### 3. Deploy

After updating the configuration, deploy the worker:

```bash
npm run deploy
```

## Data Structure

### Users KV Store

Keys:
- `user:{username}` → User object (username, passwordHash, email, createdAt)
- `session:{token}` → Session object (userId, username, createdAt, expiresAt)

### Memories KV Store

Keys:
- `memory:{userId}:{memoryId}` → Memory object (userId, memoryId, sectionData, createdAt, updatedAt)
- `memorylist:{userId}` → Array of memory IDs for the user

## Security Considerations

1. **Password Hashing**: Passwords are hashed using SHA-256. For production, consider implementing a more secure hashing algorithm.

2. **Session Management**: Sessions expire after 7 days. The expiration is managed both in the session object and using KV TTL.

3. **CORS**: The API endpoints have CORS enabled to allow access from the same origin.

## Limitations and Tasks That Require Cloudflare Access

### Tasks I Cannot Execute (Require Your Access)

1. **Creating KV Namespaces**: I cannot create KV namespaces directly because this requires authentication to your Cloudflare account.

2. **Deploying to Production**: I cannot deploy the worker to your Cloudflare account.

3. **Managing Existing Data**: I cannot view, modify, or delete data in your KV stores.

### What I Have Implemented

✅ Complete TypeScript code for authentication endpoints
✅ User registration and login logic
✅ Memory storage and retrieval endpoints
✅ Frontend UI with login/register modals
✅ Session management with tokens
✅ Password hashing
✅ Configuration files with placeholder IDs

## Testing Locally

For local development, you can use Wrangler's dev mode which will create temporary KV namespaces:

```bash
npm run dev
```

Note: The temporary KV data will be lost when you stop the dev server.

## API Endpoints

### POST /api/register
Register a new user account.

**Request:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "username": "john"
}
```

### POST /api/login
Login with username and password.

**Request:**
```json
{
  "username": "john",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "username": "john"
}
```

### POST /api/memory
Save application memory (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "projectName": "My Project",
  "applicantName": "John Doe",
  "section1_1": "Overview text...",
  ...
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "xyz789...",
  "message": "Memory saved successfully"
}
```

### GET /api/memory
Retrieve memories (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `memoryId` (optional): Get specific memory by ID

**Response:**
```json
{
  "memories": [
    {
      "userId": "john",
      "memoryId": "xyz789",
      "sectionData": { ... },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/logout
Logout and invalidate session.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true
}
```

## Next Steps

1. Run `npx wrangler login` to authenticate with Cloudflare
2. Create the KV namespaces using the commands above
3. Update `wrangler.jsonc` with the actual namespace IDs
4. Deploy the worker with `npm run deploy`
5. Test the registration and login functionality
6. Verify that memories are being saved and retrieved correctly

## Troubleshooting

**Issue**: "KV namespace not found" error
**Solution**: Make sure you've created the KV namespaces and updated `wrangler.jsonc` with the correct IDs.

**Issue**: "Unauthorized" when trying to save
**Solution**: Make sure you're logged in and the session token is being sent in the Authorization header.

**Issue**: Local development can't access KV
**Solution**: Make sure you've created preview namespaces and updated the `preview_id` fields in `wrangler.jsonc`.
