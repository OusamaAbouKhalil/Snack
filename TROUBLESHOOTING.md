# Troubleshooting Guide - Hadi Snack

## Error: 404 - Failed to load resource

### Problem
You're seeing errors like:
```
Failed to load resource: the server responded with a status of 404
Categories query error
Error fetching data
```

### Solution

**The tables don't exist in your Supabase database yet!** You need to run the migration.

#### Step 1: Run the Quick Setup Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `esyrycoegjqlakjunojd`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `QUICK_SETUP.sql` from this project
6. Copy the **entire contents** of the file
7. Paste into the SQL Editor
8. Click **Run** (or press Ctrl+Enter)

#### Step 2: Verify Tables Were Created

After running the script, verify by running this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- categories
- products
- orders
- order_items
- customers
- inventory
- settings
- admin_users
- expense_categories
- financial_records

#### Step 3: Check Default Data

```sql
SELECT * FROM categories;
SELECT * FROM settings;
```

You should see default categories and settings.

## Error: Authentication Failed

### Problem
The Supabase key format `sb_publishable_` is unusual. Standard Supabase uses JWT tokens.

### Solution

1. Go to Supabase Dashboard → Your Project → **Settings** → **API**
2. Find the **anon/public** key (it should be a JWT token starting with `eyJ...`)
3. Update your `.env` file:

```env
VITE_SUPABASE_URL=https://esyrycoegjqlakjunojd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual JWT key)
```

4. Restart your development server:
```bash
npm run dev
```

## Error: RLS Policy Violation

### Problem
You can't read/write data even though tables exist.

### Solution

The RLS policies should be created by the migration. Verify they exist:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

If policies are missing, re-run the `QUICK_SETUP.sql` script.

## Error: Cannot Create Admin User

### Problem
You can't log into the admin panel.

### Solution

1. **Create a user in Supabase Auth:**
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Click **Add User** → **Create new user**
   - Enter email and password
   - Copy the User UUID

2. **Add user to admin_users table:**
   ```sql
   INSERT INTO admin_users (user_id, email, is_active)
   VALUES ('paste-user-uuid-here', 'your-email@example.com', true);
   ```

3. **Verify admin status:**
   ```sql
   SELECT * FROM admin_users WHERE email = 'your-email@example.com';
   ```

## Environment Variables Not Loading

### Problem
The app still uses old credentials or can't find environment variables.

### Solution

1. **Create `.env` file in the root directory** (same level as `package.json`):
   ```env
   VITE_SUPABASE_URL=https://esyrycoegjqlakjunojd.supabase.co
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```

2. **Restart the dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

3. **Verify in browser console:**
   - Open browser DevTools (F12)
   - Check Console tab
   - You should see: `🔧 Supabase configured: ...`

## Still Having Issues?

### Check Supabase Project Status

1. Verify your project is active in Supabase Dashboard
2. Check if you have the correct project URL
3. Verify API keys are correct in Settings → API

### Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for error messages
4. Check **Network** tab for failed requests

### Common Issues

- **CORS errors**: Shouldn't happen with Supabase, but check if project is paused
- **Rate limiting**: Free tier has limits, wait a few minutes
- **Wrong project**: Make sure you're using the correct Supabase URL

### Get Help

1. Check the error message in browser console
2. Check Supabase Dashboard → **Logs** for server-side errors
3. Verify all steps in `SETUP_GUIDE.md` were completed

