window.onload = function() {
    var message = "";
    document.getElementById("login").onclick = function() {
        chrome.extension.sendMessage({
            type: "login"
        });
    }
    chrome.extension.sendMessage({
        type: "get-status"
    },
    function(response) {
        renderStatus(response.message);
    });
}

function renderStatus(message) {
	document.getElementById("status").textContent = message;
}
