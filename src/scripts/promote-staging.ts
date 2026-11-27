// ==================================================================
// Promosi dokumen staging ke production untuk satu versi unggahan.
// Usage: npm run promote:staging -- --version <uuid> [--dry-run]
// Hanya mengubah dokumen berstatus staging dengan version yang diberikan.
// ==================================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

function readArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const version = readArg("--version");
  const dryRun = process.argv.includes("--dry-run");
  if (!version) {
    console.error("Gunakan --version <uuid>");
    process.exit(1);
  }

  const { connectToDatabase } = await import("../lib/db/mongodb");
  const db = await connectToDatabase();
  const filter = { status: "staging", version };
  const count = await db.collection("doc_embeddings").countDocuments(filter);

  if (dryRun) {
    console.log(`[dry-run] ${count} dokumen akan dipromosikan (version=${version})`);
    process.exit(0);
  }

  const result = await db
    .collection("doc_embeddings")
    .updateMany(filter, { $set: { status: "production", promotedAt: new Date() } });
  console.log(`Dipromosikan ${result.modifiedCount} dokumen (version=${version})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
