

var csrf = "";
var oauth = "";
var port = 4370;
var currentTrack = "";
var currentPosition;
var accessCode = "";
var playlistId = "";
var spotifyId = "";
var refreshed = false;
var refreshThreshold = 0.90;
var openedOnce = false;

chrome.webRequest.onBeforeSendHeaders.addListener(
function(details) {
    details.requestHeaders.push({name:"Origin",value:"https://embed.spotify.com"});
    return {requestHeaders: details.requestHeaders};
},
{urls: ["*://*.spotilocal.com:*/*"]},
["blocking", "requestHeaders"]);
      

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type) {
        case "id":
            console.log("case id");
            var id = request.value;
            spotifyId = id;
            getAccessCode(id);
            initializeTokens();
            logTokens();
            updateStatus();
            break;
        case "login":
            console.log("case login");
            login();
            break;
        case "get-status":
            console.log("case get-status");
            var res = '<span style="opacity:.5;">connect</span>';
            if (!(accessCode == "")) {
                res = accessCode;
            }
            sendResponse({
                message: res
            });
            break;
        case "new-access-code":
            console.log("case new-access-code");
            var code = request.value;
            removeTab("http://www.partify.club/party/" + accessCode);
            accessCode = code;
            chrome.tabs.create({url:"http://www.partify.club/party/" + accessCode,"active":false});
            console.log("new access code: " + code);
            break;
        break;
    }
    return true;
});

function updateStatus() {
    getStatus();
    setTimeout(function() { updateStatus() }, 1000);
}

function logTokens() {
    console.log("csrf: " + csrf);
    console.log("oauth: " + oauth);
}

function initializeTokens() {
    getOauth();
    getCsrf();
}

function updateTrackId(trackId) {
    if (currentTrack != trackId) {
        refreshed = false;
        currentTrack = trackId;
        console.log("current track updated: " + currentTrack);
        postTrackToPlaylist();
    }
}

function postTrackToPlaylist() {
    var xmlhttp = new XMLHttpRequest();
    url = "https://partify.herokuapp.com/api/currentSong";
    // var params = "accessCode=" + accessCode + "&songId=" + '"' + currentTrack + '"';
    var params = "accessCode=" + accessCode + "&songId=" + currentTrack;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log(xmlhttp.responseText);
            console.log("new song posted to partify");
        }
    }
    xmlhttp.open("POST", url, true);
    xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function makeid(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function removeTab(url) {
    chrome.tabs.query({"url":url}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            chrome.tabs.remove(tabs[i].id);
        }
    })
}

function openTabsInitially() {
    var partifyPlaylistUrl = "spotify:user:" + spotifyId + ":playlist:" + playlistId;
    chrome.tabs.create({url:partifyPlaylistUrl,"active":false});
    setTimeout(function() { removeTab(partifyPlaylistUrl) }, 1000);
    chrome.tabs.create({url:"http://partify.club/party/" + accessCode,"active":false});
}

var getAccessCode = function(id) {
    var url = "http://www.partify.club/api/auth?spotifyId=" + id;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            var localAccessCode = jsonResponse["accessCode"];
            var localPlaylistId = jsonResponse["playlistId"];
            playlistId = localPlaylistId;
            accessCode = localAccessCode;
            openTabsInitially();
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

var login = function() {
    var url = "http://www.partify.club/login"
    chrome.tabs.create({url: url, active: true}, function callback(tab) {});
}

var refreshPlaylist = function() {
    refreshed = true;
    var starredPlaylistUrl = "spotify:user:" + spotifyId + ":starred";
    var partifyPlaylistUrl = "spotify:user:" + spotifyId + ":playlist:" + playlistId;
    chrome.tabs.create({"url":starredPlaylistUrl, "active":false}, function(tab){
        console.log(tab.id);
    });
    setTimeout(function() {
        chrome.tabs.create({"url":partifyPlaylistUrl,"active":false}, function(tab){
            console.log(tab.id);
        });
    }, 500);
    setTimeout(function() { removeTab(starredPlaylistUrl) }, 1000);
    setTimeout(function() { removeTab(partifyPlaylistUrl) }, 1000);
}

var getStatus = function() {
    var xmlhttp = new XMLHttpRequest();
    url = "https://" + makeid(10) + ".spotilocal.com:" + port.toString() + "/remote/status.json?csrf=" + csrf + "&oauth=" + oauth;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            if (jsonResponse["error"]) {
                console.log(xmlhttp.responseText);
                initializeTokens();
            } else if (jsonResponse["track"]["track_resource"]["uri"]) {
                var trackUri = jsonResponse["track"]["track_resource"]["uri"];
                //var localCurrentTrack = trackUri.replace("spotify:track:", "");
                var localCurrentTrack = trackUri;
                updateTrackId(localCurrentTrack);
                //console.log(localCurrentTrack);
                var length = jsonResponse["track"]["length"]
                var position = jsonResponse["playing_position"]
                var percent = (position / length) * 100;
                currentPosition = percent;
                if (percent >= 75 && refreshed == false) {
                    console.log("about to call refreshPlaylist()");
                    refreshPlaylist();
                }
            }
        }
        else if ((xmlhttp.readyState == 4 && xmlhttp.status == 0) || (xmlhttp.readyState == 0 && xmlhttp.status == 0)) {
            console.log("status update error");
            xmlhttp.abort();
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

var getOauth = function() {
    var xmlhttp = new XMLHttpRequest();
    url = "http://open.spotify.com/token";
    console.log(url);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log(xmlhttp.responseText);
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            oauth = jsonResponse["t"];
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

var getCsrf = function() {
    var xmlhttp = new XMLHttpRequest();
    url = "https://" + makeid(10) + ".spotilocal.com:" + port.toString() + "/simplecsrf/token.json?service=remote";
    console.log(url);
    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log(xmlhttp.responseText);
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            csrf = jsonResponse["token"];
            return;
        }
    }
    xmlhttp.onerror = function() {
        port += 1;
        setTimeout(function() { getCsrf(); }, 100);
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();  
}

