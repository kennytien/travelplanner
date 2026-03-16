const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")

const app = express()

app.use(cors())
app.use(express.json())

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

/* ---------------------------------
   自動建立資料表
--------------------------------- */
async function initDatabase(){

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        day INTEGER NOT NULL,
        location TEXT NOT NULL,
        detail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("Trips table ready")

  } catch(err) {

    console.error("Database init error:", err)

  }
}

/* ---------------------------------
   API
--------------------------------- */

// 取得所有行程
app.get("/trips", async (req,res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM trips ORDER BY date, day"
    )

    res.json(result.rows)

  } catch(err) {
    
    console.error(err)
    res.status(500).send("Server error")

  }
})

// 新增行程
app.post("/trips", async (req,res) => {

  const { date, day, location, detail } = req.body

  try {

    const result = await pool.query(

      `INSERT INTO trips (date, day, location, detail)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,

      [date, day, location, detail]

    )

    res.json(result.rows[0])

  } catch(err) {

    console.error(err)
    res.status(500).send("Insert error")

  }
})

// 更新行程
app.put("/trips/:id", async (req,res) => {

  const { date, day, location, detail } = req.body

  try {

    const result = await pool.query(

      `UPDATE trips 
       SET date=$1, day=$2, location=$3, detail=$4 
       WHERE id=$5
       RETURNING *`,

      [date, day, location, detail, req.params.id]

    )

    if (result.rows.length === 0) {
      return res.status(404).send("Trip not found")
    }

    res.json(result.rows[0])

  } catch(err) {

    console.error(err)
    res.status(500).send("Update error")

  }
})

// 刪除行程
app.delete("/trips/:id", async (req,res) => {

  try {

    await pool.query(
      "DELETE FROM trips WHERE id=$1",
      [req.params.id]
    )

    res.sendStatus(200)

  } catch(err) {

    console.error(err)
    res.status(500).send("Delete error")

  }
})

/* ---------------------------------
   Server start
--------------------------------- */

const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {

  console.log("Server running on port " + PORT)

  // 啟動時建立 table
  await initDatabase()
})
