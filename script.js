const API = "https://dreamtheater.onrender.com"

async function loadTrips(){

    const res = await fetch(API + "/trips")
    const data = await res.json()

    const list = document.getElementById("list")

    list.innerHTML=""

    data.forEach(trip => {

        const li = document.createElement("li")

        li.innerHTML =
        "Day " + trip.day + " - " + trip.place +
        `<button onclick="deleteTrip(${trip.id})">Delete</button>`

        list.appendChild(li)

    })

}

async function addTrip(){

    const day = document.getElementById("day").value
    const place = document.getElementById("place").value

    await fetch(API + "/trips", {

        method:"POST",
        headers:{ "Content-Type":"application/json" },

        body:JSON.stringify({
            day:day,
            place:place
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