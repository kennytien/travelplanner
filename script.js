const API = "https://dreamtheater.onrender.com"

let map
let markers = []

/* -----------------------
   日期格式化
----------------------- */
function formatDate(dateString){
  if(!dateString) return ""
  return dateString.split("T")[0]
}


/* -----------------------
   初始化地圖
----------------------- */
function initMap(){

  map = L.map('map').setView([25.0330, 121.5654], 5)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)

}

function clearMarkers(){
  markers.forEach(m => map.removeLayer(m))
  markers = []
}


/* -----------------------
   地點轉座標
----------------------- */
async function getCoords(location){

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${location}`
    )

    const data = await res.json()

    if(data.length > 0){
      return [data[0].lat, data[0].lon]
    }

  } catch(err){
    console.error("Geocode error:", err)
  }

  return null
}


/* -----------------------
   卡片 inline edit ⭐
----------------------- */
function makeCardEditable(element, trip){

  if(element.querySelector("input")) return

  let field = element.dataset.field
  let value = element.textContent

  // title → location
  if(field === "title"){
    value = trip.location
    field = "location"
  }

  // detail 要去掉日期
  if(field === "detail"){
    value = trip.detail || ""
  }

  const input = document.createElement("input")
  input.value = value
  input.style.width = "100%"

  element.innerHTML = ""
  element.appendChild(input)

  input.focus()
  input.select()

  async function save(){

    const newValue = input.value

    if(!newValue){
      alert("欄位不能為空")
      return
    }

    const updateData = {
      date: trip.date,
      day: trip.day,
      location: field === "location" ? newValue : trip.location,
      detail: field === "detail" ? newValue : trip.detail
    }

    try {

      const res = await fetch(API + "/trips/" + trip.id, {
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(updateData)
      })

      if(!res.ok) throw new Error()

      loadTrips()

    } catch(err){
      console.error(err)
      alert("更新失敗")
      loadTrips()
    }
  }

  input.addEventListener("keydown", e => {
    if(e.key === "Enter") save()
    if(e.key === "Escape") loadTrips()
  })

  input.addEventListener("blur", save)
}


/* -----------------------
   載入行程（卡片）
----------------------- */
async function loadTrips(){

  try {

    const res = await fetch(API + "/trips")
    const trips = await res.json()

    const container = document.getElementById("tripList")
    container.innerHTML = ""

    clearMarkers()

    if(trips.length === 0){
      container.innerHTML = `<div class="empty-state">No trips yet ✈️</div>`
      return
    }

    for(const trip of trips){

      const card = document.createElement("div")
      card.className = "trip-card"

      card.innerHTML = `
        <div class="trip-info">

          <div class="trip-title editable" data-field="title">
            Day ${trip.day} - ${trip.location}
          </div>

          <div class="trip-detail editable" data-field="detail">
            ${formatDate(trip.date)} | ${trip.detail || ""}
          </div>

        </div>

        <div class="trip-actions">
          <button class="delete-btn" onclick="deleteTrip(${trip.id})">
            Delete
          </button>
        </div>
      `

      // ⭐ 綁定 inline edit
      const editables = card.querySelectorAll(".editable")
      editables.forEach(el => {
        el.addEventListener("click", () => {
          makeCardEditable(el, trip)
        })
      })

      container.appendChild(card)

      // ⭐ 地圖 marker
      const coords = await getCoords(trip.location)

      if(coords){

        const marker = L.marker(coords)
          .addTo(map)
          .bindPopup(`
            <b>${trip.location}</b><br>
            Day ${trip.day}<br>
            ${formatDate(trip.date)}<br>
            ${trip.detail || ""}
          `)

        markers.push(marker)
      }

    }

  } catch(err){

    console.error(err)
    alert("載入資料失敗")

  }

}


/* -----------------------
   新增行程
----------------------- */
async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  if(!date || !day || !location){
    alert("請填寫完整資料")
    return
  }

  if (isNaN(day) || day <= 0 || !Number.isInteger(Number(day))) {
    alert("Day 必須是正整數")
    return
  }

  try {

    await fetch(API + "/trips", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ date, day, location, detail })
    })

    // 清空欄位
    document.getElementById("date").value = ""
    document.getElementById("day").value = ""
    document.getElementById("location").value = ""
    document.getElementById("detail").value = ""

    loadTrips()

  } catch(err){

    console.error(err)
    alert("新增失敗")

  }

}


/* -----------------------
   刪除行程
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
   初始化
----------------------- */
initMap()
loadTrips()