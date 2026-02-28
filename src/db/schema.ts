import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core"

export const linkPrecedenceEnum = pgEnum("link_precedence", [
  "primary",
  "secondary",
])

export const contacts = pgTable("contact", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  linkedId: integer("linked_id").references((): any => contacts.id, {
    onDelete: "set null",
  }),
  linkPrecedence: linkPrecedenceEnum("link_precedence")
    .notNull()
    .default("primary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
