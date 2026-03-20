import Event, { IEvent } from "@/database/event.model";
import connectDB from "@/lib/mongodb";
import mongoose, { HydratedDocument } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug?: string;
  }>;
};

type SlugValidationResult =
  | { isValid: true; value: string }
  | { isValid: false; message: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

/**
 * Validates and normalizes a slug from route params.
 */
function validateSlug(rawSlug: string | undefined): SlugValidationResult {
  if (!rawSlug) {
    return {
      isValid: false,
      message: "Missing required route parameter: slug.",
    };
  }

  const normalizedSlug = rawSlug.trim().toLowerCase();

  if (!normalizedSlug) {
    return { isValid: false, message: "The slug parameter cannot be empty." };
  }

  if (normalizedSlug.length > MAX_SLUG_LENGTH) {
    return {
      isValid: false,
      message: `Invalid slug: maximum length is ${MAX_SLUG_LENGTH} characters.`,
    };
  }

  if (!SLUG_PATTERN.test(normalizedSlug)) {
    return {
      isValid: false,
      message:
        "Invalid slug format. Use lowercase letters, numbers, hyphens, or underscores.",
    };
  }

  return { isValid: true, value: normalizedSlug };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  // In modern Next.js route handlers, dynamic params are async.
  const { slug } = await context.params;
  const slugValidation = validateSlug(slug);

  if (!slugValidation.isValid) {
    return NextResponse.json(
      { message: slugValidation.message },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const event: HydratedDocument<IEvent> | null = await Event.findOne({
      slug: slugValidation.value,
    })
      .select("-__v")
      .exec();

    if (!event) {
      return NextResponse.json(
        {
          message: `Event with slug "${slugValidation.value}" was not found.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Event fetched successfully.", event },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          message: "Validation error while retrieving the event.",
          details: Object.values(error.errors).map(
            (validationError) => validationError.message,
          ),
        },
        { status: 400 },
      );
    }

    console.error("Failed to fetch event by slug:", error);
    return NextResponse.json(
      {
        message: "Unexpected error while fetching event.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
