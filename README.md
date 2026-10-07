# Ackworth Jaguars website (v2)

Cloudflare Worker + static site. D1 holds content, users, photos and PDFs. No payment card needed.

## Deploy
1. Cloudflare dashboard > Storage & databases: create a D1 database (this repo is set up for the name `ackworthjaguarswebsite`).
2. Put the D1 database id in `wrangler.toml` (`database_id`).
3. In the D1 console, run `schema.sql`, then `seed.sql`.
4. Replace the contents of the `v2-design` branch with this folder and push.
5. Workers & Pages > Create > Import a repository, pick the repo and branch. Deploy command: `npx wrangler deploy`.
6. Open `/admin/`. First visit asks for an admin username and password, then shows a key to add to your authenticator app.

## Levels
- admin: everything, plus settings and users
- editor: all content and documents
- coach: fixtures, results and news

## Before cancelling Spond
Download the code of conduct PDFs from the old site and re-upload them in Documents. The seeded links still point at Spond storage.

## Domain
After testing: Worker > Settings > Domains & routes > add `ackworthjaguars.co.uk` (the domain's DNS must be on Cloudflare).

## Preview on your own PC
The pages are filled in by the Worker, so double-clicking an .html file shows a blank page. Run:
```
npx wrangler d1 execute jaguars --local --file=schema.sql
npx wrangler d1 execute jaguars --local --file=seed.sql
npx wrangler dev
```
Then open http://localhost:8787 (admin at /admin/).

## Contact form
Every message is saved in the portal under Messages. To also get it by email, and to switch on the spam check:
1. Spam check: Cloudflare dashboard > Turnstile > add a widget for your site hostnames. Paste the Site key into Settings > Turnstile site key. Add the Secret key to the Worker as a secret named `TURNSTILE_SECRET` (Worker > Settings > Variables and secrets).
2. Email: needs the domain on Cloudflare. Enable Email Routing, add the club email as a destination address and verify it, then remove the `#` from the `send_email` lines in `wrangler.toml` and redeploy. In Settings set Club email (the verified address) and Send-from address (an address on your domain, e.g. website@ackworthjaguars.co.uk).

## New season
Teams > Move all teams up one age group. Everything stays with the squad. Add your new youngest team.

## Game Day league table and fixtures
For each competitive team, paste the two Game Day links into Teams > Edit:
- Game Day fixtures and results link: the team's "Season Fixture" page (a=SFIX)
- Game Day league table link: the team's "Ladders" page (a=LADDER)
Links must start with https://websites.mygameday.app. The site reads them at 1pm and 8pm UK time every day and shows the table and fixtures in the site's own styling, with the time it was last updated. Teams > "Refresh Game Day data now" does it straight away and reports what it found. If Game Day can't be read, the last good copy stays on the site.

## Authenticator trouble
Setup, Add user and Reset login all show a QR code to scan with the authenticator app. If a login ever fails with "wrong code", check the phone's date and time are set to automatic. To start again as the only admin, run this in the D1 console, then open /admin/ to set up again:
```
DELETE FROM sessions;
DELETE FROM users;
DELETE FROM kv WHERE k LIKE 'f:%';
```
