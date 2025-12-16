import { db, testConnection } from "../src/lib/db";

async function main() {
  console.log("🔍 Testing Prisma database connection...\n");

  // Test basic connection
  const connected = await testConnection();
  console.log(`✅ Database connection: ${connected ? "SUCCESS" : "FAILED"}\n`);

  if (connected) {
    // Test creating a room
    console.log("📝 Creating test room...");
    const room = await db.room.create({
      data: {
        code: "TEST01",
        status: "WAITING",
      },
    });
    console.log(`✅ Created room: ${room.code} (ID: ${room.id})\n`);

    // Test querying
    console.log("🔎 Fetching all rooms...");
    const rooms = await db.room.findMany();
    console.log(`✅ Found ${rooms.length} room(s)\n`);

    // Clean up
    console.log("🧹 Cleaning up test data...");
    await db.room.delete({ where: { id: room.id } });
    console.log("✅ Test room deleted\n");

    console.log("🎉 All tests passed!");
  }

  await db.$disconnect();
}

main().catch(console.error);
