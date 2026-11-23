# Vhon Eric Mercado — portfolio

A single-page Next.js portfolio with project and certificate data, downloadable PDFs, and a Supabase-backed contact form.

## Run locally

Install Node.js 20.9 or newer. In PowerShell, open this folder and run `npm.cmd install`, then copy `.env.example` to `.env.local` and fill in the values described below. Run `npm.cmd run dev` and visit http://localhost:3000. Use `npm.cmd run lint` and `npm.cmd run build` to check the project. The site displays without Supabase credentials, but the contact form will report that it is not configured.

## Beginner deployment checklist

1. **Create a GitHub repository.** Sign in at github.com, click **+ → New repository**, name it (for example `portfolio`), and click **Create repository**. Choose an empty repository without a README. In this folder run `git init`, `git add .`, `git commit -m "Create portfolio"`, `git branch -M main`, `git remote add origin YOUR_REPOSITORY_URL`, and `git push -u origin main`. Replace the URL with the HTTPS URL shown by GitHub. Success: your files appear in the repository. If push fails, check the URL and sign in through Git's credential prompt. Never commit `.env.local`.
2. **Create Supabase.** At supabase.com/dashboard, create an account or sign in, click **New project**, choose an organization, project name, database password, and region, then click **Create new project**. Wait until the dashboard opens. Success: the project is active.
3. **Create the messages table.** In the Supabase project select **SQL Editor → New query**. Copy the entire contents of `supabase/schema.sql`, paste it, and click **Run**. Success: the editor reports success and `messages` appears in **Table Editor**. The policy allows inserts but no public reads, updates, or deletes. View messages while signed into the dashboard.
4. **Find the API values.** Click **Connect** in your Supabase project and find the project URL and legacy `anon` key (or open **Project Settings → API Keys**). Copy the project URL and public anon key, never the `service_role` or secret key. Labels may vary with dashboard updates.
5. **Configure locally.** Copy `.env.example` as `.env.local`. Put the URL after `NEXT_PUBLIC_SUPABASE_URL=`, the anon key after `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, and leave `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local testing. Restart `npm.cmd run dev` if it is already running. Submit the contact form and check **Table Editor → messages**. If it fails, verify the URL, key, SQL and that the dev server was restarted.
6. **Deploy on Vercel.** At vercel.com, sign in with GitHub, select **Add New → Project**, import the repository, and keep the detected Next.js settings. In **Environment Variables**, add the same Supabase URL and anon key. Set `NEXT_PUBLIC_SITE_URL` to your eventual production URL (for example `https://your-project.vercel.app`), then click **Deploy**. If the generated URL differs, update the variable in **Project → Settings → Environment Variables** and redeploy from **Deployments** so SEO URLs are correct. Success: Vercel shows a ready deployment and its URL opens.
7. **Test the live form.** On the live page submit a test message, look for the success message, and check the `messages` table in Supabase. If it fails, check the Vercel environment values and redeploy after changes; check the SQL, Supabase project status, and deployment logs. If it works, delete the test row from the Supabase dashboard if desired.
8. **Optional custom domain.** In Vercel open **Project → Settings → Domains**, add your domain, and follow the DNS records Vercel displays at your domain registrar. Once verified, update `NEXT_PUBLIC_SITE_URL` to the custom HTTPS domain and redeploy. Success: the domain opens the site over HTTPS.

## Updating content

- Edit `data/projects.ts` to add or change project names, descriptions, contributions, highlights, stacks and URLs. Provide only facts you can verify. To add a screenshot, place the image in `public/projects` and set its `image` field to a path such as `/projects/mana.png`. The visual initials remain as placeholders until screenshots are available.
- Edit `data/certificates.ts` to add a certificate, and put its PDF in `public/certificates`. Replace `public/resume.pdf` to update the downloadable résumé. Everything in `public` is publicly accessible after deployment; review PDFs for personal details before publishing. Serving files from the repository is simple, but updating them requires a new deployment. A Supabase public bucket allows independent file updates but makes all files in that bucket public.
- Update the copy and social links in `components/portfolio.tsx`; GitHub and missing project URLs are currently marked as coming soon. Set `NEXT_PUBLIC_SITE_URL` to the final production origin for metadata and sitemap.

## Contact form limitations

The form validates input with Zod, uses a honeypot, and limits attempts in memory per reported IP. This limit is best-effort: serverless instances do not share memory, IP headers can vary, and clients can bypass the API by calling Supabase directly with the public anon key. The RLS policy intentionally permits direct public inserts and denies public reads, but it does not prevent spam. For production abuse protection, add a shared rate limiter and CAPTCHA or move insertion behind a protected server endpoint with an appropriate server-only credential. Never expose a service-role key in client code.
