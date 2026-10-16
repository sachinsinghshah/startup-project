# Local Lead Kit

A zero-budget toolkit for one business: **done-for-you websites with lead capture for local service businesses** (plumbers, HVAC, roofers, dentists, physios) in the US, UK and EU. You sell it for a setup fee plus a monthly retainer.

## Why this business (research summary)

Nothing makes money "for sure". These are the numbers that drove the choice:

- **Most new things fail for lack of demand.** CB Insights' review of startup post-mortems names "no market need" as the top cause (about 42%). BLS data puts first-year failure for new US businesses at about 20%, and about 49% by year five.
- **Solo SaaS is slow.** Indie-hacker surveys say most solo products never reach $1K MRR, and the median time to $10K MRR is 12–24 months. App stores concentrate revenue: an estimated 72% of Shopify App Store revenue goes to the top 1% of apps.
- **Services pay first.** Productized automation/web retainers sell for about $500–$4,000 a month. Small businesses already budget about $1,000–$3,500 a month for automating 2–3 workflows. Demand is proven because they already pay agencies for this, and delivery costs you only your time.

So the plan is: **sell a fixed service now (cash in about 30 days), then turn the repeat parts (lead form, alerts, review requests) into a self-serve SaaS** for the niche once you have 5–10 clients.

Sources: [BLS/CB Insights roundup](https://www.demandsage.com/?p=7938), [indie revenue milestones](https://jakeinsight.com/side-income/2026-03-14-indie-hacker-revenue-milestones-1k-to-10k-mrr/), [automation agency pricing](https://taskip.net/ai-automation-agency-pricing/), [Shopify app economy](https://revenuehunt.com/state-of-the-shopify-app-economy/), [productizing services](https://suitedash.com/how-to-productize-a-service.md), [Resend scheduled email](https://resend.com/docs/dashboard/emails/schedule-email).

## What's in here

| Folder | What it does |
|---|---|
| `prospector/` | Audits a CSV of businesses (HTTPS, mobile viewport, form, tap-to-call, stale copyright, optional PageSpeed score). Writes `leads.csv` with the worst sites first. |
| `site-template/` | Generates a fast, mobile-first demo site from a JSON config in about 5 minutes. Lighthouse mobile: 100 performance, 100 accessibility, 100 SEO. |
| `lead-api/` | One endpoint for all client sites. It emails (and optionally texts) the owner each lead, and schedules a Google-review request to the customer N days later. |
| `outreach/` | Demo-first cold email sequence, Loom script, pricing, objection handling, and a tracker CSV. |
| `operations/` | **How to deliver**: who owns and pays for domains, launching on a client's existing domain without breaking their email, Google Business Profile/Search Console access, what "SEO" includes, the service agreement, onboarding and offboarding. |
| `clients/` + `tools/` | One JSON file per client as the single source of truth (site content, lead routing, domain, Google access, billing). `npm run clients` shows status and warnings; `npm run clients -- build` regenerates the lead API config and every site. |

No dependencies; requires Node 20+.

```bash
# 1. Find leads: make a CSV (name,website,city) from Google Maps for one niche + one city
npm run prospect -- my-businesses.csv --psi        # writes leads.csv

# 2. Build a demo for a top lead: copy site-template/configs/sample-plumber.json and edit it
npm run gen -- site-template/configs/joes-plumbing.json   # writes dist/joes-plumbing/index.html
npx netlify-cli deploy --dir dist/joes-plumbing           # free preview URL to send them

# 3. Run the lead API locally (dry run prints the emails instead of sending)
npm run lead-api:dev

# 4. Manage paying clients: one file per client in clients/ (copy clients/_template.json)
npm run clients              # status, renewals due, missing access, monthly revenue
npm run clients -- build     # regenerates lead-api/clients.json + builds every client site

npm test
```

Before your first client, read `operations/delivery-playbook.md` and use `operations/client-onboarding.md` for each new client. **Keep this repo private**, because client files contain contact details. Passwords never go in it.

### Going live with the lead API (free tiers)
1. Create a [Resend](https://resend.com) account (free tier) and verify your sending domain.
2. Deploy `lead-api/` as its own Netlify site (`cd lead-api && npx netlify-cli deploy --prod`).
   Set the env vars `RESEND_API_KEY` and `FROM_EMAIL`. For SMS, also set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM`, and bill the SMS cost to the client.
3. Add each client as `clients/<id>.json`, run `npm run clients -- build`, then redeploy the lead API.
4. Set `leadEndpoint` in the client's site config to `https://<your-lead-api>.netlify.app/api/lead`.

## 30-day plan

| Days | Do this |
|---|---|
| 1–5 | Pick **one** niche in **one** metro area. Collect 100 businesses into a CSV and run the prospector. Set up and warm up a separate outreach mailbox. |
| 6–20 | Make 3–5 demo sites a day for the top-scored leads and send 20–30 personal emails a day (`outreach/email-templates.md`). Follow up on day 3 and day 7. |
| 21–30 | Get on calls and close. Take the setup fee through a Stripe Payment Link **before** launch, put the site on their domain, and start the monthly subscription. |

Rough target: 300–500 personal contacts at a 1–3% close rate gives about 3–10 clients. That is roughly $1.5K–$8K in setup fees plus $300–$2K a month in recurring fees. This is an estimate, not a promise; the outreach volume is what decides it.

## Next steps once you have clients
- A monthly lead report email per client (count of leads and review requests sent).
- Missed-call text-back (Twilio), which is the next upsell.
- A self-serve signup and dashboard, which turns this into the SaaS.
