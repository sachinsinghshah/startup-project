# Start-to-finish guide

Follow this top to bottom. Each step says **what to do**, **which file or command helps**, and **when it's done**. Tick the boxes as you go.

```
0. Set up once ─► 1. Find leads ─► 2. Build demos ─► 3. Outreach ─► 4. Sales call
      ─► 5. Agreement + payment ─► 6. Onboard ─► 7. Go live ─► 8. Monthly service ─► 9. Grow / offboard
```

---

## 0. One-time setup (day 1–3, cost about $15)

### Your identity
- [ ] Pick a simple studio name, e.g. "Brightline Web Studio". Check that the `.com` is free.
- [ ] Buy **two** domains (about $10 each, Cloudflare Registrar or Namecheap):
  - `yourstudio.com` for your website and normal email
  - `getyourstudio.com` (or similar) **only for cold outreach**, so spam complaints can never hurt your main domain
- [ ] Email on both domains. Zoho Mail has a free plan; Google Workspace is about $7 a month per user.
- [ ] Warm up the outreach mailbox for **2 weeks** before cold emailing: send 5–10 real emails a day to friends and get replies. Set up **SPF, DKIM and DMARC** records (your email provider shows you the exact records).
- [ ] Your own website: copy `site-template/configs/agency-example.json`, fill it in, `npm run gen -- <file>`, deploy to Netlify on `yourstudio.com`. Put 2–3 of your demo sites on it as a portfolio.
- [ ] A free Calendly (or Cal.com) link for 15-minute calls.
- [ ] Bitwarden (free) for client passwords and access notes. **Never put passwords in this repo.**

### Getting paid from US/UK/EU clients
| You live in | Use | Notes |
|---|---|---|
| US / UK / EU | **Stripe**: Payment Links for setup fees, Subscriptions for the monthly fee | Fees about 1.5–3%. Nothing to pay until you're paid. |
| India | **Stripe is invite-only and needs a registered business** (with an IEC code). Until you have that, invoice through **Skydo, Wise Business or Payoneer** | You receive foreign payments with a FIRA (the bank certificate of foreign income) for tax. Compare fees on each provider's pricing page; PayPal is usually the most expensive. For the monthly fee, send an invoice link each month or offer a discount for paying a year up front. |
| Elsewhere | Stripe if your country is supported, otherwise Wise or Payoneer | |

- [ ] Ask an accountant once how to register and invoice as a freelancer or sole trader where you live, and whether you must charge tax. It's a 30-minute call that saves headaches later.

### Tools
- [ ] Fill in `agency.json`: your name, email and studio name. `leadApiUrl` comes in the next steps.
- [ ] Create **Netlify** (free) and **Resend** (free tier) accounts. In Resend, verify `yourstudio.com` as the sending domain.
- [ ] Deploy the lead API once: `cd lead-api && npx netlify-cli deploy --prod`. In the Netlify site settings, set these environment variables:
  - `RESEND_API_KEY` from Resend
  - `FROM_EMAIL` = `Leads <leads@yourstudio.com>`
  - `BCC_EMAIL` = your email, so you get a copy of every lead (that's how you count leads for monthly reports)
  - `LINK_SECRET` = a long random string, from `openssl rand -hex 32`
  - `PUBLIC_URL` = the URL of this Netlify site, e.g. `https://yourstudio-leads.netlify.app`
- [ ] Put that URL into `agency.json → leadApiUrl`.
- [ ] Test: `npm run new-client -- --name "Test Plumbing" --city "Austin, TX" --phone "(512) 555-0100" --niche plumber`, then `npm run clients -- build`, redeploy the lead API, deploy `dist/test-plumbing-austin` and submit the form. The lead email should reach you. Then delete the test client.

**Done when:** your own site is live, the outreach mailbox is warming up, and a test lead reaches your inbox.

---

## 1. Find leads (about 10 minutes per 50–60 leads)

Pick **one niche + one metro area**, e.g. plumbers in Austin. Good niches: plumbers, HVAC, roofers, electricians, dentists, physios. One niche lets you reuse the demo and the pitch.

### Automatic: Google Places API (recommended)
One-time setup (about 15 minutes, free within Google's monthly free allowance):
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project, e.g. "lead-finder".
2. Add a billing account. Google requires a card even for the free tier.
3. **APIs & Services → Library →** enable **"Places API (New)"**.
4. **APIs & Services → Credentials → Create credentials → API key.** Click the key → **Restrict key** → API restrictions → allow only *Places API (New)*.
5. **Protect yourself from charges:**
   - **Billing → Budgets & alerts →** create a $1 budget with email alerts.
   - **APIs & Services → Places API (New) → Quotas →** cap requests per day at about 30.

   Each request returns up to 20 businesses. The free allowance is about 1,000 of these requests a month (at the time of writing; check Google's pricing page).

Then, each time:
```bash
# Mac/Linux
export GOOGLE_PLACES_API_KEY="your-key"
# Windows PowerShell
$env:GOOGLE_PLACES_API_KEY="your-key"

npm run find-leads -- --query "plumber in Austin, TX" --niche plumber --pages 3
npm run find-leads -- --query "plumber in Round Rock, TX" --niche plumber --pages 3   # appends, skips duplicates
npm run prospect -- my-leads.csv --psi
```
- `--pages 3` returns up to 60 businesses.
- Re-running adds only new businesses to `my-leads.csv`.
- The file also records each business's Google rating and review count. **A high rating with many reviews plus no or weak website** is your best kind of lead.

Two things to know:
- **Never put the key in a file in this repo.** Set it in your terminal as shown above.
- Google's terms limit how long you may keep Places data. Use each list for current outreach, and delete old `my-leads*.csv` files instead of building a permanent database. These files are git-ignored, so they never get pushed.

### Manual (no Google account needed)
Search Google Maps for "plumber Austin TX". Copy each business's **name, website, city, phone** into a sheet, with a `niche` column, and save it as `my-leads.csv`. Then run `npm run prospect -- my-leads.csv --psi`.

### What a good lead looks like
- **No website.** This is the best kind of lead.
- An old, slow or non-mobile site.
- Good reviews but a weak site. They do good work and lose online leads, so they're the easiest sell.

`npm run prospect` writes `leads.csv` with the worst sites first and the reasons why.

**Email addresses:** Google doesn't provide them. Find them on the business's website "Contact" page or their Facebook page, or just **call**. Calling a trades business directly often works better than email anyway.

**Done when:** you have 50–100 rows in `leads.csv`.

---

## 2. Build demos (10–15 minutes each)

1. `npm run new-client -- --from-leads leads.csv --top 10`. This creates `clients/<id>.json` files with status `demo`, filled with service text for that trade.
2. For each new file, spend 5 minutes making it **theirs**:
   - real services from their current site or Google listing
   - their area and brand colour (`brandColor`)
   - a headline that fits them
   - leave `testimonials` empty, or use their real Google reviews (quote them accurately)
3. `npm run clients -- build`, then **redeploy the lead API** (so the demo forms work).
4. `npx netlify-cli deploy --dir dist/<id>`. You get a preview link like `https://xyz--yoursite.netlify.app`.
5. Open the demo on your phone and submit the form. The lead should reach **you**, because demo leads go to your email.

**Done when:** every demo looks right on a phone and its form works.

---

## 3. Outreach (20–30 personal emails a day)

Use `outreach/email-templates.md`. Track everything in `outreach/tracker.csv`, or in a Google Sheet with the same columns.

- Day 0: email 1 (the demo link), personalised with their one specific problem from `leads.csv`.
- Day 3: email 2 (a short bump).
- Day 7: email 3 (the breakup email).
- For the top 20% of leads, record a 60-second **Loom** walking through their old site and then the demo.
- **Call** too, especially trades businesses. Calling plus emailing beats email alone.
- When someone replies with interest, send your Calendly link straight away.

Rules: send from the outreach domain; write each email personally, never in bulk; include your postal address and an opt-out line (US CAN-SPAM). In the UK/EU only email business addresses.

**Done when:** you're sending 20–30 a day and following up on schedule. Expect 1–5 replies per 100 emails at the start, then improve the wording.

---

## 4. The sales call (15 minutes)

Use the script in `operations/sales-call.md`. In short: ask about their business, show the demo, explain the price, and close by sending the agreement and payment link while you're still on the call or straight after.

**Done when:** they say yes. Change their client file `status` to `onboarding`.

---

## 5. Agreement and payment (same day)

1. Fill in `operations/service-agreement.md` (name, package, price) and send it as a PDF, or through a free e-sign tool.
2. Send the **setup fee** payment link (Stripe Payment Link, or a Skydo/Wise/Payoneer invoice).
3. Start the **monthly** subscription from go-live day. With manual invoicing, send the first invoice on go-live day.
4. Record `plan.startDate` and `plan.billingRef` in their client file.

**Never put anything live on their domain before the agreement is signed and the setup fee is paid.**

**Done when:** it's signed and paid.

---

## 6. Onboard (2–5 days, mostly waiting on them)

Follow `operations/client-onboarding.md` step by step. Key points:
- Send the onboarding email asking for photos, info, and access to their Google Business Profile and domain.
- In their client file, change `lead.ownerEmail` (and `ownerPhone`) from your email to **theirs**, and fill in `lead.reviewUrl` with their Google review link.
- Replace the demo content with real photos, services and reviews. Send them the preview and get approval in writing (an email "looks good" is enough).

---

## 7. Go live (about 1 hour)

Follow `operations/delivery-playbook.md` §2. Before you change anything, back up their DNS records and **don't touch their email (MX) records**. Then:
- add the custom domain in Netlify and check HTTPS works
- send a test email to their address to check email still arrives
- set `siteUrl` and `liveUrl` in their client file, then `npm run clients -- build` (this creates the sitemap and robots.txt) and deploy
- submit the sitemap in Search Console and update their Google Business Profile website link
- set `status: "active"`
- send the "you're live" email. Explain the **review button**: every lead email has a "job done, ask for a review" link, and one click after finishing a job sends that customer a review request.

**Done when:** the site is live on their domain, their email works, a test lead reaches them, and `npm run clients` shows no warnings for them.

---

## 8. Monthly service (about 30 minutes per client per month)

Once a month, for every active client:
- [ ] `npm run clients`: fix any warnings (domain renewals, missing access).
- [ ] Count their leads: search your inbox (you were BCC'd) for `New lead` + their name, for last month.
- [ ] Check Search Console for errors and Google Business Profile insights (calls, direction requests).
- [ ] Make the edits they asked for (within the included time).
- [ ] Growth clients: one Google Business Profile post (an offer, a finished job photo, a seasonal tip) and replies to new reviews.
- [ ] Send the monthly report (`operations/monthly-report.md`).

**Why clients stay:** they see leads arriving and reviews going up, and every request gets a fast reply. Answer within 1 business day.

---

## 9. Grow and offboard

- **Referrals:** after the first month's report, ask: "Know another business owner who'd want this? I'll give you a free month for each one who signs up."
- **Upsells**, once the first package is working:
  - service and town pages
  - SMS lead alerts
  - a Growth package with review replies and GBP posts
- **Raise prices** after your first 3–5 clients. New clients pay the new price.
- **Cancellations:** follow the offboarding steps in `delivery-playbook.md` §6. A clean exit protects your reputation and still gets referrals.

---

## Your weekly rhythm

| | Mon–Thu | Fri |
|---|---|---|
| Morning | Build 3–5 demos, send 20–30 emails, follow-ups due today | Monthly service work and reports |
| Afternoon | Calls, onboarding and go-lives | Review the week: emails sent → replies → calls → closes. Fix the weakest step. |

## Numbers to watch
**Emails sent → replies → calls booked → clients closed → monthly recurring revenue** (`npm run clients` shows the total). If replies are low, improve your demos and the first line of the email. If calls don't close, work on the call script or the price.
