CREATE TYPE "public"."funder_status" AS ENUM('active', 'open', 'not_looking');--> statement-breakpoint
CREATE TYPE "public"."funder_type" AS ENUM('individual', 'family_foundation', 'private_foundation', 'corporate', 'daf', 'government');--> statement-breakpoint
CREATE TYPE "public"."funding_type" AS ENUM('general_operating', 'program', 'capital', 'capacity', 'emergency');--> statement-breakpoint
CREATE TABLE "funders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "funder_type" NOT NULL,
	"status" "funder_status" NOT NULL,
	"causes" "cause"[] DEFAULT '{}' NOT NULL,
	"states" text[] DEFAULT '{}'::text[] NOT NULL,
	"funding_types" "funding_type"[] DEFAULT '{}' NOT NULL,
	"org_budget_min" bigint,
	"org_budget_max" bigint,
	"gift_min" bigint,
	"gift_max" bigint,
	"requires_990" boolean DEFAULT false NOT NULL,
	"requires_audit" boolean DEFAULT false NOT NULL,
	"min_irs_years" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_needs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"type" "funding_type" NOT NULL,
	"amount" bigint NOT NULL,
	"timeframe" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funding_needs" ADD CONSTRAINT "funding_needs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funding_needs_org_idx" ON "funding_needs" USING btree ("org_id","position");