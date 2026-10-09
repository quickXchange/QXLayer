import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { whiteLabelEventsTable } from "./white-label-requests";

// Notifications are real customer-visible order events, not an outbound-send claim.
export const customerNotificationReadsTable = pgTable("customer_notification_reads", {
  customerUserId: text("customer_user_id").notNull(),
  eventId: uuid("event_id").notNull().references(() => whiteLabelEventsTable.id),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.customerUserId, t.eventId] })]);
