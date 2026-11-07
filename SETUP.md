# Setup (about 10 minutes)

1. **Create a Supabase project** at supabase.com. It stores accounts, sites and check results.
2. **Create the tables:** SQL Editor > New query > paste `supabase/schema.sql` > Run.
3. **Sign-up emails (optional):** Authentication > Providers > Email. Turn off "Confirm email" for instant sign-up.
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
