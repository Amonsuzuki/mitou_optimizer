# Migration Guide: Cloudflare KV to Supabase DRAFTS Table

This guide explains the migration from Cloudflare KV storage to Supabase database for storing draft application data.

## What Changed?

### Before
- Draft application data was stored in **Cloudflare KV** namespace `MEMORIES_KV`
- Each user's draft was stored with key: `draft:${user.id}`
- Data was stored as a JSON string

### After
- Draft application data is now stored in **Supabase PostgreSQL database**
- A dedicated `drafts` table with proper schema and indexing
- Automatic Row Level Security (RLS) policies ensure users can only access their own data
- Better data integrity and querying capabilities

## Benefits of the Migration

1. **Data Integrity**: PostgreSQL ensures ACID compliance and data consistency
2. **Better Querying**: SQL queries enable complex data analysis if needed in the future
3. **Row Level Security**: Built-in security policies at the database level
4. **Automatic Backups**: Supabase handles database backups automatically
5. **Scalability**: PostgreSQL scales better for structured data than KV storage
6. **Unified Storage**: All user-related data now in one place (Supabase)

## For New Installations

If you're setting up the application for the first time:

1. Follow the regular setup instructions in `SUPABASE_SETUP.md`
2. Run the SQL schema from `supabase-schema.sql` in Supabase SQL Editor
3. Deploy the worker - it will automatically use Supabase for draft storage

No additional migration steps needed!

## For Existing Installations

If you already have the application running with Cloudflare KV:

### Step 1: Create the DRAFTS Table in Supabase

1. Log in to your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy the entire contents of `supabase-schema.sql`
5. Paste and run the SQL

### Step 2: Deploy the Updated Worker

```bash
npm run deploy
```

### Step 3: Data Migration (Optional)

**Important**: The old draft data in Cloudflare KV will **NOT** be automatically migrated. Users will need to re-enter their draft data or you can manually migrate it.

#### Option A: Let Users Re-enter Data (Recommended for small user base)
- Users will see empty forms when they log in
- They can fill in their data again
- Old KV data will remain but won't be accessed

#### Option B: Manual Migration (For larger user base)

If you have many users with saved drafts, you can manually migrate the data:

1. **Export data from Cloudflare KV**:
   - Use Cloudflare dashboard or API to list all keys with prefix `draft:`
   - Export the data to a JSON file

2. **Transform and Import to Supabase**:
   ```javascript
   // Example migration script (run locally with Node.js)
   const { createClient } = require('@supabase/supabase-js');
   
   const supabase = createClient(
     'YOUR_SUPABASE_URL',
     'YOUR_SERVICE_ROLE_KEY'
   );
   
   async function migrate() {
     // Read your exported KV data
     const kvData = require('./exported-kv-data.json');
     
     for (const item of kvData) {
       // Parse the KV value (stored as JSON string)
       const draft = JSON.parse(item.value);
       
       // Insert into Supabase
       const { error } = await supabase
         .from('drafts')
         .upsert({
           user_id: draft.userId,
           data: draft.data,
           updated_at: draft.updatedAt
         }, {
           onConflict: 'user_id'
         });
       
       if (error) {
         console.error('Failed to migrate draft:', draft.userId, error);
       } else {
         console.log('Migrated draft for user:', draft.userId);
       }
     }
   }
   
   migrate();
   ```

### Step 4: Clean Up (Optional)

After confirming all data is working in Supabase:

1. You can delete the old draft data from Cloudflare KV
2. You can optionally remove the `MEMORIES_KV` namespace from your Cloudflare Worker bindings (though it's safe to keep it)

## Rollback Instructions

If you need to rollback to the KV-based storage:

1. Check out the previous version of the code:
   ```bash
   git checkout <previous-commit-hash>
   ```

2. Deploy the previous version:
   ```bash
   npm run deploy
   ```

Note: The Supabase DRAFTS table can remain - it won't interfere with the KV storage.

## Troubleshooting

### "Failed to save draft" Error

**Possible causes**:
1. DRAFTS table not created in Supabase
   - **Solution**: Run the SQL schema from `supabase-schema.sql`

2. Row Level Security blocking access
   - **Solution**: Ensure RLS policies are created (included in `supabase-schema.sql`)

3. Invalid Supabase credentials
   - **Solution**: Check that `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are correctly set

### "Failed to load draft" Error

**Possible causes**:
1. No draft exists for the user (this is normal for new users)
   - The API will return `{ data: null }` which is expected behavior

2. Database connection issue
   - **Solution**: Verify Supabase is operational and credentials are correct

### Data Not Migrating from KV

If users still see old data:
- The new code does NOT read from KV anymore
- You need to manually migrate data (see Option B above)
- Or ask users to re-enter their information

## Support

For issues or questions:
1. Check the error logs in Cloudflare Workers dashboard
2. Check Supabase logs in the Supabase dashboard
3. Review this guide and `SUPABASE_SETUP.md`
4. Open an issue on the project repository

## Technical Details

### Database Schema

The `drafts` table has the following structure:

```sql
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT drafts_user_id_unique UNIQUE (user_id)
);
```

### API Changes

The API endpoints remain the same:
- `POST /api/drafts/save` - Save draft
- `GET /api/drafts/load` - Load draft

Internal implementation changed from:
```typescript
// Old: Cloudflare KV
await env.MEMORIES_KV.put(`draft:${user.id}`, JSON.stringify(draft));
const data = await env.MEMORIES_KV.get(`draft:${user.id}`);
```

To:
```typescript
// New: Supabase
await supabase.from('drafts').upsert({ user_id: user.id, data: draft.data });
const { data } = await supabase.from('drafts').select('*').eq('user_id', user.id);
```

### Performance Considerations

- **Latency**: Supabase database queries may have slightly higher latency than KV reads, but the difference is negligible for this use case
- **Caching**: The application still uses localStorage for client-side caching, so most operations don't hit the database
- **Concurrent Users**: PostgreSQL handles concurrent writes better than KV for structured data

## Conclusion

This migration improves the application's data storage architecture while maintaining the same user experience. The benefits of using Supabase's PostgreSQL database outweigh the minor increase in latency for draft operations.
