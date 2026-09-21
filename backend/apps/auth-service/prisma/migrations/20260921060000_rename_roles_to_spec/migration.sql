-- Align UserRole with the SD-Group 8 specification:
--   ADMIN -> admin, ORGANIZER/SPEAKER -> facilitator, ATTENDEE -> participant
--
-- Postgres cannot rename enum values in place while a column depends on them,
-- so this builds the new type, converts the column with an explicit mapping,
-- then swaps the types over.

CREATE TYPE "UserRole_new" AS ENUM ('admin', 'facilitator', 'participant');

-- The default must go first; it still references the old type.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN'     THEN 'admin'
      WHEN 'ORGANIZER' THEN 'facilitator'
      WHEN 'SPEAKER'   THEN 'facilitator'
      WHEN 'ATTENDEE'  THEN 'participant'
    END
  )::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'participant';
