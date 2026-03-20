const API = "https://dreamtheater.onrender.com"

let map
let markers = []

/* -----------------------
   Init Map
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
   Geocode（簡單版）
----------------------- */

async function getCoords(location){

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${location}`
  )

  const data = await res.json()

  if(data.length > 0){
    return [data[0].lat, data[0].lon]
  }

  return null
}

/* -----------------------
   Load Trips（卡片版）
----------------------- */

async function loadTrips(){

  const res = await fetch(API + "/trips")
  const trips = await res.json()

  const container = document.getElementById("tripList")
  container.innerHTML = ""

  clearMarkers()

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
          ${trip.date} | ${trip.detail || ""}
        </div>
      </div>

      <div class="trip-actions">
        <button onclick="deleteTrip(${trip.id})">Delete</button>
      </div>
    `

    container.appendChild(card)

    // 加到地圖
    const coords = await getCoords(trip.location)

    if(coords){
      const marker = L.marker(coords)
        .addTo(map)
        .bindPopup(`<b>${trip.location}</b><br>${trip.detail}`)

      markers.push(marker)
    }

  }

}

/* -----------------------
   Add Trip
----------------------- */

async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  if(!date || !day || !location){
    alert("請填寫完整")
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
   Delete
----------------------- */

async function deleteTrip(id){

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