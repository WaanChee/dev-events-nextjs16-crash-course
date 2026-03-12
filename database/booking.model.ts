import mongoose, { Schema, model, Model, Types } from "mongoose";
// `import type` is erased at compile-time, so this cannot cause a circular dependency.
import type { IEvent } from "./event.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IBooking {
  /** ObjectId reference to the parent Event document. */
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

// RFC 5322-inspired regex — catches the most common malformed addresses.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      // Index improves query performance when filtering bookings by event.
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      // Normalise to lowercase so "User@Example.com" and "user@example.com"
      // are treated as the same address.
      lowercase: true,
      match: [EMAIL_REGEX, "Invalid email address."],
    },
  },
  { timestamps: true },
);

// ─── Pre-save hook ────────────────────────────────────────────────────────────

BookingSchema.pre("save", async function () {
  // Only run the existence check when eventId is first set or later changed.
  if (!this.isNew && !this.isModified("eventId")) return;

  // Retrieve the registered Event model at runtime to avoid a circular import.
  // Casting to Model<IEvent> gives us type-safe access to `.exists()`.
  const EventModel = mongoose.models.Event as Model<IEvent> | undefined;

  if (!EventModel) {
    throw new Error(
      "Event model is not registered. Ensure event.model.ts is imported before booking.model.ts.",
    );
  }

  const exists = await EventModel.exists({ _id: this.eventId });
  if (!exists) {
    throw new Error(
      `Cannot create booking: event with ID "${this.eventId}" does not exist.`,
    );
  }
});

// ─── Model ────────────────────────────────────────────────────────────────────

// Guard against "Cannot overwrite model" errors caused by Next.js hot-reloads.
export const Booking =
  (mongoose.models.Booking as Model<IBooking>) ||
  model<IBooking>("Booking", BookingSchema);
