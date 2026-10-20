# Garou Archive

A dark, responsive, English-language One-Punch Man / Garou media gallery built with Vite, TypeScript, and GitHub Pages.

## Add media (the only file you need to edit)

Open `media.txt` and add one item per line:

```text
https://cdn.example.com/garou.webp "Cosmic Garou"
https://cdn.example.com/fight.mp4 "Garou vs Saitama"
```

Rules:
- One URL followed by a title in double quotes.
- Use direct media URLs, not links to a page containing an image/video.
- The URL should end with a recognizable file extension (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`, `.mp4`, `.webm`, etc.).
- Lines starting with `#` and blank lines are ignored.
- Commit and push to `main`. GitHub Actions builds the catalog and deploys the site.

The generated catalog is `public/media.json`; do not edit it manually.

## Publish on GitHub Pages

1. Create a GitHub repository named **garou-archive** under `mesflit`.
2. Upload/push these project files to the repository's `main` branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Open **Actions** and wait for “Build and deploy Garou Archive” to finish.
6. The site will be available at `https://mesflit.github.io/garou-archive/`.

The workflow runs on every push to `main` and can also be started manually from Actions.

## Run locally

Install Node.js 22 or newer, then run:

```bash
npm install
npm run dev
```

Vite prints a local URL. The production build can be tested with:

```bash
npm run build
npm run preview
```

## Features

- Responsive masonry-style image and video feed
- Search by title/tags
- Image/video/saved filters and sorting
- Fullscreen viewer, keyboard navigation, and video playback
- Local favorites saved in the browser
- Share and original-file links
- Automatic media catalog generation
- GitHub Actions deployment
- Dark MesOS-inspired navy and violet styling

## Notes

- GitHub Pages is static hosting. It does not provide user accounts, shared comments, or a central like counter.
- Favorites are saved in the current browser only.
- External hosts may block hotlinking or downloads. The site cannot bypass those restrictions.
- A `download` link is best-effort: browser and remote-server policies can cause the file to open in a new tab instead.
- This is an unofficial fan project. Respect copyright and link to legitimate sources. Remove content when requested by the relevant rights holder.
