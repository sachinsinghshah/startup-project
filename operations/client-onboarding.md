# Client onboarding checklist

Copy this into your notes for each new client. It takes about 2–5 days, mostly waiting on the client.

## Day 0: they said yes
- [ ] Agreement signed (see `delivery-playbook.md` §5)
- [ ] Setup fee paid (Stripe Payment Link) and monthly subscription started
- [ ] Copy `clients/_template.json` to `clients/<id>.json`, fill in contact and plan, set `status: "onboarding"`
- [ ] Send the **onboarding email** below

## Collect from the client
- [ ] Logo (if any), 5–10 real photos of their work/team/van, list of services, service area, opening hours
- [ ] Google review link (GBP → *Ask for reviews* → copy link) → `lead.reviewUrl`
- [ ] Where leads should go: email and mobile number → `lead.ownerEmail`, `lead.ownerPhone`
- [ ] Domain: do they have one? Which registrar? Do they use email on it?
- [ ] Access invites accepted:
  - [ ] Google Business Profile → Manager
  - [ ] Search Console → Full (or created and verified by you, with the client added as Owner)
  - [ ] Registrar/DNS → delegate access (or they'll add the records themselves)

## Build
- [ ] Fill in `site` in their client file with real content, replacing the sample testimonials with real Google reviews they approve
- [ ] `npm run clients -- build`, deploy a preview, send the client the link for approval
- [ ] Deploy the lead API (`cd lead-api && npx netlify-cli deploy --prod`) so the new client entry is live
- [ ] Submit a test lead from the preview and confirm the owner receives the alert

## Go live
- [ ] Export the current DNS records (screenshot) and note the MX/TXT records
- [ ] Add the website records only (see playbook §2), plus the custom domains in Netlify, and check HTTPS works
- [ ] 301 redirects from important old URLs (if they had a site)
- [ ] Send a test email to their address and confirm email still works
- [ ] Search Console: submit the sitemap and request indexing of the homepage
- [ ] GBP: set the website field to the new URL, complete categories, services, hours and photos
- [ ] Set `status: "active"`, `site.liveUrl`, `domain.renewalDate` in their client file and commit
- [ ] Send the "you're live" email with what happens next and when the first monthly report arrives

---

## Onboarding email template

**Subject:** Getting your new site live: 3 quick things I need

Hi {{FirstName}},

Thanks for going ahead! To get you live this week I need three things:

1. **Photos and info:** reply with any photos of your work/team, your logo, and confirm your services, hours and areas covered.
2. **Google access:** please add **{{your Google email}}** as a *Manager* on your Google Business Profile. Open Google Maps on your phone, tap your business → *Edit profile* → menu → *Business Profile settings* → *People and access* → *Add*. This lets me update your listing; you stay the owner.
3. **Your domain ({{domain}}):** who is it registered with (GoDaddy, Namecheap, etc.)? You have two options:
   - add me as a delegate user (I'll send the 2-minute steps), **or**
   - I send you exactly two records to paste in, and that's it.

   I won't touch anything related to your email.

You keep full ownership of your domain and Google listings. I just get permission to manage them, which you can remove any time.

Thanks,
{{Your name}}

---

## DNS instructions to send a client who adds the records themselves

> Log in to {{registrar}} → DNS settings for **{{domain}}**. Please **don't delete anything**. Only change these two records:
>
> | Type | Name/Host | Value |
> |---|---|---|
> | CNAME | www | {{site}}.netlify.app |
> | A | @ | 75.2.60.5 |
>
> If there is already an A record for `@` or a record for `www`, edit it to the value above instead of adding a second one. Leave all MX and TXT records alone; those keep your email working. Send me a screenshot when done and I'll take it from there.
