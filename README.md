# Box & Ladder

A static blog for TryHackMe and Hack The Box writeups.

## Quick start
- Open `index.html` in a browser to preview locally.
- Duplicate a template in `posts/` and rename it for each new writeup.

## Protected admin
- The public site no longer links to the admin route.
- `/admin` is served by a Vercel function and requires a valid HTTP-only session cookie before the editor HTML is returned.
- The login form posts to `/api/login`, the password lives in environment variables, and no password hash is shipped in public JavaScript.
- Local secrets belong in `.env.local`, which is gitignored. Use `.env.example` as the template.
- `/admin.html` redirects to `/admin` so old bookmarks keep working without leaving a public static admin file in the site root.
- GitHub Pages cannot enforce this server-side protection. Use Vercel or another host that supports server logic for the protected admin route.

## Deploy
### GitHub Pages
1. Create a repo and push this folder.
2. In repo Settings > Pages, set the source to the `main` branch and root `/`.
3. Save and wait for the Pages URL.

GitHub Pages can host the public blog, but it cannot protect `/admin` with server-side auth.

### Vercel
1. Import the repo into Vercel.
2. Framework preset: `Other`.
3. Build command: leave empty.
4. Output directory: `/`.
5. Add `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` as environment variables in the Vercel project settings.
