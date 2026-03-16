const API = "https://dreamtheater.onrender.com"

// 儲存當前編輯的 trip id
let editingTripId = null

async function loadTrips(){

  const res = await fetch(API + "/trips")

  const trips = await res.json()

  const table = document.getElementById("tripList")

  table.innerHTML = ""

  trips.forEach(trip => {

    const row = document.createElement("tr")
    row.dataset.tripId = trip.id

    row.innerHTML = `
      <td class="editable" data-field="date">${trip.date}</td>
      <td class="editable" data-field="day">Day ${trip.day}</td>
      <td class="editable" data-field="location">${trip.location}</td>
      <td class="editable" data-field="detail">${trip.detail}</td>
      <td>
      <button onclick="deleteTrip(${trip.id})">Delete</button>
      </td>
    `

    // 為每個可編輯的單元格添加點擊事件
    const editableCells = row.querySelectorAll(".editable")
    editableCells.forEach(cell => {
      cell.addEventListener("click", function() {
        makeEditable(this, trip)
      })
    })

    table.appendChild(row)

  })

}

function makeEditable(cell, trip) {
  // 如果已經在編輯其他行，先取消
  if (editingTripId !== null && editingTripId !== trip.id) {
    return
  }

  if (cell.querySelector("input")) {
    return // 已經在編輯
  }

  const field = cell.dataset.field
  let currentValue = cell.textContent

  // 移除 "Day " 前綴
  if (field === "day") {
    currentValue = currentValue.replace("Day ", "")
  }

  const input = document.createElement("input")
  input.type = field === "date" ? "date" : "text"
  input.value = currentValue
  input.style.width = "100%"

  cell.textContent = ""
  cell.appendChild(input)
  input.focus()
  input.select()

  editingTripId = trip.id

  // 處理保存
  async function saveEdit() {
    const newValue = input.value

    // 驗證輸入
    if (!newValue) {
      alert("欄位不能為空！")
      return
    }

    if (field === "day") {
      if (isNaN(newValue) || newValue <= 0 || !Number.isInteger(Number(newValue))) {
        alert("Day 必須是正整數！")
        return
      }
    }

    if (field === "location") {
      if (newValue.length < 2) {
        alert("Location 至少需要 2 個字元！")
        return
      }
    }

    // 準備更新的數據
    const updateData = {
      date: field === "date" ? newValue : trip.date,
      day: field === "day" ? newValue : trip.day,
      location: field === "location" ? newValue : trip.location,
      detail: field === "detail" ? newValue : trip.detail
    }

    // 發送 PUT 請求
    try {
      const response = await fetch(API + "/trips/" + trip.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        editingTripId = null
        loadTrips()
      } else {
        alert("更新失敗！")
        editingTripId = null
        loadTrips()
      }
    } catch (error) {
      console.error("Error:", error)
      alert("更新出錯！")
      editingTripId = null
      loadTrips()
    }
  }

  // 處理取消
  function cancelEdit() {
    editingTripId = null
    loadTrips()
  }

  // Enter 鍵保存，Escape 鍵取消
  input.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      saveEdit()
    } else if (event.key === "Escape") {
      cancelEdit()
    }
  })

  // 失焦時自動保存
  input.addEventListener("blur", function() {
    if (editingTripId === trip.id) {
      saveEdit()
    }
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