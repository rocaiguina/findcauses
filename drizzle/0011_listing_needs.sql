CREATE TABLE "listing_needs" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"type" "funding_type" NOT NULL,
	"amount" bigint,
	"timeframe" text,
	"description" text NOT NULL,
	"example" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_needs" ADD CONSTRAINT "listing_needs_imported_org_id_imported_orgs_id_fk" FOREIGN KEY ("imported_org_id") REFERENCES "public"."imported_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_needs_org_idx" ON "listing_needs" USING btree ("imported_org_id","position");