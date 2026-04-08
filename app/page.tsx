import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import { IEvent } from "@/database";
//import { events } from "@/lib/constants";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const revalidate = 60; // ISR: Cache for 1 minute (60 seconds)

const Page = async () => {
  if (!BASE_URL) {
    console.error("❌ NEXT_PUBLIC_BASE_URL is not set!");
    return <div>Error: BASE_URL not configured</div>;
  }

  console.log(`📡 Fetching events from: ${BASE_URL}/api/events`);
  const response = await fetch(`${BASE_URL}/api/events`);

  if (!response.ok) {
    console.error(`❌ Failed to fetch events: ${response.status}`);
    return <div>Error loading events</div>;
  }

  const { events } = await response.json();
  console.log(`✅ Loaded ${events.length} events`);

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev Event <br /> You Can&apos;t Miss
      </h1>
      <p className="text-center mt-5">
        Hacketon, Meetups and Conferences, All in One Place
      </p>

      <ExploreBtn />

      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>

        <ul className="events list-none">
          {events &&
            events.length > 0 &&
            events.map((event: IEvent) => (
              <li key={event.title}>
                <EventCard {...event} />
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};

export default Page;
