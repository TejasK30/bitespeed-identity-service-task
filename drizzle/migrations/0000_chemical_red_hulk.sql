CREATE TYPE "public"."link_precedence" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TABLE "contact" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text,
	"email" text,
	"linked_id" integer,
	"link_precedence" "link_precedence" DEFAULT 'primary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_linked_id_contact_id_fk" FOREIGN KEY ("linked_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;