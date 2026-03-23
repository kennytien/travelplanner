const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")

// ⭐ Node <18 需要
const fetch = require("node-fetch")

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

/* -----------------------
   初始化資料庫（含欄位🔥）
----------------------- */
async function initDB(){

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      date DATE,
      day INTEGER,
      location TEXT,
      detail TEXT
    );
  `)

  await pool.query(`
    ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS latitude FLOAT;
  `)

  await pool.query(`
    ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS longitude FLOAT;
  `)

  await pool.query(`
    ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS elevation INTEGER;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      username TEXT,
      text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  console.log("✅ DB schema ready")
}

initDB()

/* -----------------------
   工具：Geocode
----------------------- */
async function getCoords(location){
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    )

    const data = await res.json()

    if(data.length > 0){
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }
  } catch(err){
    console.error("Geocode error:", err)
  }

  return null
}

/* -----------------------
   工具：Elevation
----------------------- */
async function getElevation(lat, lon){
  try {
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )

    if(!res.ok) return null

    const text = await res.text()

    // ❗ 防止 HTML 錯誤頁
    if(text.startsWith("<")) return null

    const data = JSON.parse(text)

    return data.results?.[0]?.elevation ?? null

  } catch(err){
    console.error("Elevation error:", err)
    return null
  }
}

/* -----------------------
   Trips API
----------------------- */

app.get("/trips", async (req,res)=>{
  const result = await pool.query("SELECT * FROM trips ORDER BY day ASC")
  res.json(result.rows)
})

/* ⭐ 升級重點：新增時就抓 elevation */
app.post("/trips", async (req,res)=>{

  const { date, day, location, detail } = req.body

  let lat = null
  let lon = null
  let elevation = null

  // 1️⃣ 取得座標
  const coords = await getCoords(location)

  if(coords){
    lat = coords.lat
    lon = coords.lon

    // 2️⃣ 取得 elevation（只查一次）
    elevation = await getElevation(lat, lon)
  }

  // 3️⃣ 存入 DB
  await pool.query(
    `INSERT INTO trips
     (date, day, location, detail, latitude, longitude, elevation)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [date, day, location, detail, lat, lon, elevation]
  )

  res.sendStatus(200)
})

app.put("/trips/:id", async (req,res)=>{
  const { id } = req.params
  const { date, day, location, detail } = req.body

  await pool.query(
    "UPDATE trips SET date=$1, day=$2, location=$3, detail=$4 WHERE id=$5",
    [date, day, location, detail, id]
  )

  res.sendStatus(200)
})

app.delete("/trips/:id", async (req,res)=>{
  const { id } = req.params
  await pool.query("DELETE FROM trips WHERE id=$1", [id])
  res.sendStatus(200)
})

/* -----------------------
   Comments API
----------------------- */

app.get("/comments", async (req,res)=>{
  const result = await pool.query(
    "SELECT * FROM comments ORDER BY created_at DESC"
  )
  res.json(result.rows)
})

app.post("/comments", async (req,res)=>{
  const { username, text } = req.body

  await pool.query(
    "INSERT INTO comments(username, text) VALUES($1,$2)",
    [username, text]
  )

  res.sendStatus(200)
})

app.delete("/comments/:id", async (req,res)=>{
  const { id } = req.params
  await pool.query("DELETE FROM comments WHERE id=$1", [id])
  res.sendStatus(200)
})

/* -----------------------
   Start Server
----------------------- */

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log("Server running"))