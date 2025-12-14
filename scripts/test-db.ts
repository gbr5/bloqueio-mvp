import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.development.local" });

async function testConnection() {
  try {
    const sql = postgres(process.env.DATABASE_URL!);

    console.log("🔌 Testing database connection...\n");

    // Test 1: Current time
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log(
      "✅ Connected! Current server time:",
      timeResult[0].current_time
    );

    // Test 2: Query test room
    const rooms = await sql`SELECT * FROM game_rooms WHERE id = 'TEST01'`;
    console.log(
      "✅ Found test room:",
      rooms[0]?.id,
      "- Status:",
      rooms[0]?.status
    );

    // Test 3: Count all rooms
    const count = await sql`SELECT COUNT(*) as total FROM game_rooms`;
    console.log("✅ Total rooms in database:", count[0].total);

    console.log("\n🎉 All tests passed! Database is ready.");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
