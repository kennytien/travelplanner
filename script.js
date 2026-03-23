const API = "https://dreamtheater.onrender.com"

let map
let markers = []
let polyline

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

/* -----------------------
   日期格式
----------------------- */
function formatDate(dateString){
  return dateString?.split("T")[0] || ""
}

/* -----------------------
   留言時間
----------------------- */
function timeAgo(timestamp){
  const diff = Math.floor((new Date() - new Date(timestamp)) / 1000)

  if(diff < 60) return "just now"
  if(diff < 3600) return Math.floor(diff/60) + " min ago"
  if(diff < 86400) return Math.floor(diff/3600) + " hr ago"

  return Math.floor(diff/86400) + " days ago"
}

/* -----------------------
   地圖初始化
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
   Inline 編輯
----------------------- */
function makeEditable(el, trip){

  if(el.querySelector("input")) return

  let field = el.dataset.field
  let value = field === "location" ? trip.location : trip.detail || ""

  const input = document.createElement("input")
  input.value = value
  input.style.width = "100%"

  el.innerHTML = ""
  el.appendChild(input)

  input.focus()

  async function save(){

    if(!input.value){
      loadTrips()
      return
    }

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
   載入行程（DB版本🔥）
----------------------- */
async function loadTrips(){

  const res = await fetch(API + "/trips")
  let trips = await res.json()

  trips.sort((a,b)=> a.day - b.day)

  const container = document.getElementById("tripList")
  container.innerHTML = ""

  clearMap()

  let currentDay = null
  let dayContainer
  let routeCoords = []

  for(const trip of trips){

    if(trip.day !== currentDay){

      currentDay = trip.day

      const dayBlock = document.createElement("div")
      dayBlock.className = "day-group"
      dayBlock.innerHTML = `<h3>Day ${currentDay}</h3>`

      dayContainer = document.createElement("div")
      dayContainer.className = "day-items"

      dayBlock.appendChild(dayContainer)
      container.appendChild(dayBlock)

      new Sortable(dayContainer, { animation: 150 })
    }

    // ⭐ UI（直接用 DB elevation）
    const card = document.createElement("div")
    card.className = "trip-card"

    card.innerHTML = `
      <div class="trip-info">

        <div class="editable" data-field="location">
          📍 ${trip.location}
          <span class="elevation">
            ${trip.elevation !== null ? `⛰ ${trip.elevation}m` : "⛰ N/A"}
          </span>
        </div>

        <div class="editable" data-field="detail">
          ${formatDate(trip.date)} | ${trip.detail || ""}
        </div>

      </div>

      <button class="delete-btn" onclick="deleteTrip(${trip.id})">
        Delete
      </button>
    `

    dayContainer.appendChild(card)

    card.querySelectorAll(".editable").forEach(el=>{
      el.addEventListener("click", ()=> makeEditable(el, trip))
    })

    // ⭐ 地圖（直接用 DB 座標）
    if(trip.latitude && trip.longitude){

      const coords = [trip.latitude, trip.longitude]
      routeCoords.push(coords)

      const marker = L.marker(coords)
        .addTo(map)
        .bindPopup(`
          <b>${trip.location}</b><br>
          ⛰ ${trip.elevation ?? "N/A"} m
        `)

      markers.push(marker)

      if(routeCoords.length > 1){
        if(polyline) map.removeLayer(polyline)
        polyline = L.polyline(routeCoords).addTo(map)
      }
    }
  }
}

/* -----------------------
   新增 / 刪除
----------------------- */
async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  if(!date || !day || !location) return

  await fetch(API + "/trips", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ date, day, location, detail })
  })

  loadTrips()
}

async function deleteTrip(id){
  await fetch(API + "/trips/" + id, { method:"DELETE" })
  loadTrips()
}

/* -----------------------
   留言系統
----------------------- */
async function loadComments(){

  const res = await fetch(API + "/comments")
  const comments = await res.json()

  const list = document.getElementById("commentList")
  list.innerHTML = ""

  comments.forEach(c=>{
    const div = document.createElement("div")
    div.className = "comment-item"

    div.innerHTML = `
      <div>
        <strong>${c.username}</strong>
        (${timeAgo(c.created_at)})
        <span onclick="deleteComment(${c.id})">❌</span>
      </div>
      <div>${c.text}</div>
    `

    list.appendChild(div)
  })
}

async function addComment(){

  const username = document.getElementById("username").value
  const text = document.getElementById("commentInput").value

  if(!username || !text) return

  await fetch(API + "/comments", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ username, text })
  })

  document.getElementById("commentInput").value = ""
  loadComments()
}

async function deleteComment(id){
  await fetch(API + "/comments/" + id, { method:"DELETE" })
  loadComments()
}

/* -----------------------
   Init
----------------------- */
initMap()
loadTrips()
loadComments()
setInterval(loadComments, 3000)