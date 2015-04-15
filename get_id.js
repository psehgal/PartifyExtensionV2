
var id = document.getElementById("spotifyId").innerText;


document.getElementById("access-code").onchange = function() {
	var newIdElement = document.getElementById("access-code");
	var accessCode = newIdElement.value;
	chrome.extension.sendMessage({
		type: "new-access-code",
		value: accessCode
	})
}
console.log(id);
chrome.extension.sendMessage({
	type: "id",
	value: id
});
