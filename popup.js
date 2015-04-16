var red = "#AC3931";
var green = "#4FCC54"
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
        renderError(response.error);
        renderStatus(response.message);
        renderToggle(response.onoff, response.boolv);
    });
    document.getElementById("onoff").onclick = function() {
        chrome.extension.sendMessage({
            type: "toggle"
        },
        function(response) {
            renderToggle(response.onoff, response.boolv);
        });
    }
}

function renderToggle(onOrOff, boolv) {
    document.getElementById("onoff").textContent = onOrOff;
    document.getElementById("onoff").style.background = (boolv) ? green : red;
}

function renderError(message) {
    document.getElementById("error").innerText = message;
}

function renderStatus(message) {
	document.getElementById("status").innerHTML = message;
}
