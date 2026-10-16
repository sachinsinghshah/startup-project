# Outreach templates (demo-first)

Rules that matter more than the wording:
- **Send each one by hand and personally.** Use the business name, their city and one specific problem from `leads.csv`. Bulk blasts get flagged as spam and never get replies.
- **The demo link does the selling.** Build their site *before* emailing (`npm run gen`, then deploy a preview).
- **Volume:** 20–30 a day, from a separate domain/mailbox you warm up for 1–2 weeks (for example `yourname@getyourstudio.com`), not your main address.
- **Legal:** in the US, CAN-SPAM requires a real postal address and an easy way to opt out. In the UK/EU, cold email to *businesses* is allowed under PECR/GDPR "legitimate interest" if it is relevant to them and offers an opt-out. Don't email sole traders' personal addresses in the UK.

---

## Email 1: the demo (day 0)

**Subject:** I rebuilt {{Business}}'s website (free preview)

Hi {{FirstName}},

I was looking for a {{niche}} in {{City}} on my phone and found {{Business}}. Your reviews are great, but the site was hard to use on mobile ({{one specific problem, e.g. "no tap-to-call button and it took 9 seconds to load"}}).

So I built you a new version. Here it is: {{demo_link}}

It loads instantly on phones, has a one-tap call button, and sends quote requests straight to your phone and inbox. It also asks happy customers for a Google review automatically.

If you like it, I can put it live on your domain this week for {{$setup}} plus {{$monthly}}/month for hosting, edits and the lead alerts. If not, no worries; the preview is yours to keep looking at.

Worth a quick 10-minute call?

{{Your name}}
{{Phone}} · {{Postal address}}
_Not interested? Reply "no" and I won't email again._

---

## Email 2: follow-up (day 3)

**Subject:** Re: I rebuilt {{Business}}'s website

Hi {{FirstName}}, just bumping this in case it got buried. The preview is still up: {{demo_link}}

One thing I didn't mention: most customers hire whoever calls back first. Every form submission alerts you within seconds.

{{Your name}}

---

## Email 3: breakup (day 7)

**Subject:** Should I take the preview down?

Hi {{FirstName}}, I'll take {{Business}}'s preview down on Friday unless you want to keep it. Happy to change anything (colors, photos, services) if that would help.

{{Your name}}

---

## Loom video script (60–90 seconds, use it for the top 20% of leads)

1. (Show their current site on a phone view.) "Hi {{FirstName}}, this is your site on a phone. Notice {{problem}}."
2. (Switch to the demo.) "Here's a version I built for you. Tap here and it calls you. This form goes straight to your phone."
3. "It's yours for {{$setup}} plus {{$monthly}} a month, and I handle everything. Reply to this email if you want it live."

---

## Pricing to start with (raise it after 3 clients)

| Package | Setup | Monthly | Includes |
|---|---|---|---|
| Starter | $500 | $99 | Site, quote form, email lead alerts, hosting, 30 min of edits a month |
| Growth | $900 | $179 | Starter + SMS alerts + automatic Google review requests + monthly lead report |

Take payment with **Stripe Payment Links** (no monthly fee): one link for the setup fee and one for the subscription. Get paid *before* you put the site live on their domain.

## Phone objections

- **"I get enough work."** "Great. Then this is about getting better jobs and more reviews, not more calls. The review requests alone usually pay for it."
- **"My nephew made my site."** "Totally fair. I can keep his design and just add the call button and lead alerts."
- **"Too expensive."** "One extra job a month covers it several times over. Want to try it for a month and cancel any time?"
