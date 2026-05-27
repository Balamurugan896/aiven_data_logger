import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 16587,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

// Extract IMEI
const getDeviceIdentifier = (payload) => {
  const raw =
    payload?.data?.mac ||
    payload?.data?.imei ||
    payload?.mac ||
    payload?.imei ||
    null;

  return raw ? raw.toString().trim().toUpperCase() : null;
};

// Test route
app.get("/test", (req, res) => {
  res.send("Server working ✅");
});

// MAIN ROUTE (FIXED)
app.post("/raw_logs", async (req, res) => {
  try {

    console.log("🔥 BEFORE INSERT");

    const payload = req.body;
    const deviceKey = getDeviceIdentifier(payload);

    const [devices] = await pool.execute(
      "SELECT id FROM devices WHERE imei = ? LIMIT 1",
      [deviceKey]
    );

    if (devices.length === 0) {
      return res.status(404).json({ error: "Device not registered" });
    }

    const deviceId = devices[0].id;

    // ✅ STEP 5: ADD HERE (THIS IS THE IMPORTANT PART)
    const result = await pool.execute(
      "INSERT INTO raw_logs (device_id, payload) VALUES (?, ?)",
      [deviceId, JSON.stringify(payload)]
    );

    console.log("✅ INSERT RESULT:", result);

    return res.json({
      status: "log stored",
      device_id: deviceId
    });

  } catch (err) {
    console.error("MYSQL ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});
