# Delivery playbook

How to deliver each client the same way every time. One rule sits underneath all of it:

> **The client owns their assets: domain, Google Business Profile, Search Console, Analytics. We get delegated access, never their passwords.**

This protects you as much as them. Nobody can accuse you of holding their business hostage. Clients trust you faster ("you can leave any time and keep everything"). And if they cancel, offboarding is a 10-minute job.

---

## 1. Domain names: who pays and who owns

| Situation | What to do | Who pays the yearly fee |
|---|---|---|
| **Client already has a domain** (most common) | Keep it where it is. Ask them to add you as a **delegate/user** at their registrar, or to add the DNS records you send them. | Client, directly to their registrar |
| **Client has no domain** | **Register it in the client's name, with their email, in their own registrar account** (Cloudflare Registrar or Namecheap). Do it together on a call, or have them create the account and invite you. | Client, on their own card, with auto-renew **on** |
| **Client insists you handle everything** | Register it in a registrar account *you* control, but put the **client as the registrant** (their legal name and email in WHOIS). Bill the fee into the setup fee or the monthly plan. Record the renewal date in their client file. | You pay; it's included in their plan (state that in the agreement) |

**Never** register a client's domain under your own name as registrant. If you part ways it turns into a dispute, and the client legally owns their brand anyway.

**Domain renewal is the #1 way client sites die.** Even when the client pays, record `domain.renewalDate` in the client file. `npm run clients` warns you 45 days before any domain expires, so you can remind them.

Pricing tip: a `.com` costs about $10–$15 a year. If you include it, just roll it into the setup fee.

---

## 2. Putting the site on their existing domain

The site is hosted on Netlify (free). Their domain only needs to point there. **The trap is email:** many businesses get email on their domain (Google Workspace, Microsoft 365, or the host's mailbox). If you change nameservers or delete records carelessly, **their email stops working**, which is the fastest way to lose a client.

### Safe procedure
1. **Before touching anything**, screenshot or export their current DNS records. Note the `MX`, `TXT` (SPF, DKIM, DMARC, Google verification) and any `CNAME` records. Record in the client file whether email runs on the domain (`domain.emailOnDomain`).
2. **Don't move nameservers.** Leave DNS where it is and change only the website records:
   - `www` → `CNAME` → `<site-name>.netlify.app`
   - apex (`@`) → `ALIAS`/`ANAME`/flattened CNAME → `apex-loadbalancer.netlify.com` if the DNS provider supports it, otherwise an `A` record → `75.2.60.5`. (Check Netlify's current docs for the IP before using it.)
3. Add both `example.com` and `www.example.com` as custom domains in Netlify. HTTPS (Let's Encrypt) turns on automatically.
4. Leave every `MX` and `TXT` record exactly as it was.
5. Test: open the site over HTTPS, then send a test email to their address to confirm mail still arrives.
6. **Keep the old site** until the new one is confirmed live. Ask their old host for a backup or export, or save the HTML yourself.

### If they had an old site with pages ranking on Google
Map old URLs to new ones with 301 redirects (in a Netlify `_redirects` file), for example `/services.html  /#services  301`. Pull the old URLs from their Search Console *Pages* report, or from a `site:example.com` Google search. Skipping this can lose them rankings.

### How to get DNS access
In order of preference:
1. **Delegate access**, offered by Cloudflare, GoDaddy (Delegate Access), Namecheap (Share Access) and others. You log in with your own account.
2. **Client adds the records themselves.** You send exact, copy-paste instructions (template in `client-onboarding.md`).
3. **Screen-share** while they log in.
4. Only as a last resort, temporary credentials **stored in a password manager** (Bitwarden is free), never in this repo, in email or in chat. Ask them to change the password afterwards.

---

## 3. Google presence: Business Profile, Search Console, Analytics

### Google Business Profile (GBP): the biggest lever for local leads
- **They already have one** (check by searching their business name on Google Maps): ask them to add you as a **Manager**. In their profile, Menu → *Business Profile settings* → *People and access* → *Add* → your Google account email → *Manager*. Managers can edit info, post and reply to reviews, but cannot remove the owner. That's the right level.
- **They have none**: create it **with them, on their Google account**, so they are the Primary Owner, then add yourself as Manager. Google will make them verify (video, postcard or phone). Guide them through it.
- **Someone else owns it** (an old agency or ex-employee): the client can request ownership through Google's "request access" flow on the profile. It can take days, so start it on day 1.
- **Never** create a second profile for a business that already has one. Duplicates get suspended.

### Google Search Console (GSC)
- **They already have it**: ask them to add you as a user. *Settings* → *Users and permissions* → *Add user* → your email → **Full**. Full is enough for submitting sitemaps, inspecting URLs and reading reports.
- **They don't**: create a **Domain property** for the domain and verify it with the DNS `TXT` record Google gives you. Then add **the client as an Owner** (they should own it), and keep yourself as Owner or Full. If the client won't create a Google account, keep it on yours and transfer ownership on request.
- After launch: submit `https://example.com/sitemap.xml` and request indexing of the homepage.

### Google Analytics 4 (optional)
Create it in the client's account, or create it in yours and add them as Administrator. A simpler and privacy-friendlier option is Netlify Analytics or Plausible. For local businesses the real metric is **leads**, and the lead API already counts those.

### What "SEO" means in this service
Be concrete. Clients don't understand "SEO" and get angry when results aren't instant. Sell these deliverables:

| Included in the monthly plan | Paid extra, or a higher tier |
|---|---|
| Fast, mobile-friendly site with correct titles and meta descriptions, plus LocalBusiness schema (the generator does this) | A page per service and per town (e.g. "Water heater repair in Round Rock"), at $X per page |
| GBP fully completed: categories, services, hours, photos, area served | Monthly GBP posts, photo uploads |
| Matching name, address and phone (NAP) across the top directories (Yelp, Bing Places, Apple Business Connect, Facebook) | Citations on niche directories |
| One-click review requests: every lead alert has a "job done, ask for a review" link; the owner clicks it after the job | Replying to every review on their behalf |
| Search Console set up, sitemap submitted, monthly check for errors | Blog or content writing, link building |

**Never promise rankings or a position.** Promise the work ("we'll publish 4 service pages and get you 10+ new reviews this quarter") and report on it monthly.

---

## 4. Keeping it all organised

- **One file per client in `clients/`** is the single source of truth. Copy `clients/_template.json`. It holds the site content, the lead settings, the domain, who owns what, the access you have, and billing.
- `npm run clients` → checks every client file and lists warnings: domain renewing soon, missing GBP/GSC access, an active client with no live URL, and so on.
- `npm run clients -- build` → regenerates `lead-api/clients.json` from the client files (don't edit that file by hand) and builds every client's site into `dist/`.
- **Status pipeline:** `prospect` → `demo` → `onboarding` → `active` → `paused`/`cancelled`. Update the status as the client moves.
- **Secrets never go in git.** Keep passwords, API keys and access codes in a password manager, and record only *where* they are (`access.vaultRef`). Client files contain contact details, so **keep this GitHub repo private**.
- **Monthly routine** (about 30 minutes per client): run `npm run clients`, check GSC for errors, look at GBP insights, count leads, and send a short report email ("12 leads, 5 new reviews, 2 changes made").

---

## 5. What to put in the service agreement (one page is fine)

1. **Ownership:** the client owns their domain, content, GBP, GSC and Analytics. We keep ownership of our template code and the lead system, and license it to them while they subscribe.
2. **Included:** the exact items in their package, including the number of edits a month (e.g. 30 minutes or 3 small changes).
3. **Not included:** anything else is quoted separately (new pages, logo design, ad management).
4. **Fees:** setup fee paid up front before go-live, then monthly fees paid in advance and billed automatically. State who pays the domain renewal.
5. **No ranking guarantees:** we do the listed SEO work; Google decides rankings.
6. **Cancellation:** 30 days' notice. On cancellation we hand over a full export of the site (the HTML files), remove our access, and point them at what to do with DNS. The lead alerts and review requests stop.
7. **Client responsibilities:** accurate business info, approving content, replying to leads.
8. **Liability cap:** limited to fees paid in the last 3 months.

Get it signed (a free e-sign tool is fine) **and** the setup fee paid before you put anything live on their domain.

---

## 6. Offboarding (when a client cancels)
1. Export `dist/<id>/` as a zip and send it to them.
2. Remove yourself from GBP, GSC, GA4 and the registrar (or ask them to).
3. Tell them which DNS records to change if they move hosts. Remind them their email records were never touched.
4. Cancel the subscription and set `status: "cancelled"` in their client file. Their entry drops out of the lead API on the next `npm run clients -- build`.
5. Ask for a testimonial anyway; a clean exit gets referrals.
