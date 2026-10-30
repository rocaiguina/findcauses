CREATE TYPE "public"."import_source" AS ENUM('pecunia', 'observatorio');--> statement-breakpoint
CREATE TABLE "imported_orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"sources" "import_source"[] NOT NULL,
	"city" text,
	"state" text DEFAULT 'PR' NOT NULL,
	"cause" "cause" DEFAULT 'other' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"mission" text,
	"website" text,
	"email" text,
	"phone" text,
	"ein" text,
	"irs_name" text,
	"irs_match_score" integer,
	"ntee_code" text,
	"irs_checked_at" timestamp with time zone,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imported_orgs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "imported_orgs_name_key_unique" UNIQUE("name_key")
);
--> statement-breakpoint
CREATE TABLE "irs_filings" (
	"ein" text NOT NULL,
	"tax_year" integer NOT NULL,
	"form_type" text NOT NULL,
	"total_revenue" bigint,
	"total_expenses" bigint,
	"contributions" bigint,
	"program_revenue" bigint,
	"total_assets" bigint,
	"total_liabilities" bigint,
	"net_assets" bigint,
	"pdf_url" text,
	CONSTRAINT "irs_filings_ein_tax_year_pk" PRIMARY KEY("ein","tax_year")
);
--> statement-breakpoint
CREATE INDEX "imported_orgs_ein_idx" ON "imported_orgs" USING btree ("ein");