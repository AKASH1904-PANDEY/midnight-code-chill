import { Router, type IRouter, type RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import {
  CreateRsvpBody,
  CreateRsvpResponse,
  GetOrganizerRsvpsResponse,
  GetOrganizerSummaryResponse,
  GetRsvpAvailabilityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const EVENT_CAPACITY = 45;
const EVENT_NAME = "Midnight Code & Chill";
const RSVP_DEADLINE = new Date("2026-11-19T23:59:59+05:30");
const RSVP_LOCK_KEY = 20261120;

function isRegistrationOpen(now = new Date()): boolean {
  return now.getTime() <= RSVP_DEADLINE.getTime();
}

async function getRegisteredCount(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${rsvpsTableName}`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

const rsvpsTableName = `"midnight_code_chill_rsvps"`;

async function makeAvailability() {
  const registered = await getRegisteredCount();
  return GetRsvpAvailabilityResponse.parse({
    capacity: EVENT_CAPACITY,
    registered,
    spotsRemaining: Math.max(0, EVENT_CAPACITY - registered),
    registrationOpen: isRegistrationOpen() && registered < EVENT_CAPACITY,
    deadline: RSVP_DEADLINE.toISOString(),
  });
}

const requireOrganizer: RequestHandler = async (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const allowedEmail = process.env.ORGANIZER_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    req.log.error("Organizer email is not configured");
    res.status(503).json({ error: "Organizer access is not configured" });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.primaryEmailAddress;
    if (
      primaryEmail?.emailAddress.toLowerCase() !== allowedEmail ||
      primaryEmail.verification?.status !== "verified"
    ) {
      res.status(403).json({ error: "Organizer access required" });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Could not verify organizer identity");
    res.status(401).json({ error: "Could not verify sign-in" });
  }
};

router.get("/rsvps/availability", async (_req, res): Promise<void> => {
  res.json(await makeAvailability());
});

router.post("/rsvps", async (req, res): Promise<void> => {
  const parsed = CreateRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid name and email address." });
    return;
  }

  if (!isRegistrationOpen()) {
    res.status(409).json({ error: "RSVP registration has closed." });
    return;
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [RSVP_LOCK_KEY]);

    const duplicate = await client.query(
      `SELECT id FROM ${rsvpsTableName} WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );
    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "This email already has an RSVP." });
      return;
    }

    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${rsvpsTableName}`,
    );
    const registered = Number(countResult.rows[0]?.count ?? 0);
    if (registered >= EVENT_CAPACITY) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "All event places have been claimed." });
      return;
    }

    const inserted = await client.query<{
      id: number;
      name: string;
      created_at: Date;
    }>(
      `INSERT INTO ${rsvpsTableName} (name, email) VALUES ($1, $2) RETURNING id, name, created_at`,
      [name, email],
    );
    await client.query("COMMIT");
    const attendee = inserted.rows[0];
    res.status(201).json(
      CreateRsvpResponse.parse({
        id: attendee.id,
        name: attendee.name,
        createdAt: attendee.created_at.toISOString(),
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "This email already has an RSVP." });
      return;
    }
    req.log.error({ err: error }, "Could not save RSVP");
    res.status(500).json({ error: "Could not save your RSVP. Please try again." });
  } finally {
    client.release();
  }
});

router.get("/organizer/summary", requireOrganizer, async (_req, res): Promise<void> => {
  const registered = await getRegisteredCount();
  res.json(
    GetOrganizerSummaryResponse.parse({
      eventName: EVENT_NAME,
      capacity: EVENT_CAPACITY,
      registered,
      spotsRemaining: Math.max(0, EVENT_CAPACITY - registered),
      registrationOpen: isRegistrationOpen() && registered < EVENT_CAPACITY,
      deadline: RSVP_DEADLINE.toISOString(),
    }),
  );
});

router.get("/organizer/rsvps", requireOrganizer, async (_req, res): Promise<void> => {
  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    created_at: Date;
  }>(
    `SELECT id, name, email, created_at FROM ${rsvpsTableName} ORDER BY created_at DESC, id DESC`,
  );
  res.json(
    GetOrganizerRsvpsResponse.parse(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.created_at.toISOString(),
      })),
    ),
  );
});

export default router;
