import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql, and, isNull } from "drizzle-orm";
import { loadDatabaseUrl } from "../database-url";
import { passage, question } from "../schema";

const db = drizzle(loadDatabaseUrl());

async function migratePassages() {
  console.log("Starting passage migration...");

  const rows = await db
    .select({
      passageText: question.passageText,
      examTypeId: question.examTypeId,
      sectionTypeId: question.sectionTypeId,
      creatorUserId: question.creatorUserId,
    })
    .from(question)
    .where(sql`LENGTH(${question.passageText}) >= 50`);

  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.passageText;
    if (seen.has(key)) continue;
    seen.add(key);
  }

  console.log(`Found ${seen.size} unique passages to migrate...`);

  let created = 0;
  let skipped = 0;

  for (const text of seen) {
    const existingRow = rows.find((r) => r.passageText === text);
    if (!existingRow) continue;

    const [existingPassage] = await db
      .select({ id: passage.id })
      .from(passage)
      .where(eq(passage.text, text))
      .limit(1);

    let passageId: string;

    if (existingPassage) {
      passageId = existingPassage.id;
      skipped++;
    } else {
      const [newPassage] = await db
        .insert(passage)
        .values({
          text,
          examTypeId: existingRow.examTypeId,
          sectionTypeId: existingRow.sectionTypeId,
          creatorUserId: existingRow.creatorUserId,
        })
        .returning({ id: passage.id });

      if (!newPassage) continue;
      passageId = newPassage.id;
      created++;
    }

    await db
      .update(question)
      .set({ passageId })
      .where(
        and(
          eq(question.passageText, text),
          isNull(question.passageId),
        ),
      );
  }

  console.log(`Migration complete. Created: ${created}, Skipped: ${skipped}, Total passages: ${created + skipped}`);
}

migratePassages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
