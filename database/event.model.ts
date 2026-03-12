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
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // strip special characters
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse consecutive hyphens

  if (!slug) {
    throw new Error(
      `Title "${title}" does not contain any URL-safe characters and cannot produce a valid slug.`,
    );
  }

  return slug;
}

/**
 * Normalises a date string to YYYY-MM-DD.
 * Strings already in that format are returned unchanged to avoid any
 * timezone-induced day shifts that `new Date()` can introduce.
 */
function normalizeDate(date: string): string {
  const trimmed = date.trim();
  const invalidDateError = new Error(
    `Invalid date: "${date}". Use YYYY-MM-DD or a recognisable date string.`,
  );

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yearStr, monthStr, dayStr] = trimmed.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Date.UTC months are 0-indexed; if the date overflows (e.g. Feb 31)
    // the resulting Date will have different year/month/day values.
    const utc = new Date(Date.UTC(year, month - 1, day));
    if (
      utc.getUTCFullYear() !== year ||
      utc.getUTCMonth() !== month - 1 ||
      utc.getUTCDate() !== day
    ) {
      throw invalidDateError;
    }

    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw invalidDateError;
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
  const invalidTimeError = new Error(
    `Invalid time: "${time}". Use HH:MM (24-hour) or H:MM AM/PM.`,
  );

  // 12-hour format: H:MM AM/PM
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      throw invalidTimeError;
    }
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  // 24-hour format: H:MM or HH:MM or HH:MM:SS
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    const seconds = match24[3] !== undefined ? parseInt(match24[3], 10) : undefined;

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      (seconds !== undefined && (seconds < 0 || seconds > 59))
    ) {
      throw invalidTimeError;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  throw invalidTimeError;
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
        validator: (v: string[]) =>
          v.length > 0 && v.every((item) => item.trim().length > 0),
        message: "Agenda must contain at least one item.",
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) =>
          v.length > 0 && v.every((item) => item.trim().length > 0),
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
