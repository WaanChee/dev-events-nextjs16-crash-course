import mongoose, { Schema, model, Model } from "mongoose";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventMode = "online" | "offline" | "hybrid";

export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  /** Stored in YYYY-MM-DD ISO format (normalised in pre-save hook). */
  date: string;
  /** Stored in HH:MM 24-hour format (normalised in pre-save hook). */
  time: string;
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts a title into a URL-friendly slug (lowercase, hyphen-separated). */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // strip special characters
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse consecutive hyphens
}

/**
 * Normalises a date string to YYYY-MM-DD.
 * Strings already in that format are returned unchanged to avoid any
 * timezone-induced day shifts that `new Date()` can introduce.
 */
function normalizeDate(date: string): string {
  const trimmed = date.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid date: "${date}". Use YYYY-MM-DD or a recognisable date string.`,
    );
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Normalises a time string to HH:MM (24-hour clock).
 * Accepts:
 *  - 24-hour:  "14:30", "9:05", "14:30:00"
 *  - 12-hour:  "2:30 PM", "9:05 am"
 */
function normalizeTime(time: string): string {
  const trimmed = time.trim();

  // 12-hour format: H:MM AM/PM
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // 24-hour format: H:MM or HH:MM or HH:MM:SS
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    return `${String(parseInt(match24[1], 10)).padStart(2, "0")}:${match24[2]}`;
  }

  throw new Error(
    `Invalid time: "${time}". Use HH:MM (24-hour) or H:MM AM/PM.`,
  );
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const EVENT_MODES: EventMode[] = ["online", "offline", "hybrid"];

// Keys whose values must be non-empty strings (used in the validation pass below).
type RequiredStringKey =
  | "title"
  | "description"
  | "overview"
  | "image"
  | "venue"
  | "location"
  | "date"
  | "time"
  | "audience"
  | "organizer";

const REQUIRED_STRING_KEYS: RequiredStringKey[] = [
  "title",
  "description",
  "overview",
  "image",
  "venue",
  "location",
  "date",
  "time",
  "audience",
  "organizer",
];

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    // slug is set by the pre-save hook; unique index enforced below
    slug: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, enum: EVENT_MODES },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Agenda must contain at least one item.",
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Tags must contain at least one item.",
      },
    },
  },
  { timestamps: true },
);

// Unique index on slug for fast lookups and duplicate prevention.
EventSchema.index({ slug: 1 }, { unique: true });

// ─── Pre-save hook ────────────────────────────────────────────────────────────

EventSchema.pre("save", function () {
  // Validate that required string fields are not blank.
  // (trim: true strips whitespace, so an all-whitespace input becomes ""
  //  and `required` catches it — this pass gives a descriptive field name.)
  for (const field of REQUIRED_STRING_KEYS) {
    if (!this[field].trim()) {
      throw new Error(`Field "${field}" must not be empty.`);
    }
  }

  // Auto-generate slug from title; only re-run when the title has changed.
  if (this.isModified("title")) {
    this.slug = generateSlug(this.title);
  }

  // Normalise date to YYYY-MM-DD and time to HH:MM before persisting.
  if (this.isModified("date")) this.date = normalizeDate(this.date);
  if (this.isModified("time")) this.time = normalizeTime(this.time);
});

// ─── Model ────────────────────────────────────────────────────────────────────

// Guard against "Cannot overwrite model" errors caused by Next.js hot-reloads.
export const Event =
  (mongoose.models.Event as Model<IEvent>) ||
  model<IEvent>("Event", EventSchema);
