import { createSqliteAdapter } from "./sqlite-adapter";
import { initSchema } from "./schema";
import { MONDAY_TO_FRIDAY_MON_FIRST } from "../lib/datetime";

const db = createSqliteAdapter();
await initSchema(db);

const existing = await db.get("SELECT id FROM event_types WHERE slug = ?", ["hacker-house-interview"]);
if (!existing) {
  const result = await db.run(
    `INSERT INTO event_types (slug, name, host_name, duration_minutes, description)
     VALUES (?, ?, ?, ?, ?)`,
    [
      "hacker-house-interview",
      "Hacker House 面试",
      "Rebase Team",
      30,
      "Rebase Hacker House@武汉",
    ]
  );

  const eventTypeId = result.lastInsertRowid;

  // Monday to Friday, 9:00-17:00
  for (const day of MONDAY_TO_FRIDAY_MON_FIRST) {
    await db.run(
      `INSERT INTO availability (event_type_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [eventTypeId, day, "09:00", "17:00"]
    );
  }

  console.log("Seed data created successfully");
} else {
  console.log("Seed data already exists");
}
