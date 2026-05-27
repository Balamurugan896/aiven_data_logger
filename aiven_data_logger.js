import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" })); // important for GSM large payloads

// ======================
// DEBUG ENV CHECK (Render fix)
// ======================
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);

// ======================
// MYSQL POOL (AIVEN)
// ======================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 16587,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 20000,
});

// ======================
// DEVICE IDENTIFIER
// ======================
const getDeviceIdentifier = (payload) => {
  const raw =
    payload?.data?.mac ||
    payload?.data?.imei ||
    payload?.mac ||
    payload?.imei ||
    null;

  return raw ? raw.toString().trim().toUpperCase() : null;
};

// ======================
// TEST ROUTE
// ======================
app.get("/test", (req, res) => {
  res.send("Server Working ✔");
});

// ======================
// MAIN GSM API
// ======================
app.post("/raw_logs", async (req, res) => {
  try {
    console.log("🔥 GSM REQUEST RECEIVED");
    console.log("BODY:", JSON.stringify(req.body));

    const payload = req.body;
    const deviceKey = getDeviceIdentifier(payload);

    if (!deviceKey) {
      return res.status(400).json({ error: "Missing IMEI/MAC" });
    }

    // ======================
    // FIND DEVICE
    // ======================
    const [devices] = await pool.execute(
      "SELECT id FROM devices WHERE imei = ? LIMIT 1",
      [deviceKey]
    );

    if (devices.length === 0) {
      return res.status(404).json({ error: "Device not registered" });
    }

    const deviceId = devices[0].id;

    // ======================
    // INSERT LOG
    // ======================
    console.log("🔥 BEFORE INSERT");

    const result = await pool.execute(
      "INSERT INTO raw_logs (device_id, payload) VALUES (?, ?)",
      [deviceId, JSON.stringify(payload)]
    );

    console.log("✅ INSERT SUCCESS:", result[0].insertId);

    return res.json({
      status: "log stored",
      device_id: deviceId,
    });

  } catch (err) {
    console.error("❌ MYSQL ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
