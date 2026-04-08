import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { getSimilarEventsBySlug } from "@/lib/actions/event.actions";
import { IEvent, Event } from "@/database";
import EventCard from "@/components/EventCard";
import connectDB from "@/lib/mongodb";

export const dynamicParams = true; // Enable on-demand route generation
export const revalidate = 60; // Revalidate cache every 60 seconds

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
        // Fall back to comma-separated parsing below.
      }
    }

    if (trimmed.includes(",")) {
      return trimmed.split(",").map(sanitize).filter(Boolean);
    }

    return [sanitize(trimmed)].filter(Boolean);
  }

  return [];
};

const EventDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  try {
    await connectDB();
  } catch (error) {
    console.error("❌ Database connection failed in event page:", error);
    return notFound();
  }

  const eventDoc = await Event.findOne({ slug }).lean();

  if (!eventDoc) {
    console.warn(`⚠️ Event not found for slug: ${slug}`);
    return notFound();
  }

  const event = eventDoc as any;
  const eventId = event._id?.toString();

  if (!eventId) {
    return notFound();
  }

  const {
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
  } = event;

  if (!description) return notFound();

  const normalizedAgenda = normalizeStringArray(agenda);
  const normalizedTags = normalizeStringArray(tags);

  const bookings = 10;

  const similarEvents: IEvent[] = await getSimilarEventsBySlug(slug);

  console.log("Similar Events:", similarEvents);

  return (
    <section id="event">
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p>
      </div>

      <div className="details">
        {/* Left side - Event Content */}
        <div className="content">
          <Image
            src={image}
            alt="Event Banner"
            width={800}
            height={800}
            className="banner"
          />

          <section>
            <h2 className="flex-col-gap-2">Overview</h2>
            <p>{overview}</p>
          </section>

          <section>
            <h2 className="flex-col-gap-2">Event Details</h2>

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

          <EventAgenda agendaItems={normalizedAgenda} />

          <section className="flex-col-gap-2">
            <h2>About the Organizer</h2>
            <p>{organizer}</p>
          </section>

          <EventTags tags={normalizedTags} />
        </div>

        {/* Right side - Booking Form */}
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

            <BookEvent eventId={event._id} slug={event.slug} />
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

export async function generateStaticParams() {
  try {
    await connectDB();
    const events = await Event.find({}, { slug: 1 }).lean();

    if (!events || events.length === 0) {
      console.warn(
        "⚠️ No events found in database during generateStaticParams",
      );
      return [];
    }

    console.log(`✅ Generated static params for ${events.length} events`);
    return events.map((event) => ({
      slug: event.slug,
    }));
  } catch (error) {
    console.error("❌ generateStaticParams failed:", error);
    // Return empty array - routes will be generated on-demand with dynamicParams = true
    return [];
  }
}
