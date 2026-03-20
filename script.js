const API = "https://dreamtheater.onrender.com"

let map
let markers = []

/* -----------------------
   日期格式化（重點）
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
   地點轉座標（Geocoding）
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
   載入行程（卡片 UI）
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

      // 建立卡片
      const card = document.createElement("div")
      card.className = "trip-card"

      card.innerHTML = `
        <div class="trip-info">
          <div class="trip-title">
            Day ${trip.day} - ${trip.location}
          </div>
          <div class="trip-detail">
            ${formatDate(trip.date)} | ${trip.detail || ""}
          </div>
        </div>

        <div class="trip-actions">
          <button class="delete-btn" onclick="deleteTrip(${trip.id})">
            Delete
          </button>
        </div>
      `

      container.appendChild(card)

      // 加入地圖標記
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