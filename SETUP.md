# Setup (about 10 minutes)

1. **Create a free Supabase project** at supabase.com. It stores accounts, sites and check results.
2. **Create the tables:** SQL Editor > New query > paste `supabase/schema.sql` > Run.
3. **Sign-up emails (optional):** Authentication > Providers > Email. Turn off "Confirm email" for instant sign-up.
4. **Connect the page:** Project Settings > API. Copy the Project URL and the `anon` key into the top of the script
   in `index.html` (`SUPABASE_URL` and `SUPABASE_ANON_KEY`).
5. **Connect the checker:** in your GitHub repo go to Settings > Secrets and variables > Actions and add:
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_SERVICE_KEY` = the `service_role` key (keep it secret; never put it in index.html)
6. **Publish the site:** commit everything to your repo, then Settings > Pages > deploy from the `main` branch.
7. **Test the checker:** Actions tab > "Check sites" > Run workflow.

Users: Supabase > Authentication > Users. Sites and results: Table Editor > `sites` and `checks`
(each table can be exported to CSV for Excel).
Note: GitHub runs scheduled jobs about every 5 minutes, sometimes later.
