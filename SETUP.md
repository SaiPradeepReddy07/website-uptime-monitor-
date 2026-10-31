# Setup (about 10 minutes)

1. **Create a Supabase project** at supabase.com. It stores accounts, sites and check results.
2. **Create the tables:** SQL Editor > New query > paste `supabase/schema.sql` > Run.
3. **Configure authentication:** Authentication > Providers.
   - **Email OTP:** Keep Email enabled and turn on **Confirm email**. In the **Confirm sign up** email template, include `{{ .Token }}` so new users can enter the six-digit code shown by the page. Set the project Site URL and allowed redirect URL to your published site.
   - **Phone OTP:** Turn on the Phone provider and configure an SMS provider (such as Twilio) and its credentials/templates. SMS delivery depends on that provider and may incur charges.
   - **Password reset:** Allow the published site URL in Auth redirect URLs so reset links return to this page.
   Phone-based accounts are separate from email accounts unless you explicitly link their identities.
4. **Connect the page:** Project Settings > API. Copy the Project URL and the `anon` key into the top of the script
   in `index.html` (`SUPABASE_URL` and `SUPABASE_ANON_KEY`).
5. **Connect the manual checker:** in your GitHub repo go to Settings > Secrets and variables > Actions and add:
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_SERVICE_KEY` = the `service_role` key (keep it secret; never put it in `index.html`)
6. **Publish the site:** commit everything to your repo, then Settings > Pages > deploy from the `main` branch.
7. **Deploy the authenticated check function:** from the repository root, run:
   `supabase functions deploy swift-function --project-ref ienoxjulgopijzovqoma`
   The function checks ownership for signed-in users and saves results server-side.
8. **Enable one-minute scheduled checks:** apply `supabase/migrations/20261101000000_every_minute_checks.sql` once in the Supabase SQL Editor.
   It enables Supabase Cron, pg_net, and Vault, creates a private scheduler secret, checks all saved sites every minute,
   and removes check history older than 30 days each day. The GitHub Actions checker remains available for manual runs.

Users: Supabase > Authentication > Users. Sites and results: Table Editor > `sites` and `checks`
(each table can be exported to CSV for Excel).
