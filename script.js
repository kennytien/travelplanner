const API = "https://dreamtheater.onrender.com"

let map
let markers = []
let polyline

/* -----------------------
   日期格式
----------------------- */
function formatDate(dateString){
  return dateString?.split("T")[0] || ""
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

function clearMap(){
  markers.forEach(m => map.removeLayer(m))
  markers = []

  if(polyline){
    map.removeLayer(polyline)
  }
}


/* -----------------------
   Geocode
----------------------- */
async function getCoords(location){

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${location}`
  )

  const data = await res.json()

  if(data.length > 0){
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  }

  return null
}


/* -----------------------
   Inline Edit
----------------------- */
function makeEditable(el, trip){

  if(el.querySelector("input")) return

  let field = el.dataset.field
  let value = el.textContent

  if(field === "location"){
    value = trip.location
  }

  if(field === "detail"){
    value = trip.detail || ""
  }

  const input = document.createElement("input")
  input.value = value
  input.style.width = "100%"

  el.innerHTML = ""
  el.appendChild(input)

  input.focus()

  async function save(){

    const updateData = {
      date: trip.date,
      day: trip.day,
      location: field === "location" ? input.value : trip.location,
      detail: field === "detail" ? input.value : trip.detail
    }

    await fetch(API + "/trips/" + trip.id, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(updateData)
    })

    loadTrips()
  }

  input.addEventListener("keydown", e=>{
    if(e.key==="Enter") save()
  })

  input.addEventListener("blur", save)
}


/* -----------------------
   載入行程（最終版）
----------------------- */
async function loadTrips(){

  const res = await fetch(API + "/trips")
  let trips = await res.json()

  // ⭐ 排序（Day）
  trips.sort((a,b)=> a.day - b.day)

  const container = document.getElementById("tripList")
  container.innerHTML = ""

  clearMap()

  let currentDay = null
  let dayContainer

  let routeCoords = []

  for(const trip of trips){

    // Day 分組
    if(trip.day !== currentDay){

      currentDay = trip.day

      const dayBlock = document.createElement("div")
      dayBlock.className = "day-group"

      dayBlock.innerHTML = `<h3>Day ${currentDay}</h3>`

      dayContainer = document.createElement("div")
      dayContainer.className = "day-items"

      dayBlock.appendChild(dayContainer)
      container.appendChild(dayBlock)

      // ⭐ 啟用拖曳
      new Sortable(dayContainer, {
        animation: 150
      })
    }

    // 卡片
    const card = document.createElement("div")
    card.className = "trip-card"

    card.innerHTML = `
      <div class="trip-info">

        <div class="editable" data-field="location">
          📍 ${trip.location}
        </div>

        <div class="editable" data-field="detail">
          ${formatDate(trip.date)} | ${trip.detail || ""}
        </div>

      </div>

      <button class="delete-btn" onclick="deleteTrip(${trip.id})">
        Delete
      </button>
    `

    // inline edit
    card.querySelectorAll(".editable").forEach(el=>{
      el.addEventListener("click", ()=> makeEditable(el, trip))
    })

    dayContainer.appendChild(card)

    // 地圖
    const coords = await getCoords(trip.location)

    if(coords){

      routeCoords.push(coords)

      const marker = L.marker(coords)
        .addTo(map)
        .bindPopup(`<b>${trip.location}</b>`)

      markers.push(marker)
    }
  }

  // ⭐ 畫路線
  if(routeCoords.length > 1){
    polyline = L.polyline(routeCoords, { color: 'blue' }).addTo(map)
    map.fitBounds(polyline.getBounds())
  }
}


/* -----------------------
   新增
----------------------- */
async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  if(!date || !day || !location){
    alert("請填完整")
    return
  }

  await fetch(API + "/trips", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ date, day, location, detail })
  })

  loadTrips()
}


/* -----------------------
   刪除
----------------------- */
async function deleteTrip(id){

  if(!confirm("確定刪除？")) return

  await fetch(API + "/trips/" + id, {
    method:"DELETE"
  })

  loadTrips()
}


/* -----------------------
   Init
----------------------- */
initMap()
loadTrips()