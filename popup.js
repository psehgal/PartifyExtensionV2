window.onload = function() {
    var message = "";
    document.getElementById("login").onclick = function() {
        chrome.extension.sendMessage({
            type: "login"
        });
    };
    chrome.extension.sendMessage({
        type: "get-status"
    },
    function(response) {
        renderStatus(response.message);
        document.getElementById("onoff").textContent = response.onoff;
    });
    document.getElementById("onoff").onclick = function() {
        chrome.extension.sendMessage({
            type: "toggle"
        },
        function(reponse) {
            document.getElementById("onoff").textContent = reponse.onoff;
        });
    }
}

function renderStatus(message) {
	document.getElementById("status").innerHTML = message;
}
