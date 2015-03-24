window.onload = function() {
    // document.getElementById("csrf").onclick = function() {
    //     chrome.extension.sendMessage({
    //         type: "get-csrf"
    //     });
    // }
    // document.getElementById("oauth").onclick = function() {
    //     chrome.extension.sendMessage({
    //         type: "get-oauth"
    //     });
    // }
    // document.getElementById("status").onclick = function() {
    //     chrome.extension.sendMessage({
    //         type: "get-status"
    //     })
    // }
    document.getElementById("accessCodeSubmit").onclick = function() {
        var accessCode = document.getElementById("accessCodeInput").value;
        chrome.extension.sendMessage({
            type: "access-submit",
            accessCode: accessCode
        })
    }
    // document.getElementById("refresh").onclick = function() {
    //     chrome.extension.sendMessage({
    //         type: "refresh-playlist"
    //     })
    // }
}

function renderMessage(message) {
	document.getElementById("message").textContent = message;
}
