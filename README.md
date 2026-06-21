# Copenhagen Bachata Calendar

A community-driven calendar for discovering bachata events in and around Copenhagen.

Copenhagen Bachata Calendar helps dancers, organizers, and newcomers find what is happening in the local bachata scene without having to search across many different channels.

The goal of the project is to make it easier for dancers to:

- Discover upcoming socials, parties, workshops, and festivals.
- Save events they are interested in.
- Export events to their personal calendar.
- Browse events in both list and calendar views.
- Help keep the calendar up to date by submitting missing events.

## Why this project exists

Event information is often scattered across:

- Facebook events
- WhatsApp groups
- Messenger chats
- Individual organizer pages
- Social media posts

Copenhagen Bachata Calendar aims to provide a single place where the community can discover and track upcoming events.

## Features

Current functionality includes:

### Event Discovery

- Browse events in a list view.
- Browse events in a calendar view.
- Search and filter events.
- View detailed event information.

### Personal Planning

- Save events to My Events.
- Export individual events to calendar (`.ics`).
- Export all saved events.

### Community Contributions

- Submit missing events.
- Admin review workflow for community submissions.

### Administration

- Organizer event management.
- Admin moderation tools.
- Pending submission review.

## Community Focus

This project is intended to be community-driven.

If you notice an event missing from the calendar, you can submit it directly through the application and it will be reviewed before being published.

The goal is to make event discovery easier for everyone in the Copenhagen bachata community.

## Created By

Copenhagen Bachata Calendar is created and maintained by Dancemaniacs Kasia & Dominik.

International bachata teachers, performers, DJs, and community organizers based in Copenhagen, they have taught, performed, judged competitions, and contributed to dance events across Denmark and abroad. They are also the creators of the Bachata Freedom concept, which focuses on musicality, creativity, connection, and freedom of expression in partner dancing.

They created Copenhagen Bachata Calendar to make event discovery easier for dancers, organizers, and newcomers by bringing scattered event information into one community-driven platform.

Social media:

- Instagram: <https://www.instagram.com/dancemaniacs_kasiadominik>
- Facebook: <https://www.facebook.com/dancemaniacskd>

## Contact & Community

If you notice:

- Missing events
- Incorrect event information
- Duplicate events

Please use the Submit Event feature inside the application.

## Roadmap

Potential future improvements:

- Native mobile calendar sharing.
- Additional event categories and filters.
- Improved mobile discovery experience.
- Organizer ownership and collaboration features.

## Technical Information

### Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase project URL and anon key.

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

## Hosting

### Production: Netlify

Netlify deploys production from the `release` branch. Build command: `npm run build`. Publish directory: `dist`.

To release production, manually run the `Promote master to release` GitHub Actions workflow. It force-updates `release` to match `master`, and Netlify then deploys production from `release`.

### Dev/Staging: GitHub Pages

GitHub Pages deploys automatically from the `master` branch via the `.github/workflows/deploy-pages.yml` workflow. The same workflow can also be run manually to deploy any selected branch for temporary preview testing before merging to `master`.

To preview a feature branch on GitHub Pages:

1. Go to the repository's **Actions** tab.
2. Select the **Deploy GitHub Pages** workflow.
3. Click **Run workflow**.
4. Enter the branch name to deploy. The input defaults to `master`.
5. Open the GitHub Pages URL after the deployment completes.

Important: GitHub Pages has only one active deployment per repository, so manually deploying a feature branch temporarily replaces the current Pages preview until `master` is deployed again.

The GitHub Pages URL format is:

```text
https://OWNER.github.io/cph-bachata-app/
```

The workflow builds with `VITE_BASE_PATH=/cph-bachata-app/` so Vite assets resolve under the repository path. Netlify keeps the default `/` base path.

Known limitation: Vue Router was not changed for this setup, so direct refreshes on nested GitHub Pages routes such as `/management` may not work.
