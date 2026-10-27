-- T-44: a request that was accepted before the messages existed gets its note as the first message, at the time of the
-- accept, and the person who accepted has read it. The id is a UUIDv7 of that time (ADR-0015); the function is for this session only.
CREATE OR REPLACE FUNCTION pg_temp.uuid_v7(ts timestamptz) RETURNS uuid LANGUAGE sql VOLATILE AS $$
  SELECT encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid()) PLACING substring(int8send((extract(epoch FROM ts) * 1000)::bigint) FROM 3) FROM 1 FOR 6), 52, 1), 53, 1), 'hex')::uuid
$$;--> statement-breakpoint
INSERT INTO "messages" ("id", "request_id", "sender_user_id", "text", "created_at")
SELECT pg_temp.uuid_v7(coalesce(r.responded_at, r.created_at)), r.id, r.from_user_id, r.note, coalesce(r.responded_at, r.created_at)
FROM "connection_requests" r
WHERE r.status = 'accepted' AND NOT EXISTS (SELECT 1 FROM "messages" m WHERE m.request_id = r.id);--> statement-breakpoint
UPDATE "connection_requests" SET "to_read_at" = coalesce("responded_at", "created_at") WHERE "status" = 'accepted' AND "to_read_at" IS NULL;
