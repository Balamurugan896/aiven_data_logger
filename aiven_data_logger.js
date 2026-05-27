import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Aiven MySQL Pool
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
});

// ✅ Helper: Extract MAC / IMEI
const getDeviceIdentifier = (payload) => {
  const raw =
    payload?.data?.mac ||
    payload?.data?.imei ||
    payload?.mac ||
    payload?.imei ||
    null;

  if (!raw) return null;

  return raw.toString().trim().toUpperCase();
};

// ✅ Test Route
app.get("/test", (req, res) => {
  res.send("Server working ✅");
});

// ✅ Main API Route
app.post("/raw_logs", (req, res) => {
  console.log("🔥 GSM HIT RECEIVED");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body));

  res.json({ ok: true });
});
  }

  try {
    // ✅ Find device
    const [devices] = await pool.execute(
      "SELECT id FROM devices WHERE imei = ?",
      [deviceKey, deviceKey]
    );

    console.log("DB Result:", devices);

    // ✅ Device not found
    if (devices.length === 0) {
      return res.status(404).json({
        error: "Device not registered",
      });
    }

    const deviceId = devices[0].id;

    // ✅ Save raw payload
    await pool.execute(
      "INSERT INTO raw_logs (device_id, payload) VALUES (?, ?)",
      [deviceId, JSON.stringify(payload)]
    );

    console.log("AUTO INSERT SUCCESS");

    return res.json({
      status: "log stored",
      device_id: deviceId,
    });

  } catch (err) {
    console.error("MYSQL ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
