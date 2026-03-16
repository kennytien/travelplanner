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

  // 驗證輸入格式
  if (!date || !day || !location || !detail) {
    alert("有欄位漏掉了！")
    return
  }

  // 驗證 day 是否為正整數
  if (isNaN(day) || day <= 0 || !Number.isInteger(Number(day))) {
    alert("Day 必須是正整數！")
    return
  }

  // 驗證 location 長度
  if (location.length < 2) {
    alert("Location 至少需要 2 個字元！")
    return
  }

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
  // 清除輸入欄位
  document.getElementById("date").value = ""
  document.getElementById("day").value = ""
  document.getElementById("location").value = ""
  document.getElementById("detail").value = ""
}

async function deleteTrip(id){

  await fetch(API + "/trips/" + id, {
    method:"DELETE"
  })

  loadTrips()

}

loadTrips()