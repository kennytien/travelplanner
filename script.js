const API = "https://dreamtheater.onrender.com"

// 當前編輯的 trip id
let editingTripId = null

/* -----------------------
   Load Trips
----------------------- */

async function loadTrips(){

  try {

    const res = await fetch(API + "/trips")
    const trips = await res.json()

    const table = document.getElementById("tripList")
    table.innerHTML = ""

    if(trips.length === 0){
      table.innerHTML = `<tr><td colspan="5">No trips yet ✈️</td></tr>`
      return
    }

    trips.forEach(trip => {

      const row = document.createElement("tr")
      row.dataset.tripId = trip.id

      row.innerHTML = `
        <td class="editable" data-field="date">${trip.date}</td>
        <td class="editable" data-field="day">Day ${trip.day}</td>
        <td class="editable" data-field="location">${trip.location}</td>
        <td class="editable" data-field="detail">${trip.detail || ""}</td>
        <td>
          <button class="delete-btn" onclick="deleteTrip(${trip.id})">
            Delete
          </button>
        </td>
      `

      // 綁定 editable
      const editableCells = row.querySelectorAll(".editable")

      editableCells.forEach(cell => {
        cell.addEventListener("click", function() {
          makeEditable(this, trip)
        })
      })

      table.appendChild(row)

    })

  } catch(err){
    console.error(err)
    alert("讀取資料失敗")
  }

}


/* -----------------------
   Inline Edit
----------------------- */

function makeEditable(cell, trip) {

  if (editingTripId !== null && editingTripId !== trip.id) return
  if (cell.querySelector("input")) return

  const field = cell.dataset.field
  let currentValue = cell.textContent

  if (field === "day") {
    currentValue = currentValue.replace("Day ", "")
  }

  const input = document.createElement("input")
  input.type = field === "date" ? "date" : "text"
  input.value = currentValue
  input.style.width = "100%"

  cell.textContent = ""
  cell.appendChild(input)

  input.focus()
  input.select()

  editingTripId = trip.id

  async function saveEdit() {

    const newValue = input.value

    if (!newValue) {
      alert("欄位不能為空！")
      return
    }

    if (field === "day") {
      if (isNaN(newValue) || newValue <= 0 || !Number.isInteger(Number(newValue))) {
        alert("Day 必須是正整數！")
        return
      }
    }

    if (field === "location") {
      if (newValue.length < 2) {
        alert("Location 至少需要 2 個字元！")
        return
      }
    }

    const updateData = {
      date: field === "date" ? newValue : trip.date,
      day: field === "day" ? newValue : trip.day,
      location: field === "location" ? newValue : trip.location,
      detail: field === "detail" ? newValue : trip.detail
    }

    try {

      const response = await fetch(API + "/trips/" + trip.id, {
        method: "PUT",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) throw new Error()

      editingTripId = null
      loadTrips()

    } catch (err) {

      console.error(err)
      alert("更新失敗")
      editingTripId = null
      loadTrips()

    }

  }

  function cancelEdit() {
    editingTripId = null
    loadTrips()
  }

  input.addEventListener("keydown", function(e) {

    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()

  })

  input.addEventListener("blur", function() {
    if (editingTripId === trip.id) saveEdit()
  })

}


/* -----------------------
   Add Trip
----------------------- */

async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  if (!date || !day || !location || !detail) {
    alert("有欄位漏掉了！")
    return
  }

  if (isNaN(day) || day <= 0 || !Number.isInteger(Number(day))) {
    alert("Day 必須是正整數！")
    return
  }

  if (location.length < 2) {
    alert("Location 至少需要 2 個字元！")
    return
  }

  try {

    await fetch(API + "/trips", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ date, day, location, detail })
    })

    loadTrips()

    // 清空欄位（UX升級）
    document.getElementById("date").value = ""
    document.getElementById("day").value = ""
    document.getElementById("location").value = ""
    document.getElementById("detail").value = ""

  } catch(err){

    console.error(err)
    alert("新增失敗")

  }

}


/* -----------------------
   Delete
----------------------- */

async function deleteTrip(id){

  const confirmDelete = confirm("確定要刪除這筆行程嗎？")

  if(!confirmDelete) return

  try {

    await fetch(API + "/trips/" + id, {
      method:"DELETE"
    })

    loadTrips()

  } catch(err){

    console.error(err)
    alert("刪除失敗")

  }

}


/* -----------------------
   Init
----------------------- */

loadTrips()