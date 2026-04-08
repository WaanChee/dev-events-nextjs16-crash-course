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
  try {
    await connectDB();
    const event = await Event.findOne({ slug });
    if (!event) {
      return { success: false, error: "Event not found" };
    }
    await Booking.create({ eventId: event._id, email });

    return { success: true };
  } catch (e) {
    console.error("Create booking failed!", e);
    return { success: false };
  }
};
