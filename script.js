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
   地點 → 座標
----------------------- */
async function getCoords(location){

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${location}`
    )

    const data = await res.json()

    if(data.length > 0){
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
    }

  } catch(err){
    console.error("Geocode error:", err)
  }

  return null
}


/* -----------------------
   ⭐ 座標 → 海拔
----------------------- */
async function getElevation(lat, lon){

  try {
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )

    const data = await res.json()

    return data.results[0].elevation

  } catch(err){
    console.error("Elevation error:", err)
    return null
  }
}


/* -----------------------
   Inline 編輯
----------------------- */
function makeEditable(el, trip){

  if(el.querySelector("input")) return

  let field = el.dataset.field
  let value = ""

  if(field === "location") value = trip.location
  if(field === "detail") value = trip.detail || ""

  const input = document.createElement("input")
  input.value = value
  input.style.width = "100%"

  el.innerHTML = ""
  el.appendChild(input)

  input.focus()
  input.select()

  async function save(){

    if(!input.value){
      alert("不能為空")
      loadTrips()
      return
    }

    const updateData = {
      date: trip.date,
      day: trip.day,
      location: field === "location" ? input.value : trip.location,
      detail: field === "detail" ? input.value : trip.detail
    }

    try {
      await fetch(API + "/trips/" + trip.id, {
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(updateData)
      })
      loadTrips()
    } catch(err){
      console.error(err)
      alert("更新失敗")
      loadTrips()
    }
  }

  input.addEventListener("keydown", e=>{
    if(e.key==="Enter") save()
    if(e.key==="Escape") loadTrips()
  })

  input.addEventListener("blur", save)
}


/* -----------------------
   載入行程（含海拔）
----------------------- */
async function loadTrips(){

  try {

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

      const coords = await getCoords(trip.location)

      let elevation = null

      if(coords){
        elevation = await getElevation(coords[0], coords[1])
      }

      const card = document.createElement("div")
      card.className = "trip-card"

      card.innerHTML = `
        <div class="trip-info">

          <div class="editable" data-field="location">
            📍 ${trip.location} ${elevation ? `⛰ ${elevation}m` : ""}
          </div>

          <div class="editable" data-field="detail">
            ${formatDate(trip.date)} | ${trip.detail || ""}
          </div>

        </div>

        <button class="delete-btn" onclick="deleteTrip(${trip.id})">
          Delete
        </button>
      `

      card.querySelectorAll(".editable").forEach(el=>{
        el.addEventListener("click", ()=> makeEditable(el, trip))
      })

      dayContainer.appendChild(card)

      if(coords){

        routeCoords.push(coords)

        const marker = L.marker(coords)
          .addTo(map)
          .bindPopup(`
            <b>${trip.location}</b><br>
            ⛰ ${elevation ? elevation + " m" : "N/A"}
          `)

        markers.push(marker)
      }
    }

    if(routeCoords.length > 1){
      polyline = L.polyline(routeCoords, { color: 'blue' }).addTo(map)
      map.fitBounds(polyline.getBounds())
    }

  } catch(err){
    console.error(err)
    alert("載入行程失敗")
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
    alert("請填完整資料")
    return
  }

  if (isNaN(day) || day <= 0){
    alert("Day 必須是正整數")
    return
  }

  try {
    await fetch(API + "/trips", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ date, day, location, detail })
    })

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

  if(!confirm("確定刪除？")) return

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


/* =======================
   💬 留言系統
======================= */

async function loadComments(){

  try {

    const res = await fetch(API + "/comments")
    const comments = await res.json()

    const list = document.getElementById("commentList")
    list.innerHTML = ""

    comments.forEach(c => {

      const div = document.createElement("div")
      div.className = "comment-item"

      div.innerHTML = `
        <div class="comment-header">
          <strong>${c.username}</strong>
          <span class="comment-time">${timeAgo(c.created_at)}</span>
          <span class="comment-delete" onclick="deleteComment(${c.id})">Delete</span>
        </div>
        <div class="comment-text">${c.text}</div>
      `

      list.appendChild(div)
    })

  } catch(err){
    console.error(err)
  }
}


async function addComment(){

  const username = document.getElementById("username").value
  const text = document.getElementById("commentInput").value

  if(!username || !text){
    alert("請輸入名稱與留言")
    return
  }

  await fetch(API + "/comments", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ username, text })
  })

  document.getElementById("commentInput").value = ""

  loadComments()
}


async function deleteComment(id){

  if(!confirm("刪除留言？")) return

  await fetch(API + "/comments/" + id, {
    method:"DELETE"
  })

  loadComments()
}


/* -----------------------
   初始化
----------------------- */

initMap()
loadTrips()
loadComments()

setInterval(loadComments, 3000)