function addPlace() {

    let place = document.getElementById("place").value;

    let li = document.createElement("li");
    li.textContent = place;

    document.getElementById("list").appendChild(li);

}