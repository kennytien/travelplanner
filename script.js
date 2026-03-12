const API = "https://dreamtheater.onrender.com"

async function loadTrips(){

 const res = await fetch(API + "/trips")
 const data = await res.json()

 const list = document.getElementById("list")

 list.innerHTML=""

 data.forEach(trip => {

  const tr = document.createElement("tr")

  tr.innerHTML = `
   <td>${trip.date}</td>
   <td>Day ${trip.day}</td>
   <td>${trip.place}</td>
   <td>${trip.detail}</td>
   <td>
     <button onclick="deleteTrip(${trip.id})">Delete</button>
   </td>
  `

  list.appendChild(tr)

 })

}

async function addTrip(){

 const date = document.getElementById("date").value
 const day = document.getElementById("day").value
 const place = document.getElementById("place").value
 const detail = document.getElementById("detail").value

 await fetch(API + "/trips",{

  method:"POST",
  headers:{ "Content-Type":"application/json" },

  body:JSON.stringify({
   date,
   day,
   place,
   detail
  })

 })

 loadTrips()

}

async function deleteTrip(id){

 await fetch(API + "/trips/"+id,{
  method:"DELETE"
 })

 loadTrips()

}

loadTrips()