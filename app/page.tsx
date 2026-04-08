import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import { IEvent, Event } from "@/database";
import connectDB from "@/lib/mongodb";

export const revalidate = 60; // ISR: revalidate every 60 seconds

const Page = async () => {
  await connectDB();
  const events: IEvent[] = await Event.find().sort({ createdAt: -1 }).lean();

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
