// Single import point for all database models and their TypeScript interfaces.
// Import Event before Booking so the Event model is registered in
// mongoose.models by the time Booking's pre-save hook looks it up.

export { default as Event } from "./event.model";
export type { IEvent, EventMode } from "./event.model";

export { Booking } from "./booking.model";
export type { IBooking } from "./booking.model";
