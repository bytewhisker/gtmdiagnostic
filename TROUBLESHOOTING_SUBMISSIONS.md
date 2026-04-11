# Form Submission Troubleshooting Guide

## Quick Diagnosis

If form submissions aren't appearing in your admin dashboard, follow these steps:

### Step 1: Check Browser Console for Errors
1. Open the diagnostic form: https://your-site.com/
2. Press **F12** to open Developer Console (Chrome/Edge) or **Option + Cmd + J** (Mac)
3. Click the **Console** tab
4. Fill out and submit the form
5. Look for errors. You should see:
   - ✅ `✅ Submission saved successfully with ID: [uuid]` = SUCCESS
   - ❌ `Unable to save submission: permission denied...` = RLS policy issue
   - ❌ `Unable to save submission: invalid function...` = Supabase connection issue

### Step 2: RLS Policy Check (Most Common Issue)

If you see **"permission denied"** error:

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project: `wmvxuxucccuioqszpmbp`
3. Click **Authentication** > **Policies** in left sidebar
4. Select table **`gtm_leads`**
5. You should see these policies:
   - ✅ "Public can insert gtm_leads" - **FOR INSERT WITH CHECK (true)**
   - ✅ "Admins can select gtm_leads" - **FOR SELECT TO authenticated**
   - ✅ "Admins can update gtm_leads" - **FOR UPDATE TO authenticated**

If the policies are different (like `FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'kmgadmingtm21@gmail.com')`), they're too restrictive!

**Fix**: Run the SQL in [SUPABASE_FIX_GUIDE.md](./SUPABASE_FIX_GUIDE.md)

### Step 3: Verify Supabase Connection

1. In browser console, copy-paste this:
```javascript
fetch('https://wmvxuxucccuioqszpmbp.supabase.co/rest/v1/gtm_leads?limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtdnh1eHVjY2N1aW9xc3pwbWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTY2MDIsImV4cCI6MjA5MDc3MjYwMn0.M48yd6dHY2DUArvYiFhH4ArYyYOnU3siCMsjDVF5zqo'
  }
}).then(r => r.json()).then(d => console.log('✅ Supabase connected:', d))
```
- ✅ Should return data or empty array = connection works
- ❌ Should NOT return "Unauthorized" error

### Step 4: Verify Admin Email in Vercel

Your form submissions work, but the admin dashboard needs to know who the admin is.

1. Go to Vercel: https://vercel.com
2. Select your project
3. Click **Settings** > **Environment Variables**
4. Look for **`VITE_ADMIN_EMAIL`**
5. It should be: `kmgadmingtm21@gmail.com`

If it's missing or different:
1. Click **Add New**
2. Name: `VITE_ADMIN_EMAIL`
3. Value: `kmgadmingtm21@gmail.com`
4. Select all environments (Production, Preview, Development)
5. Click **Save**
6. Redeploy: Go to **Deployments** > click the latest > **Redeploy**

## Complete Checklist

Before testing, verify all of these:

- [ ] 1. RLS policies fixed in Supabase (ran the SUPABASE_FIX_GUIDE.sql)
- [ ] 2. VITE_ADMIN_EMAIL set in Vercel environment variables
- [ ] 3. Latest code deployed to Vercel (after commit 5f4e49a)
- [ ] 4. Browser cache cleared (Ctrl+Shift+Delete)
- [ ] 5. Browser console shows no errors

## Test Procedure

### Test 1: Form Submission
1. Go to diagnostic form
2. Fill out first step (company info)
3. Complete CAPTCHA
4. Continue through diagnostic
5. Submit final answers
6. Check browser console for: `✅ Submission saved successfully with ID:`
7. You should see results page

### Test 2: Check Admin Dashboard
1. Go to admin login: https://your-site.com/adminlogin
2. Log in with: 
   - Email: `kmgadmingtm21@gmail.com`
   - Password: (your Supabase password)
3. Go to **Leads** tab
4. You should see your test submission in the list with:
   - Name, email, company
   - Total score
   - Status: "new"
   - Timestamp

### Test 3: Booking Submission
1. From results page, click "Book GTM Review"
2. Fill in booking info
3. Submit
4. Check console for: `✅ Booking saved successfully`
5. In admin dashboard, the lead should show:
   - `is_booked`: true
   - Booking time and message filled

## Common Issues and Fixes

| Problem | Cause | Solution |
|---------|-------|----------|
| "permission denied" error | RLS policies too restrictive | Run SUPABASE_FIX_GUIDE.sql in Supabase |
| "invalid API key" error | Wrong VITE_SUPABASE_ANON_KEY | Check .env file |
| "Column not found" error | gtm_leads table missing columns | Run supabase_setup.sql |
| Admin can't see submissions | VITE_ADMIN_EMAIL wrong or missing in Vercel | Add/fix env var and redeploy |
| Form works but no booking | submissionId not saved | Check that form submission succeeded first |
| CAPTCHA not loading | hCaptcha sitekey issue | Check browser console for hCaptcha errors |

## Need More Help?

1. **Check error in browser console** - copy exact error message
2. **Check Supabase logs** - go to Supabase dashboard > Logs to see actual database errors
3. **Check Vercel logs** - go to Vercel > Deployments > Logs to see server errors

If stuck, provide:
- Exact error message from browser console
- Screenshot of RLS policies from Supabase
- List of environment variables from Vercel
