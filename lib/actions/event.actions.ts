"use server";

import Event from "@/database/event.model";
import connectDB from "@/lib/mongodb";
import { IEvent } from "@/database";

export const getSimilarEventsBySlug = async (
  slug: string,
): Promise<IEvent[]> => {
  "use cache";

  try {
    await connectDB();

    const event = await Event.findOne({ slug }).lean();
    if (!event) {
      console.warn(
        `⚠️ getSimilarEventsBySlug: no event found for slug "${slug}"`,
      );
      return [];
    }

    const similar = await Event.find({
      _id: { $ne: event._id },
      tags: { $in: event.tags },
    }).lean();

    console.log(
      `✅ [Cache MISS] getSimilarEventsBySlug: found ${similar.length} similar events for "${slug}"`,
    );

    return similar as IEvent[];
  } catch (error) {
    console.error(
      "❌ getSimilarEventsBySlug failed:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
};
