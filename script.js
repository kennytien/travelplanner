const API = "https://dreamtheater.onrender.com"

let map
let markers = []
let polyline
const geocodeCache = new Map()

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
   Geocode
----------------------- */
async function getCoords(location){
  if(!location) return null

  if(geocodeCache.has(location)){
    return geocodeCache.get(location)
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    )

    const data = await res.json()

    if(data.length > 0){
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache.set(location, coords)
      return coords
    }
  } catch(err){
    console.error("Geocode error:", err)
  }

  geocodeCache.set(location, null)
  return null
}

function toRadians(value){
  return value * Math.PI / 180
}

function calculateDistanceKm(fromCoords, toCoords){
  const [lat1, lon1] = fromCoords
  const [lat2, lon2] = toCoords
  const earthRadiusKm = 6371

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function groupTripsByDay(trips){
  const dayGroups = []
  const dayMap = new Map()

  for(const trip of trips){
    if(!dayMap.has(trip.day)){
      const group = { day: trip.day, trips: [] }
      dayMap.set(trip.day, group)
      dayGroups.push(group)
    }

    dayMap.get(trip.day).trips.push(trip)
  }

  return dayGroups
}

async function renderDayDistances(dayGroups){
  const dayStops = dayGroups
    .map(group => ({
      day: group.day,
      distanceEl: group.distanceEl,
      startLocation: group.trips[0]?.location || "",
      endLocation: group.trips[group.trips.length - 1]?.location || ""
    }))
    .filter(group => group.startLocation || group.endLocation)

  for(let i = 0; i < dayStops.length - 1; i++){
    const currentDay = dayStops[i]
    const nextDay = dayStops[i + 1]

    if(!currentDay.distanceEl) continue

    currentDay.distanceEl.textContent =
      `計算 Day ${currentDay.day} 到 Day ${nextDay.day} 距離中...`

    const [fromCoords, toCoords] = await Promise.all([
      getCoords(currentDay.endLocation),
      getCoords(nextDay.startLocation)
    ])

    if(!fromCoords || !toCoords){
      currentDay.distanceEl.textContent =
        `到 Day ${nextDay.day} 的距離：無法取得`
      continue
    }

    const distanceKm = calculateDistanceKm(fromCoords, toCoords)
    currentDay.distanceEl.textContent =
      `到 Day ${nextDay.day} 的距離：${distanceKm.toFixed(1)} 公里`
  }

  const lastDay = dayGroups[dayGroups.length - 1]

  if(lastDay?.distanceEl){
    const lastLocation = lastDay.trips[lastDay.trips.length - 1]?.location || ""

    lastDay.distanceEl.textContent = "計算返回台北距離中..."

    const [lastCoords, taipeiCoords] = await Promise.all([
      getCoords(lastLocation),
      getCoords("Taipei")
    ])

    if(!lastCoords || !taipeiCoords){
      lastDay.distanceEl.textContent = "返回台北距離：無法取得"
      return
    }

    const returnDistanceKm = calculateDistanceKm(lastCoords, taipeiCoords)
    lastDay.distanceEl.textContent =
      `返回台北距離：${returnDistanceKm.toFixed(1)} 公里`
  }
}

/* -----------------------
   Elevation
----------------------- */
async function getElevation(lat, lon){
  try {

    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )

    if(!res.ok){
      console.warn("Elevation API failed:", res.status)
      return null
    }

    const text = await res.text()

    if(text.startsWith("<")){
      console.warn("Elevation returned HTML")
      return null
    }

    const data = JSON.parse(text)

    return data.results?.[0]?.elevation ?? null

  } catch(err){
    console.error("Elevation error:", err)
    return null
  }
}

/* -----------------------
   Weather（氣溫、雨量、風速）
----------------------- */
async function getWeather(lat, lon) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m` +
      `&timezone=auto`

    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()

    const temp = data.hourly.temperature_2m[0]
    const rain = data.hourly.precipitation[0]
    const wind = data.hourly.wind_speed_10m[0]

    return { temp, rain, wind }
  } catch (err) {
    console.error("Weather error:", err)
    return { temp: null, rain: null, wind: null }
  }
}

/* -----------------------
   Inline 編輯
----------------------- */
function makeEditable(el, trip){

  if(el.querySelector("input")) return

  let field = el.dataset.field

  let value =
    field === "location" ? trip.location :
    field === "date" ? formatDate(trip.date) :
    trip.detail || ""

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
      date: field === "date" ? input.value : formatDate(trip.date),
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
   載入行程
----------------------- */
async function loadTrips(){

  const res = await fetch(API + "/trips")
  let trips = await res.json()

  trips.sort((a,b)=> a.day - b.day)

  const dayGroups = groupTripsByDay(trips)

  const container = document.getElementById("tripList")
  container.innerHTML = ""

  clearMap()

  let routeCoords = []
  for(const group of dayGroups){
    const dayBlock = document.createElement("div")
    dayBlock.className = "day-group"

    const title = document.createElement("h3")
    title.textContent = `Day ${group.day}`

    const dayContainer = document.createElement("div")
    dayContainer.className = "day-items"

    dayBlock.appendChild(title)
    dayBlock.appendChild(dayContainer)
    container.appendChild(dayBlock)

    new Sortable(dayContainer, { animation: 150 })

    for(const [index, trip] of group.trips.entries()){

      const card = document.createElement("div")
      card.className = "trip-card"

      const isLastTripOfDay = index === group.trips.length - 1

      card.innerHTML = `
        <div class="trip-info">

          <div class="editable" data-field="location">
            📍 ${trip.location}
            <span class="elevation">⛰ loading...</span>
            <span class="weather">🌤 loading...</span>
          </div>

          <div class="editable" data-field="date">
            📅 ${formatDate(trip.date)}
          </div>

          <div class="editable" data-field="detail">
            ${trip.detail || ""}
          </div>

          ${isLastTripOfDay ? `
            <div class="trip-distance">
              距離資訊載入中...
            </div>
          ` : ""}

        </div>

        <button class="delete-btn" onclick="deleteTrip(${trip.id})">
          Delete
        </button>
      `

      dayContainer.appendChild(card)

      if(isLastTripOfDay){
        group.distanceEl = card.querySelector(".trip-distance")
      }

      card.querySelectorAll(".editable").forEach(el=>{
        el.addEventListener("click", ()=> makeEditable(el, trip))
      })

      /* -----------------------
         Geocode → Elevation → Weather
      ----------------------- */
      getCoords(trip.location).then(coords => {

        if(!coords){
          card.querySelector(".elevation").textContent = "⛰ N/A"
          card.querySelector(".weather").textContent = "🌤 N/A"
          return
        }

        routeCoords.push(coords)

        // Elevation
        getElevation(coords[0], coords[1]).then(elevation => {

          card.querySelector(".elevation").textContent =
            elevation !== null ? `⛰ ${elevation}m` : "⛰ N/A"

          // Weather
          getWeather(coords[0], coords[1]).then(w => {

            card.querySelector(".weather").textContent =
              w.temp !== null
                ? `🌡 ${w.temp}°C | 🌧 ${w.rain}mm | 💨 ${w.wind}m/s`
                : "🌤 N/A"

            // Marker & Popup
            const marker = L.marker(coords)
              .addTo(map)
              .bindPopup(`
                <b>${trip.location}</b><br><br>
                ⛰ 海拔：${elevation ?? "N/A"} m<br>
                🌡 氣溫：${w.temp ?? "N/A"} °C<br>
                🌧 降雨：${w.rain ?? "N/A"} mm<br>
                💨 風速：${w.wind ?? "N/A"} m/s
              `)

            marker._tripId = trip.id
            markers.push(marker)

            if(routeCoords.length > 1){
              if(polyline) map.removeLayer(polyline)
              polyline = L.polyline(routeCoords).addTo(map)
            }
          })
        })
      })
    }
  }

  renderDayDistances(dayGroups)
}

/* -----------------------
   ⭐ 每小時更新所有天氣
----------------------- */
async function updateWeatherForAllTrips(){
  console.log("⏳ 更新所有天氣...")

  for (const marker of markers) {
    if (!marker._latlng || marker._tripId == null) continue

    const { lat, lng } = marker._latlng
    const cardWeather = document.querySelector(
      `.trip-card .weather`
    )

    const w = await getWeather(lat, lng)

    if (w.temp !== null && cardWeather) {
      cardWeather.textContent =
        `🌡 ${w.temp}°C | 🌧 ${w.rain}mm | 💨 ${w.wind}m/s`
    }
  }

  console.log("✔ 天氣更新完成（每小時）")
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

// ⭐每 1 小時更新天氣
setInterval(updateWeatherForAllTrips, 3600000)
