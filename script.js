let list = document.getElementById("list")

let travelData = JSON.parse(localStorage.getItem("travel")) || []

function save() {
    localStorage.setItem("travel", JSON.stringify(travelData))
}

function render() {

    list.innerHTML = ""

    travelData.forEach((item, index) => {

        let li = document.createElement("li")

        li.innerHTML =
        "Day " + item.day +
        " - " + item.place +
        '<span class="delete" onclick="removeItem(' + index + ')">✖</span>'

        list.appendChild(li)

    })
}

function addItem() {

    let place = document.getElementById("place").value
    let day = document.getElementById("day").value

    if(place === "" || day === "") return

    travelData.push({
        day: day,
        place: place
    })

    save()
    render()

    document.getElementById("place").value = ""
}

function removeItem(index) {

    travelData.splice(index,1)

    save()
    render()
}

render()