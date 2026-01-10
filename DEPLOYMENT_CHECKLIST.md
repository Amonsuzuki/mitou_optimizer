# Deployment Checklist

Use this checklist to ensure successful deployment of the draft storage migration to Supabase.

## Pre-Deployment Checklist

### 1. Code Validation ✅
- [x] Build succeeds: `npm run build`
- [x] Wrangler dry-run succeeds: `wrangler deploy --dry-run`
- [x] Migration validation passes: `npm run validate-migration`
- [x] No security vulnerabilities: CodeQL scan passed
- [x] TypeScript compiles without errors

### 2. Documentation ✅
- [x] Database schema created: `supabase-schema.sql`
- [x] Setup guide updated: `SUPABASE_SETUP.md`
- [x] Migration guide created: `MIGRATION_GUIDE.md`
- [x] Changes documented: `CHANGES_SUMMARY.md`
- [x] README updated with new storage info

## Deployment Steps

### Step 1: Supabase Database Setup ⏳

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Open SQL Editor**
   - Navigate to: SQL Editor (left sidebar)
   - Click: New query

3. **Create DRAFTS Table**
   - Copy entire contents of `supabase-schema.sql`
   - Paste into SQL editor
   - Click: Run (or press Ctrl+Enter)

4. **Verify Table Creation**
   - Go to: Table Editor
   - Confirm: `drafts` table exists
   - Check: Columns are: id, user_id, data, updated_at, created_at

5. **Verify RLS Policies**
   - In Table Editor, click on `drafts` table
   - Click: Policies tab
   - Confirm 4 policies exist:
     - Users can view their own drafts
     - Users can insert their own drafts
     - Users can update their own drafts
     - Users can delete their own drafts

### Step 2: Environment Variables ⏳

**Production (Cloudflare Workers)**

1. Go to Cloudflare Workers dashboard
2. Select your worker
3. Navigate to: Settings > Variables
4. Verify these variables are set:
   - [x] `SUPABASE_URL` (e.g., https://xxxxx.supabase.co)
   - [x] `SUPABASE_SECRET_KEY` (service_role key)

**Local Development (Optional)**

1. Check `.dev.vars` file exists in project root
2. Verify it contains:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=your-service-role-key
   ```

### Step 3: Deploy to Production ⏳

```bash
# From project root
npm run deploy
```

Expected output:
```
✓ Generated extracted-sections-data.ts
✓ Validation passed!
Total Upload: ~700 KiB / gzip: ~140 KiB
✨ Successfully published your script
```

### Step 4: Verify Deployment ⏳

1. **Check Deployment Status**
   - Go to Cloudflare Workers dashboard
   - Confirm latest deployment timestamp matches current time

2. **Verify KV Bindings**
   - Settings > Variables
   - Confirm bindings exist for:
     - USERS_KV
     - MEMORIES_KV (deprecated but kept)

## Post-Deployment Testing

### Test 1: Authentication ⏳

1. Open your deployed worker URL
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify: User info appears in top-right corner

**Expected Result**: Login successful, user avatar/email displayed

### Test 2: Draft Save ⏳

1. After logging in, fill in some form fields:
   - Project Name: "Test Project"
   - Applicant Name: "Test User"
   - Section 1.1: "Test content"

2. Click "Save" button

3. Look for success toast notification

4. Check browser console (F12) for any errors

**Expected Result**: 
- Success toast: "下書きを保存しました。/ Draft saved successfully."
- No errors in console

### Test 3: Draft Load ⏳

1. After saving, refresh the page (F5)

2. Log in again if needed

3. Wait for page to load completely

4. Check if form fields are populated with saved data

**Expected Result**: All previously saved fields are restored

### Test 4: Draft Update ⏳

1. Modify some existing draft data

2. Click "Save" again

3. Refresh page

4. Verify changes persisted

**Expected Result**: Updated data is saved and restored

### Test 5: Verify in Supabase ⏳

1. Go to Supabase Dashboard > Table Editor

2. Click on `drafts` table

3. Verify you see row(s) with:
   - `user_id` matching your Google user ID
   - `data` column contains JSONB with form data
   - `updated_at` timestamp is recent

**Expected Result**: Draft data visible in Supabase database

## Troubleshooting

### Issue: "Failed to save draft"

**Possible Causes:**
1. DRAFTS table not created in Supabase
2. RLS policies blocking access
3. Invalid Supabase credentials
4. Network issues

**Solutions:**
1. Re-run `supabase-schema.sql` in SQL Editor
2. Verify RLS policies exist (see Step 1.5 above)
3. Check environment variables in Cloudflare Workers
4. Check Supabase dashboard for service status

### Issue: "Failed to load draft"

**Possible Causes:**
1. No draft exists (normal for first-time users)
2. Database connection issue
3. Wrong user_id lookup

**Solutions:**
1. This is normal - save a draft first
2. Check Supabase service status
3. Verify authentication is working

### Issue: Old data not loading

**Expected Behavior:**
- Old KV data is NOT migrated automatically
- Users will see empty forms

**Solutions:**
- See `MIGRATION_GUIDE.md` for data migration options
- Ask users to re-enter data (recommended)
- Or perform manual data migration (advanced)

## Rollback Plan

If issues arise and rollback is needed:

```bash
# Checkout previous commit (before this PR)
git checkout <previous-commit-hash>

# Deploy old version
npm run deploy
```

**Note:** Supabase DRAFTS table can remain - it won't interfere

## Monitoring

### Key Metrics to Watch

1. **Error Rate**
   - Cloudflare Workers dashboard > Metrics
   - Look for 500 errors on `/api/drafts/*` endpoints

2. **Request Latency**
   - Compare draft save/load latency before and after
   - Slight increase (<100ms) is acceptable

3. **User Reports**
   - Monitor for user complaints about draft functionality
   - Check if data is being lost

### Logs to Check

1. **Cloudflare Workers Logs**
   ```
   wrangler tail
   ```
   Watch for errors related to:
   - Supabase connection
   - Draft save/load operations

2. **Supabase Logs**
   - Supabase Dashboard > Logs
   - Filter for errors on `drafts` table

## Success Criteria ✅

Deployment is successful when:

- [x] Code deployed without errors
- [ ] Authentication flow works
- [ ] Draft save functionality works
- [ ] Draft load functionality works
- [ ] No error spikes in monitoring
- [ ] Data persists across sessions
- [ ] Database queries succeed in Supabase

## Documentation References

- **Setup**: `SUPABASE_SETUP.md`
- **Migration**: `MIGRATION_GUIDE.md`
- **Changes**: `CHANGES_SUMMARY.md`
- **Schema**: `supabase-schema.sql`

## Support

If you encounter issues:

1. Check this deployment checklist
2. Review troubleshooting section above
3. Check documentation files listed above
4. Review Cloudflare and Supabase logs
5. Open an issue on the repository

---

**Last Updated**: 2026-01-10
**Version**: 1.0 (Initial Migration)
