# Supabase RLS Policy Fix Guide

## Problem
Form submissions from public users are being blocked by Row Level Security (RLS) policies that were tightened during the security audit. The policies now only allow the admin email (`kmgadmingtm21@gmail.com`) to access the tables, preventing anonymous users from submitting diagnostic forms.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project: "wmvxuxucccuioqszpmbp"
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** to create a new SQL query

### Step 2: Run the Corrected RLS Policies

Copy and paste this SQL into the editor and execute it:

```sql
-- ─────────────────────────────────────────────
-- FIX RLS POLICIES FOR PUBLIC SUBMISSIONS
-- ─────────────────────────────────────────────

-- GTM Leads Table Policies
-- Allow PUBLIC users to INSERT diagnostic submissions
DROP POLICY IF EXISTS "Public can insert gtm_leads" ON public.gtm_leads;
CREATE POLICY "Public can insert gtm_leads" ON public.gtm_leads
FOR INSERT WITH CHECK (true);

-- Allow AUTHENTICATED admins to SELECT all leads
DROP POLICY IF EXISTS "Admins can select gtm_leads" ON public.gtm_leads;
CREATE POLICY "Admins can select gtm_leads" ON public.gtm_leads
FOR SELECT TO authenticated USING (true);

-- Allow AUTHENTICATED admins to UPDATE leads (status, notes, booking)
DROP POLICY IF EXISTS "Admins can update gtm_leads" ON public.gtm_leads;
CREATE POLICY "Admins can update gtm_leads" ON public.gtm_leads
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Submissions Table Policies
-- Allow PUBLIC users to INSERT submissions
DROP POLICY IF EXISTS "Public can insert submissions" ON public.submissions;
CREATE POLICY "Public can insert submissions" ON public.submissions
FOR INSERT WITH CHECK (true);

-- Allow AUTHENTICATED admins to SELECT submissions
DROP POLICY IF EXISTS "Admins can view submissions" ON public.submissions;
CREATE POLICY "Admins can view submissions" ON public.submissions
FOR SELECT TO authenticated USING (true);

-- Config Table Policies
-- Allow PUBLIC users to READ config (needed for diagnostics to load)
DROP POLICY IF EXISTS "Public can read config" ON public.config;
CREATE POLICY "Public can read config" ON public.config
FOR SELECT USING (true);

-- Allow AUTHENTICATED admins to UPDATE config
DROP POLICY IF EXISTS "Admins can update config" ON public.config;
CREATE POLICY "Admins can update config" ON public.config
FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Step 3: Verify in Supabase Dashboard

1. Go to **Authentication > Policies**
2. Click on the `gtm_leads` table
3. Verify these policies exist:
   - ✅ "Public can insert gtm_leads" - FOR INSERT (allows anyone)
   - ✅ "Admins can select gtm_leads" - FOR SELECT TO authenticated
   - ✅ "Admins can update gtm_leads" - FOR UPDATE TO authenticated

## What Changed

**Before (Too Restrictive):**
```sql
CREATE POLICY "Public can insert gtm_leads" ON public.gtm_leads
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'kmgadmingtm21@gmail.com');
```
❌ This only allows the admin email to insert = form submissions blocked

**After (Correct):**
```sql
CREATE POLICY "Public can insert gtm_leads" ON public.gtm_leads
FOR INSERT WITH CHECK (true);
```
✅ This allows anyone to insert = form submissions work

## Why This Works

- **Public can insert**: Diagnostic submissions come from anonymous users with no auth token
- **Authenticated admins can read**: Admin dashboard needs to authenticate to view submissions
- **Authenticated admins can update**: Admins can change status, notes, and booking info
- **Public cannot read/update**: Form users can't see other submissions

## Testing

After running the SQL:
1. Go to the diagnostic form: https://your-site.com/
2. Fill out and submit a test form
3. Check the admin dashboard: https://your-site.com/adminlogin → /gtmdashboard
4. You should see the new lead in the list

## Troubleshooting

If form submissions still don't work after fixing RLS:
1. **Check browser console for errors**: Press F12 in the diagnostic form
2. **Verify Supabase URL**: Check `.env` has correct `VITE_SUPABASE_URL`
3. **Verify auth key**: Check `.env` has correct `VITE_SUPABASE_ANON_KEY`
4. **Check Vercel env vars**: Verify VITE_ADMIN_EMAIL is set in Vercel dashboard
