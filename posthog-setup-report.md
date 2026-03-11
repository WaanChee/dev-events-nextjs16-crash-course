<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the DevEvent Next.js App Router project. The following changes were made:

- **`instrumentation-client.ts`** (new): Initializes PostHog client-side using the Next.js 15.3+ `instrumentation-client` pattern. Configured with a reverse proxy (`/ingest`), error tracking (`capture_exceptions: true`), and debug mode in development.
- **`next.config.ts`** (updated): Added rewrites to proxy PostHog requests through `/ingest` to reduce tracking-blocker interference. Added `skipTrailingSlashRedirect: true` as required by PostHog.
- **`components/ExploreBtn.tsx`** (updated): Added `posthog.capture('explore_events_clicked')` in the button's `onClick` handler.
- **`components/EventCard.tsx`** (updated): Added `"use client"` directive and `posthog.capture('event_card_clicked', { event_slug, event_title, event_location, event_date })` on the link's `onClick`.
- **`components/HomepageTracker.tsx`** (new): Thin client component that fires `homepage_viewed` on mount, included in the homepage to mark the top of the conversion funnel.
- **`app/page.tsx`** (updated): Imports and renders `<HomepageTracker />` so the homepage-viewed event fires on each visit.
- **`.env.local`** (updated): `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set via environment variables (never hardcoded).

| Event name | Description | File |
|---|---|---|
| `homepage_viewed` | User viewed the homepage — top of the conversion funnel for event discovery | `components/HomepageTracker.tsx` (rendered in `app/page.tsx`) |
| `explore_events_clicked` | User clicked the "Explore Events" button to scroll to the events list | `components/ExploreBtn.tsx` |
| `event_card_clicked` | User clicked on an event card to navigate to the event detail page | `components/EventCard.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/337548/dashboard/1347120)
- **Insight**: [Event Discovery Overview](https://us.posthog.com/project/337548/insights/uWrAKUYX) — Daily trend of homepage views, explore clicks, and event card clicks
- **Insight**: [Event Discovery Funnel](https://us.posthog.com/project/337548/insights/ZPa5ayWy) — Conversion funnel: Homepage Viewed → Explore Clicked → Event Card Clicked
- **Insight**: [Most Clicked Events](https://us.posthog.com/project/337548/insights/qoZM0bmy) — Bar chart of which events get the most card clicks, broken down by event title

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
