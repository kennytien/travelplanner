const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("travel.db")

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS trips (
			 id INTEGER PRIMARY KEY AUTOINCREMENT,
			 date TEXT,
			 day INTEGER,
			 place TEXT,
			 detail TEXT
        )
    `)

})

module.exports = db