var id;

document.onload = function() {
	id = document.getElementById("access-code").value;
}


document.getElementById("access-code").onchange = function() {
	var newIdElement = document.getElementById("access-code");
	var accessCode = newIdElement.value;
	chrome.extension.sendMessage({
		type: "new-access-code",
		value: accessCode
	})
}

chrome.extension.sendMessage({
	type: "id",
	value: id
})