CREATE TYPE "public"."cause" AS ENUM('climate-change', 'economy', 'fiscal-policy', 'civil-rights', 'energy-infrastructure', 'arts-culture', 'recreation-sports', 'other');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "board_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"affiliation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financials" (
	"org_id" uuid NOT NULL,
	"fiscal_year" text NOT NULL,
	"total_revenue" bigint NOT NULL,
	"contributions" bigint NOT NULL,
	"program_revenue" bigint NOT NULL,
	"total_expenses" bigint NOT NULL,
	"program_expenses" bigint NOT NULL,
	"management_expenses" bigint NOT NULL,
	"fundraising_expenses" bigint NOT NULL,
	"total_assets" bigint NOT NULL,
	"net_assets" bigint NOT NULL,
	"employees" integer NOT NULL,
	"volunteers" integer NOT NULL,
	CONSTRAINT "financials_org_id_fiscal_year_pk" PRIMARY KEY("org_id","fiscal_year")
);
--> statement-breakpoint
CREATE TABLE "form990_files" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"year" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_ties" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "org_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"sample" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"ein" text NOT NULL,
	"website" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"year_founded" integer NOT NULL,
	"geographic_scope" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_title" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"cause" "cause" NOT NULL,
	"focus_areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"mission" text NOT NULL,
	"independent_audit" boolean NOT NULL,
	"auditor" text NOT NULL,
	"conflict_of_interest_policy" boolean NOT NULL,
	"whistleblower_policy" boolean NOT NULL,
	"document_retention_policy" boolean NOT NULL,
	"funder_reporting" text NOT NULL,
	"impact_measurement" text NOT NULL,
	"restricted_funds" text NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"timeframe" text NOT NULL,
	"goal" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financials" ADD CONSTRAINT "financials_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form990_files" ADD CONSTRAINT "form990_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_metrics" ADD CONSTRAINT "impact_metrics_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_ties" ADD CONSTRAINT "network_ties_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_members_org_idx" ON "board_members" USING btree ("org_id","position");--> statement-breakpoint
CREATE INDEX "impact_metrics_org_idx" ON "impact_metrics" USING btree ("org_id","position");--> statement-breakpoint
CREATE INDEX "milestones_org_idx" ON "milestones" USING btree ("org_id","position");--> statement-breakpoint
CREATE INDEX "network_ties_org_idx" ON "network_ties" USING btree ("org_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_ein_active_idx" ON "organizations" USING btree ("ein") WHERE "organizations"."status" <> 'rejected';--> statement-breakpoint
CREATE INDEX "organizations_status_cause_idx" ON "organizations" USING btree ("status","cause");--> statement-breakpoint
CREATE INDEX "roadmap_items_org_idx" ON "roadmap_items" USING btree ("org_id","position");