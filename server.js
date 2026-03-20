const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

/* -----------------------
   建立資料表
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
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      username TEXT,
      text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

}

initDB()

/* -----------------------
   Trips API
----------------------- */

app.get("/trips", async (req,res)=>{
  const result = await pool.query("SELECT * FROM trips ORDER BY day ASC")
  res.json(result.rows)
})

app.post("/trips", async (req,res)=>{
  const { date, day, location, detail } = req.body

  await pool.query(
    "INSERT INTO trips(date, day, location, detail) VALUES($1,$2,$3,$4)",
    [date, day, location, detail]
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