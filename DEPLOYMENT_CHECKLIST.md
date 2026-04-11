# Deployment Checklist - Form Submission Fix

## What Was Broken
- Form submissions were being rejected by Supabase RLS policies
- Admin dashboard couldn't see submitted data
- Users received no error message (silent failure)
- Booking submissions also failed

## What Was Fixed
- ✅ Improved error messages so users can see what went wrong
- ✅ Added logging for successful submissions
- ✅ Created RLS policy fix guide
- ✅ Created troubleshooting documentation

## What You Need to Do NOW

### Priority 1: Fix RLS Policies (CRITICAL)
**⏱️ Time: 5 minutes**

1. Go to: https://app.supabase.com/projects
2. Select project: `wmvxuxucccuioqszpmbp`
3. Go to: **SQL Editor** > **New Query**
4. Copy-paste the full SQL from [SUPABASE_FIX_GUIDE.md](./SUPABASE_FIX_GUIDE.md) Step 2
5. Click **Run** button
6. You should see: `Success. No rows returned.` (multiple times)

**Verify it worked:**
- Go to **Authentication** > **Policies**
- Click **gtm_leads** table
- Confirm you see:
  - "Public can insert gtm_leads" with `FOR INSERT WITH CHECK (true)`
  - "Admins can select gtm_leads"
  - "Admins can update gtm_leads"

### Priority 2: Verify Vercel Environment Variables
**⏱️ Time: 5 minutes**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** > **Environment Variables**
4. Check these exist with correct values:
   - [ ] `VITE_SUPABASE_URL` = `https://wmvxuxucccuioqszpmbp.supabase.co`
   - [ ] `VITE_SUPABASE_ANON_KEY` = (should match `.env` value)
   - [ ] `VITE_ADMIN_EMAIL` = `kmgadmingtm21@gmail.com`

5. If any are missing or wrong, add/fix them
6. Redeploy:
   - Click **Deployments**
   - Click the latest deployment
   - Click **Redeploy** button

### Priority 3: Test Form Submission
**⏱️ Time: 10 minutes**

1. Clear browser cache: **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Go to: https://your-site.com/ (your diagnostic form)
3. Open browser console: **F12** or **Option+Cmd+J** (Mac)
4. Switch to **Console** tab
5. Fill out the form:
   - Step 1: Company info + complete CAPTCHA
   - Steps 2-6: Answer diagnostic questions
   - Final: Submit
6. Look for console message:
   - ✅ Should see: `✅ Submission saved successfully with ID: [some-uuid]`
   - ❌ If you see error: Check [TROUBLESHOOTING_SUBMISSIONS.md](./TROUBLESHOOTING_SUBMISSIONS.md)

### Priority 4: Test Admin Dashboard
**⏱️ Time: 5 minutes**

1. Go to: https://your-site.com/adminlogin
2. Log in with:
   - Email: `kmgadmingtm21@gmail.com`
   - Password: (your Supabase auth password)
3. Go to **Leads** tab
4. You should see your test submission with:
   - Name and email from the form
   - Company name
   - Total score (e.g., "65")
   - Status: "new"
   - Created timestamp

### Priority 5: Test Booking Feature
**⏱️ Time: 5 minutes**

1. From the diagnostic results page, click **"Book GTM Review"**
2. Fill in the booking form:
   - Select a time
   - Add a message (optional)
3. Click **Submit**
4. You should see: "Booking submitted successfully"
5. Go back to admin dashboard > **Leads**
6. The lead's booking should show as booked

## Verification Checklist

After completing all steps above:

- [ ] RLS policies fixed in Supabase (all 8 DROP/CREATE statements ran)
- [ ] Environment variables set in Vercel (3 VITE_* variables)
- [ ] Latest code deployed to Vercel (commit 5f4e49a)
- [ ] Browser cache cleared
- [ ] Test form submission successful (see console message)
- [ ] Admin dashboard shows test lead
- [ ] Booking submission works
- [ ] No error messages in browser console

## Git Commits Involved

- **fd7561a**: Added hCaptcha bot protection
- **5f4e49a**: Added error messaging and RLS documentation (just pushed)

## Rollback Plan

If something breaks:
1. Check [TROUBLESHOOTING_SUBMISSIONS.md](./TROUBLESHOOTING_SUBMISSIONS.md)
2. Check Supabase SQL Editor logs for errors
3. Check Vercel deployment logs
4. If RLS policies are still wrong, you can re-run the SQL from SUPABASE_FIX_GUIDE.md

## Next Steps After Verification

Once everything works:
1. Monitor admin dashboard for real submissions
2. Test with actual user (not just you)
3. Share admin login with team if needed
4. Document admin procedures (how to view leads, update status, etc.)

## Questions?

If you hit issues:
1. Check the browser console (F12) for exact error
2. Go to Supabase dashboard > Logs to see database errors
3. Go to Vercel > Deployments > Logs for server errors
4. Refer to [TROUBLESHOOTING_SUBMISSIONS.md](./TROUBLESHOOTING_SUBMISSIONS.md)
