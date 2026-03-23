require("dotenv").config()

const fetch = require("node-fetch")
const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

/* -----------------------
   Geocode（地點 → 座標）
----------------------- */
async function getCoords(location){

  try {
    console.log(`🌍 Geocoding: ${location}`)

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    )

    if(!res.ok){
      console.warn("❌ Geocode API failed:", res.status)
      return null
    }

    const data = await res.json()

    if(data.length > 0){
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }

    console.warn("❌ 找不到座標:", location)
    return null

  } catch(err){
    console.error("Geocode error:", err)
    return null
  }
}

/* -----------------------
   Elevation（座標 → 海拔）
----------------------- */
async function getElevation(lat, lon){

  try {
    console.log(`⛰ Fetch elevation: ${lat}, ${lon}`)

    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )

    if(!res.ok){
      console.warn("❌ Elevation API failed:", res.status)
      return null
    }

    const text = await res.text()

    // ❗ 防止 HTML 錯誤頁
    if(text.startsWith("<")){
      console.warn("❌ Elevation returned HTML")
      return null
    }

    const data = JSON.parse(text)

    return data.results?.[0]?.elevation ?? null

  } catch(err){
    console.error("Elevation error:", err)
    return null
  }
}

/* -----------------------
   主流程（補資料🔥）
----------------------- */
async function fixTrips(){

  console.log("🚀 開始補 elevation / 座標...\n")

  const result = await pool.query("SELECT * FROM trips")
  const trips = result.rows

  console.log(`📊 總共 ${trips.length} 筆資料\n`)

  for(const trip of trips){

    // ⭐ 已經有資料就跳過
    if(
      trip.latitude !== null &&
      trip.longitude !== null &&
      trip.elevation !== null
    ){
      console.log(`✔ Skip: ${trip.location}`)
      continue
    }

    console.log(`\n🔍 Processing: ${trip.location}`)

    // 1️⃣ 取得座標
    const coords = await getCoords(trip.location)

    if(!coords){
      console.log("❌ 無法取得座標 → skip")
      continue
    }

    // 2️⃣ 取得 elevation
    const elevation = await getElevation(coords.lat, coords.lon)

    // 3️⃣ 更新 DB
    await pool.query(
      `UPDATE trips
       SET latitude=$1, longitude=$2, elevation=$3
       WHERE id=$4`,
      [coords.lat, coords.lon, elevation, trip.id]
    )

    console.log(
      `✅ Updated: ${trip.location} | ⛰ ${elevation ?? "N/A"} m`
    )

    // ⭐ 防止 API 被封鎖（重要）
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log("\n🎉 全部完成！")

  process.exit()
}

/* -----------------------
   執行
----------------------- */
fixTrips()