# Hadi Snack - Setup Guide

This guide will help you set up the Hadi Snack POS system with the new Supabase database.

## Prerequisites

- Node.js installed
- Supabase account with the new project created
- Access to Supabase dashboard

## Step 1: Environment Variables

Create a `.env` file in the root directory with the following content:

```env
VITE_SUPABASE_URL=https://esyrycoegjqlakjunojd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tXT-Kg9GyY_gIKvJ7fJQiw_6rthi70Z
```

**Note:** If you encounter authentication issues, you may need to use the standard Supabase anon key (JWT format) instead of the publishable key. You can find the anon key in your Supabase project settings under API.

## Step 2: Database Setup

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20250110000000_initial_schema_secure.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

## Step 3: Create Your First Admin User

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add User** and create a new user with email and password
4. Copy the user's UUID (you'll see it in the users list)
5. Go to **SQL Editor** and run:

```sql
-- Replace 'your-user-uuid-here' with the actual UUID from step 3
-- Replace 'your-email@example.com' with the actual email
INSERT INTO admin_users (user_id, email, is_active)
VALUES ('your-user-uuid-here', 'your-email@example.com', true);
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the Development Server

```bash
npm run dev
```

## Step 6: Access the Application

- **Customer Menu**: Navigate to `http://localhost:5173` (or the port shown in terminal)
- **Admin Dashboard**: Navigate to `http://localhost:5173/admin`

## Security Features

The new database schema includes improved security:

- **Row Level Security (RLS)** enabled on all tables
- **Public read access** for products and categories (for menu display)
- **Authenticated users** can create orders
- **Admin-only access** for sensitive operations (product management, financial records, etc.)
- **Admin verification** through the `admin_users` table

## Default Settings

The migration creates default settings:
- Store Name: "Hadi Snack"
- Currency: LBP
- Tax Rate: 11.0%
- USD to LBP Rate: 90000

You can update these in the admin dashboard under Settings.

## Default Categories

The migration creates sample categories:
- Snacks
- Beverages
- Desserts
- Add-ons

You can add products and modify categories through the admin dashboard.

## Troubleshooting

### Authentication Issues

If you're having trouble logging in:
1. Verify the user exists in Supabase Authentication
2. Verify the user is added to the `admin_users` table
3. Check that `is_active` is set to `true` in the `admin_users` table

### Database Connection Issues

1. Verify your `.env` file has the correct credentials
2. Check that the Supabase project is active
3. Verify RLS policies are correctly set up

### Migration Errors

If you encounter errors during migration:
1. Check if tables already exist (you may need to drop them first)
2. Verify you have the correct permissions in Supabase
3. Check the Supabase logs for detailed error messages

## Next Steps

1. Add your products through the admin dashboard
2. Customize store settings
3. Set up inventory tracking
4. Configure financial categories
5. Add more admin users as needed

## Support

For issues or questions, check:
- Supabase documentation: https://supabase.com/docs
- Project README files for additional information

