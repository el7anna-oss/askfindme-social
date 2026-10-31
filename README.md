# askfindme-social

Builds a daily Instagram carousel of 5 events (Ticketmaster, Europe + USA) with the askfindme branding.
It prepares a draft and emails it to you. Nothing is posted until you approve (or you switch on AUTO_PUBLISH).

## Everyday commands (PowerShell, inside this folder)
    npm run draft:mock     test with sample events, no key needed
    npm run draft          real events -> output\<date>\ (images + caption.txt)
    npm run publish:dry    show exactly what would be posted, posts nothing
    npm run publish        post the newest draft (needs the Instagram settings in .env)
    npm run test:publish   offline self-test with a fake Instagram

## Settings (.env, copy from .env.example). Never paste keys or tokens into chat or commit .env.

## Daily automation on GitHub (free)
1. Create a PUBLIC GitHub repository named askfindme-social (public is needed so Instagram can download the images).
2. Push this folder to it (the .gitignore already keeps .env out).
3. Repository Settings > Secrets and variables > Actions:
   - Secrets: TICKETMASTER_API_KEY, IG_USER_ID, IG_ACCESS_TOKEN, RESEND_API_KEY (optional)
   - Variables: NOTIFY_EMAIL (your email), WHATSAPP (optional), AUTO_PUBLISH (leave unset = ask me first)
4. Actions tab > "Daily draft" > Run workflow once to test. It runs every day at 07:00 UTC.
5. To approve a draft: Actions tab > "Publish draft to Instagram" > Run workflow.
   Set the variable AUTO_PUBLISH to true only when you trust the drafts.

## Safety built in
- A draft that was published once cannot be published or rebuilt again by accident.
- Events are remembered (data/posted.json) so they are not repeated.
- Tokens are only sent to Instagram in a header and never printed.
