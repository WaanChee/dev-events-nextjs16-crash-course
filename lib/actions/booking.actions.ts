"use server";

import { Booking, Event } from "@/database";
import connectDB from "@/lib/mongodb";

export const createBooking = async ({
  slug,
  email,
}: {
  slug: string;
  email: string;
}) => {
  // Note: "use cache" is intentionally NOT used here.
  // Bookings are write operations — they must always hit the DB.
  try {
    await connectDB();

    const event = await Event.findOne({ slug });
    if (!event) {
      console.warn(`⚠️ createBooking: event not found for slug "${slug}"`);
      return { success: false, error: "Event not found" };
    }

    await Booking.create({ eventId: event._id, email });

    console.log(`✅ Booking created — slug: "${slug}", email: "${email}"`);
    return { success: true };
  } catch (error) {
    console.error(
      `❌ createBooking failed — slug: "${slug}", email: "${email}"`,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false };
  }
};
