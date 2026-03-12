const express = require("express")
const cors = require("cors")
const db = require("./db")

const app = express()

const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 取得所有行程
app.get("/trips", (req, res) => {

    db.all("SELECT * FROM trips", (err, rows) => {

        if(err) {
            res.status(500).send(err)
            return
        }

        res.json(rows)

    })

})

// 新增行程
app.post("/trips", (req, res) => {

 const { date, day, place, detail } = req.body

 db.run(
  "INSERT INTO trips (date, day, place, detail) VALUES (?, ?, ?, ?)",
  [date, day, place, detail],
  function(err){

   if(err){
    res.status(500).send(err)
    return
   }

   res.json({ id:this.lastID })

  }

 )

})

// 刪除
app.delete("/trips/:id", (req, res) => {

    db.run(
        "DELETE FROM trips WHERE id=?",
        req.params.id,
        function(err){

            if(err){
                res.status(500).send(err)
                return
            }

            res.sendStatus(200)

        }
    )

})

app.listen(PORT, () => {
    console.log("server running on " + PORT)
})