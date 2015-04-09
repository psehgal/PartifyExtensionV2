var keys = document.getElementsByClassName("setting-key");
var values = document.getElementsByClassName("setting-val");
var id = values[0].innerText;
chrome.extension.sendMessage({
	type: "id",
	value: id
})