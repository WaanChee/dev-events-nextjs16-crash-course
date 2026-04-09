import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import { IEvent, Event } from "@/database";
import connectDB from "@/lib/mongodb";
import { cacheLife } from "next/dist/server/use-cache/cache-life";

// ─── Cached data fetch ────────────────────────────────────────────────────────
// stale: 60s  — serve from cache for up to 60 seconds without hitting the DB
// revalidate: 60s — revalidate in the background after 60 seconds
// expire: 3600s — fully expire the cache entry after 1 hour

async function getAllEvents(): Promise<IEvent[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });

  try {
    await connectDB();
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    console.log(`✅ [Cache MISS] Fetched ${events.length} events from DB`);
    return events as IEvent[];
  } catch (error) {
    console.error(
      "❌ getAllEvents failed:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = async () => {
  const events = await getAllEvents();

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev Event <br /> You Can&apos;t Miss
      </h1>
      <p className="text-center mt-5">
        Hacketon, Meetups and Conferences, All in One Place
      </p>

      <ExploreBtn />

      <div id="events" className="mt-20 space-y-7">
        <h3>Featured Events</h3>

        <ul className="events list-none">
          {events.length > 0 ? (
            events.map((event: IEvent) => (
              <li key={event.title}>
                <EventCard {...event} />
              </li>
            ))
          ) : (
            <p className="text-light-200">No events found.</p>
          )}
        </ul>
      </div>
    </section>
  );
};

export default Page;
