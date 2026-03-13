const API = "https://dreamtheater.onrender.com"

async function loadTrips(){

  const res = await fetch(API + "/trips")

  const trips = await res.json()

  const table = document.getElementById("tripList")

  table.innerHTML = ""

  trips.forEach(trip => {

    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${trip.date}</td>
      <td>Day ${trip.day}</td>
      <td>${trip.location}</td>
      <td>${trip.detail}</td>
      <td>
      <button onclick="deleteTrip(${trip.id})">Delete</button>
      </td>
    `

    table.appendChild(row)

  })

}

async function addTrip(){

  const date = document.getElementById("date").value
  const day = document.getElementById("day").value
  const location = document.getElementById("location").value
  const detail = document.getElementById("detail").value

  await fetch(API + "/trips", {

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      date,
      day,
      location,
      detail
    })

  })

  loadTrips()

}

async function deleteTrip(id){

  await fetch(API + "/trips/" + id, {
    method:"DELETE"
  })

  loadTrips()

}

loadTrips()