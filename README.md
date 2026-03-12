# Box & Ladder

A static blog for TryHackMe and Hack The Box writeups.

## Quick start
- Open `index.html` in a browser to preview locally.
- Duplicate a template in `posts/` and rename it for each new writeup.

## Admin password
- `admin.html` is protected by a client-side password gate for casual lockout in the browser.
- The current default password is `changeme`.
- Change the password by replacing the SHA-256 hash in `assets/admin-auth.js` with the hash of your own password.
- This is not real server-side security. Anyone with the site files can still inspect the frontend code.

## Deploy
### GitHub Pages
1. Create a repo and push this folder.
2. In repo Settings > Pages, set the source to the `main` branch and root `/`.
3. Save and wait for the Pages URL.

### Vercel
1. Import the repo into Vercel.
2. Framework preset: `Other`.
3. Build command: leave empty.
4. Output directory: `/`.
