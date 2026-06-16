import { drizzle } from "drizzle-orm/node-postgres";

import { loadDatabaseUrl } from "./database-url";
import { examType, sectionType } from "./schema";

const db = drizzle(loadDatabaseUrl());

const examTypes = [
  { id: "IELTS", name: "IELTS Academic", language: "English", description: "International English Language Testing System" },
  { id: "TOEFL", name: "TOEFL iBT", language: "English", description: "Test of English as a Foreign Language" },
  { id: "JLPT", name: "JLPT", language: "Japanese", description: "Japanese-Language Proficiency Test" },
  { id: "HSK", name: "HSK", language: "Chinese", description: "Hanyu Shuiping Kaoshi" },
  { id: "GOETHE", name: "Goethe-Zertifikat", language: "German", description: "Goethe-Zertifikat German proficiency test" },
  { id: "TOPIK", name: "TOPIK", language: "Korean", description: "Test of Proficiency in Korean" },
  { id: "TOAFL", name: "TOAFL", language: "Arabic", description: "Test of Arabic as a Foreign Language" },
  { id: "DELE", name: "DELE", language: "Spanish", description: "Diplomas de Español como Lengua Extranjera" },
  { id: "CPNS", name: "CPNS SKD", language: "Indonesian", description: "Seleksi Kompetensi Dasar Calon Pegawai Negeri Sipil" },
];

const sectionTypes = [
  { id: "READING", name: "Reading" },
  { id: "WRITING", name: "Writing" },
  { id: "LISTENING", name: "Listening" },
  { id: "SPEAKING", name: "Speaking" },
  { id: "TIU", name: "Tes Intelegensi Umum" },
  { id: "TWK", name: "Tes Wawasan Kebangsaan" },
  { id: "TKP", name: "Tes Karakteristik Pribadi" },
];

async function seed() {
  console.log("Seeding exam_type table...");
  for (const et of examTypes) {
    await db.insert(examType).values(et).onConflictDoNothing();
  }

  console.log("Seeding section_type table...");
  for (const st of sectionTypes) {
    await db.insert(sectionType).values(st).onConflictDoNothing();
  }

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
