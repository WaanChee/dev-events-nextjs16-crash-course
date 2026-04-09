import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { getSimilarEventsBySlug } from "@/lib/actions/event.actions";
import { IEvent, Event } from "@/database";
import EventCard from "@/components/EventCard";
import connectDB from "@/lib/mongodb";
import { cacheLife } from "next/dist/server/use-cache/cache-life";

// ─── Sub-components ───────────────────────────────────────────────────────────

const EventDetailItem = ({
  icon,
  alt,
  label,
}: {
  icon: string;
  alt: string;
  label: string;
}) => (
  <div className="flex-row-gap-2 items-center">
    <Image src={icon} alt={alt} width={17} height={17} />
    <p>{label}</p>
  </div>
);

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
  <div className="agenda">
    <h2>Agenda</h2>
    <ul>
      {agendaItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

const EventTags = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-row gap-1.5 flex-wrap">
    {tags.map((tag) => (
      <div className="pill" key={tag}>
        {tag}
      </div>
    ))}
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeStringArray = (value: unknown): string[] => {
  const sanitize = (item: string) => item.trim().replace(/^["']|["']$/g, "");

  if (Array.isArray(value)) {
    if (
      value.length === 1 &&
      typeof value[0] === "string" &&
      value[0].trim().startsWith("[")
    ) {
      return normalizeStringArray(value[0]);
    }
    return value
      .filter((item): item is string => typeof item === "string")
      .map(sanitize)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === "string")
            .map(sanitize)
            .filter(Boolean);
        }
      } catch {
        // fall through to comma-separated
      }
    }

    if (trimmed.includes(",")) {
      return trimmed.split(",").map(sanitize).filter(Boolean);
    }

    return [sanitize(trimmed)].filter(Boolean);
  }

  return [];
};

// ─── Cached data fetch ────────────────────────────────────────────────────────
// stale: 60s  — serve from cache for up to 60 seconds without hitting the DB
// revalidate: 60s — revalidate in the background after 60 seconds
// expire: 3600s — fully expire the cache entry after 1 hour

type EventData = {
  eventId: string;
  slug: string;
  description: string;
  image: string;
  overview: string;
  date: string;
  time: string;
  location: string;
  mode: string;
  agenda: string[];
  audience: string;
  tags: string[];
  organizer: string;
  similarEvents: IEvent[];
};

async function getEventData(slug: string): Promise<EventData | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });

  try {
    await connectDB();

    const eventDoc = await Event.findOne({ slug }).lean();

    if (!eventDoc) {
      console.warn(`⚠️ [Cache MISS] Event not found for slug: "${slug}"`);
      return null;
    }

    console.log(`✅ [Cache MISS] Fetched event from DB: "${slug}"`);

    const event = eventDoc as IEvent & { _id: { toString(): string } };
    if (!event.description) return null;

    const similarEvents: IEvent[] = await getSimilarEventsBySlug(slug);

    return {
      eventId: event._id.toString(),
      slug: event.slug,
      description: event.description,
      image: event.image,
      overview: event.overview,
      date: event.date,
      time: event.time,
      location: event.location,
      mode: event.mode,
      agenda: normalizeStringArray(event.agenda),
      audience: event.audience,
      tags: normalizeStringArray(event.tags),
      organizer: event.organizer,
      similarEvents,
    };
  } catch (error) {
    console.error(
      "❌ getEventData failed for slug:",
      slug,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

const EventDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  const data = await getEventData(slug);
  if (!data) return notFound();

  const {
    eventId,
    description,
    image,
    overview,
    date,
    time,
    location,
    mode,
    agenda,
    audience,
    tags,
    organizer,
    similarEvents,
  } = data;

  const bookings = 10;

  return (
    <section id="event">
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p>
      </div>

      <div className="details">
        <div className="content">
          <Image
            src={image}
            alt="Event Banner"
            width={800}
            height={800}
            className="banner"
          />

          <section>
            <h2>Overview</h2>
            <p>{overview}</p>
          </section>

          <section>
            <h2>Event Details</h2>
            <EventDetailItem
              icon="/icons/calendar.svg"
              alt="Calendar"
              label={date}
            />
            <EventDetailItem icon="/icons/clock.svg" alt="Time" label={time} />
            <EventDetailItem
              icon="/icons/pin.svg"
              alt="Location"
              label={location}
            />
            <EventDetailItem icon="/icons/mode.svg" alt="Mode" label={mode} />
            <EventDetailItem
              icon="/icons/audience.svg"
              alt="Audience"
              label={audience}
            />
          </section>

          <EventAgenda agendaItems={agenda} />

          <section className="flex-col-gap-2">
            <h2>About the Organizer</h2>
            <p>{organizer}</p>
          </section>

          <EventTags tags={tags} />
        </div>

        <aside className="booking">
          <div className="signup-card">
            <h2>Book Your Spot</h2>
            {bookings > 0 ? (
              <p className="text-sm">
                Join {bookings} people who have already booked their spot!
              </p>
            ) : (
              <p className="text-sm">Be the first to book your spot!</p>
            )}
            <BookEvent eventId={eventId} slug={slug} />
          </div>
        </aside>
      </div>

      <div className="flex w-full flex-col gap-4 pt-20">
        <h2>Similar Events</h2>
        <div className="events">
          {similarEvents.length > 0 &&
            similarEvents.map((similarEvent: IEvent) => (
              <EventCard key={similarEvent.title} {...similarEvent} />
            ))}
        </div>
      </div>
    </section>
  );
};

export default EventDetailsPage;

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    await connectDB();
    const events = await Event.find({}, { slug: 1 }).lean();
    if (!events || events.length === 0) return [];
    console.log(
      `✅ generateStaticParams: pre-built ${events.length} event routes`,
    );
    return events.map((event) => ({ slug: event.slug }));
  } catch (error) {
    console.error(
      "❌ generateStaticParams failed:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}
