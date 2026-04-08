import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import Event from "@/database/event.model";
const parseFormStringArray = (
  value: FormDataEntryValue | null,
  fieldName: "tags" | "agenda",
): string[] => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be provided as text.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const sanitize = (item: string) => item.trim().replace(/^["']|["']$/g, "");
  const toCleanArray = (items: unknown[]): string[] =>
    items
      .filter((item): item is string => typeof item === "string")
      .map(sanitize)
      .filter(Boolean);

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return toCleanArray(parsed);
    }

    if (typeof parsed === "string") {
      return parseFormStringArray(parsed, fieldName);
    }

    return [];
  }

  if (trimmed.includes(",")) {
    return trimmed.split(",").map(sanitize).filter(Boolean);
  }

  return [sanitize(trimmed)].filter(Boolean);
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

    let event;

    try {
      event = Object.fromEntries(formData.entries());
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON data format" },
        { status: 400 },
      );
    }

    const file = formData.get("image") as File;

    if (!file)
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 },
      );

    const tags = parseFormStringArray(formData.get("tags"), "tags");
    const agenda = parseFormStringArray(formData.get("agenda"), "agenda");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: "image", folder: "DevEvent" },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          },
        )
        .end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda,
    });

    return NextResponse.json(
      {
        message: "Event Created successfully",
        event: createdEvent,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message: "Event Creation Failed",
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find().sort({ createdAt: -1 });

    return NextResponse.json(
      { message: "Events fetched successfully", events },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { message: "Event fetching failed", error: e },
      { status: 500 },
    );
  }
}
