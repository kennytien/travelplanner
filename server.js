const express = require("express")
const cors = require("cors")
const pool = require("./db")

const app = express()

app.use(cors())
app.use(express.json())

// 取得所有行程
app.get("/trips", async (req,res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM trips ORDER BY date, day"
    )

    res.json(result.rows)

  } catch(err) {

    res.status(500).send(err)

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

    res.status(500).send(err)

  }

})

// 刪除
app.delete("/trips/:id", async (req,res) => {

  try {

    await pool.query(
      "DELETE FROM trips WHERE id=$1",
      [req.params.id]
    )

    res.sendStatus(200)

  } catch(err) {

    res.status(500).send(err)

  }

})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("server running on " + PORT)
})