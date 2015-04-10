var keys = document.getElementsByClassName("big-boy-title");
var values = document.getElementsByClassName("big-boy-value");
var id = values[0].innerText;

document.getElementById("access-code-wanted").onchange = function() {
	var newIdElement = document.getElementById("access-code-wanted");
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