# Production Deployment Checklist

This checklist walks through Steps 1–5 of the production deployment. Work through these steps in order. Each step has a verification check.

**Estimated time:** 30–45 minutes  
**Prerequisites:** GitHub repo pushed, VNPay merchant account, Vercel account, Supabase account

---

## Step 1: Create Supabase Cloud Project

- [ ] Go to [supabase.com](https://supabase.com) and log in
- [ ] Click **New project**
- [ ] Select **Region: Singapore (ap-southeast-1)**
- [ ] Create the project
- [ ] Wait for project to initialize (2–3 minutes)
- [ ] Go to **Project Settings** → **API**
- [ ] Copy and save:
  - [ ] **Project URL** (e.g., `https://xxx.supabase.co`)
  - [ ] **Anon Key** (public key for frontend)
  - [ ] **Service Role Key** (private key for server)
- [ ] Go to **Project Settings** → **Database**
- [ ] Copy and save:
  - [ ] **Database password** (for migrations)
  - [ ] **Database host** (e.g., `xxx.supabase.co`)
- [ ] Run all 16 migrations against the production database:
  ```bash
  DB_HOST=<cloud-host> DB_PORT=5432 DB_USER=postgres DB_PASS=<cloud-password> DB_NAME=postgres \
    ./scripts/migrate.sh
  ```
- [ ] **Verify:** Go to Supabase Studio (cloud) → **Tables**. Confirm all tables exist:
  - [ ] profiles
  - [ ] posts
  - [ ] transactions
  - [ ] referrals
  - [ ] subscriptions
  - [ ] payments
  - [ ] shop_products
  - [ ] shop_product_codes
  - [ ] rewards
  - [ ] (and any other application tables)

---

## Step 2: Set Production Secrets in Supabase Edge Functions

- [ ] Go to Supabase Cloud Dashboard → **Settings** → **Edge Functions** → **Secrets**
- [ ] Click **New secret** and add these three secrets (get values from VNPay merchant dashboard):
  - [ ] Name: `VNPAY_HASH_SECRET`, Value: `<production-value-from-vnpay-dashboard>`
  - [ ] Name: `VNPAY_TMN_CODE`, Value: `<production-value-from-vnpay-dashboard>`
  - [ ] Name: `VNPAY_URL`, Value: `https://pay.vnpay.vn/vpcpay.html`
- [ ] **Important:** Do NOT create a secret for `VNPAY_MOCK`. Leaving it unset disables mock mode in production.
- [ ] **Verify:** Go back to **Secrets** and confirm all three secrets are listed.

---

## Step 3: Deploy Edge Function

- [ ] Ensure you are in the project directory:
  ```bash
  cd /Users/thankz/Code/money-app
  ```
- [ ] Get your Supabase project reference (from dashboard URL or Settings → General):
  ```
  <project-ref> = the alphanumeric slug before .supabase.co
  ```
- [ ] Deploy the payment-webhook Edge Function:
  ```bash
  npx supabase functions deploy payment-webhook --project-ref <project-ref>
  ```
- [ ] Wait for deployment to complete (usually 30 seconds–1 minute)
- [ ] Log in to VNPay merchant dashboard → Merchant Settings → IPN URL
- [ ] Update the IPN callback URL to:
  ```
  https://<project-ref>.supabase.co/functions/v1/payment-webhook
  ```
- [ ] **Verify:**
  - [ ] Vercel logs show no deployment errors
  - [ ] Test a payment webhook manually (or wait for Step 5 to test end-to-end)

---

## Step 4: Deploy Frontend to Vercel

- [ ] Ensure repository is pushed to GitHub
- [ ] Go to [vercel.com](https://vercel.com) and log in
- [ ] Click **Add New** → **Project**
- [ ] Import the GitHub repository for this project
- [ ] In **Environment Variables**, add:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<anon-key-from-step-1>`
  - [ ] `NEXT_PUBLIC_SITE_URL` = `https://your-production-domain.com`
  - [ ] `NODE_ENV` = `production` (Vercel sets this automatically)
- [ ] Click **Deploy**
- [ ] Wait for build and deployment to complete (usually 2–5 minutes)
- [ ] Note the **preview URL** (e.g., `https://money-app-abc123.vercel.app`)
- [ ] **Verify:** Visit the Vercel preview URL and confirm:
  - [ ] Page loads without errors
  - [ ] Header and navigation render correctly
  - [ ] Network tab shows API calls to Supabase Cloud (not localhost)

---

## Step 5: Configure Supabase Auth Redirect URLs

- [ ] Go to Supabase Cloud Dashboard → **Authentication** → **URL Configuration**
- [ ] In **Site URL** field, enter:
  ```
  https://your-production-domain.com
  ```
- [ ] In **Redirect URLs** section, add both:
  - [ ] `https://your-production-domain.com/**`
  - [ ] `https://<vercel-preview-url>.vercel.app/**` (from Step 4)
- [ ] Click **Save**
- [ ] **Verify:** Open the Vercel preview URL in an **incognito/private** browser window:
  - [ ] Navigate to the signup page
  - [ ] Enter a real email address and register
  - [ ] Check your inbox for OTP email
  - [ ] Enter OTP and confirm login works
  - [ ] You are now logged in and can see your profile/dashboard

---

## Summary: All Steps Complete

Once all 5 steps are verified, you have:
- ✅ Production Supabase database with all migrations
- ✅ Edge Function deployed with VNPay secrets
- ✅ Frontend deployed to Vercel
- ✅ Auth redirect URLs configured

**Next:** Step 6 (Task 6) will point your production domain to Vercel. For now, the app is live at the Vercel preview URL.

---

## Troubleshooting

### Migrations fail in Step 1
- Verify database credentials (host, port, user, password)
- Check that the Supabase project is fully initialized
- Ensure your local `./scripts/migrate.sh` is executable: `chmod +x ./scripts/migrate.sh`

### Edge Function deployment fails in Step 3
- Confirm the project reference is correct
- Check that you have Supabase CLI installed: `npm install -g supabase`
- Verify you are logged in: `supabase projects list`

### Vercel deployment fails in Step 4
- Ensure all required environment variables are set (especially `NEXT_PUBLIC_SUPABASE_URL` and anon key)
- Check build logs for missing dependencies
- Verify the GitHub repository is public or properly connected to Vercel

### Auth signup fails in Step 5
- Confirm redirect URLs are correctly set in Supabase Auth settings
- Check browser console for CORS errors
- Verify email service is enabled in Supabase (Auth → Providers → Email)
- Ensure OTP emails are not being filtered as spam

