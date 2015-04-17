var csrf = "";
var oauth = "";
var port = 4370;
var currentTrack = "";
var currentPosition;
var accessCode = "";
var playlistId = "";
var spotifyId = "";
var errorMessage = "";
var refreshed = false;
var refreshThreshold = 75;
var openedOnce = false;
var off = true;
var updateIntervalSeconds = 3;
var updateStatusInitialDelaySeconds = 10;
var volume = 0;
var shuffle = false;
var playing = false;
var repeat = false;
var installed = false;
var skipThresholdMultiplier = 1.05;
var maxPartTimeHours = 4;
var maxPartyTimeSeconds = maxPartTimeHours * 60 * 60;
var timeRunningSeconds = 0;
var playingPositionGlobal = 0;
var lengthGlobal = 0;

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
            var id = request.value;
            spotifyId = id;
            getAccessCode(id, true);
            break;
        case "login":
            login();
            break;
        case "get-status":
            var res = '<span style="opacity:.5;">connect</span>';
            if (accessCode) {
                res = accessCode;
            } 
            var onoff = (off == false) ? "Turn Off Partify" : "Turn On Partify";
            sendResponse({
                message: res,
                onoff: onoff,
                boolv: off,
                error: errorMessage
            });
            if (!accessCode) {
                if (spotifyId)
                    getAccessCode(spotifyId, false);
            }
            break;
        case "new-access-code":
            var code = request.value;
            removeTab("http://www.partify.club/party/" + accessCode);
            accessCode = code;
            chrome.tabs.create({url:"http://www.partify.club/party/" + accessCode,"active":false});
            break;
        case "toggle":
            if (off == false) {
                off = true;
                postTrackToPlaylist(playingPositionGlobal, lengthGlobal, true);
            } else {
                off = false;
                login();
                timeRunningSeconds = 0;
                errorMessage = "";
                if (!installed) {
                    installed = true;
                    setTimeout(function() { updateStatus(); }, 1000 * updateStatusInitialDelaySeconds);
                }
            }
            var onoff = (off == false) ? "Turn Off Partify" : "Turn On Partify";
            sendResponse({
                onoff: onoff,
                boolv: off
            })
            break;
        break;
    }
    return true;
});


function updateStatus() {
    var timedOut = false;
    if (!off) {
        timeRunningSeconds = timeRunningSeconds + updateIntervalSeconds;
        if (timeRunningSeconds > maxPartyTimeSeconds) {
            off = true;
            postTrackToPlaylist(playingPositionGlobal, lengthGlobal, true);
            alert("Your party timed out. Turn on Partify to start it again.");
            errorMessage = "party timed out";
            timedOut = true;
        }
        if (navigator.onLine) {
            if (!timedOut) {
                if (spotifyId == undefined) {
                    login();
                }
                errorMessage = "" ;
                if (csrf && oauth && accessCode && playlistId) {
                    getStatus();
                } else if (!csrf || !oauth) {
                    initializeTokens();
                } else if (!accessCode) {
                    getAccessCode(spotifyId, false);
                }
            }
        } else {
            errorMessage = "internet connection lost"
            off = true;
        }
    }
    setTimeout(function() { updateStatus() }, 1000 * updateIntervalSeconds);

}

function logTokens() {
    console.log("csrf: " + csrf);
    console.log("oauth: " + oauth);
}

function initializeTokens() {
    getOauth();
    getCsrf();
}

function updateTrackId(jsonResponse) {
    var trackId = jsonResponse["track"]["track_resource"]["uri"];
    if (currentTrack != trackId) {
        refreshed = false;
        currentTrack = trackId;
        var playingPosition = jsonResponse["playing_position"];
        var length = jsonResponse["track"]["length"];
        postTrackToPlaylist(playingPosition, length, false);
        return true;
    }
    return false;
}

function updateProperties(propertiesList, jsonResponse) {
    var propertyChanged = false;
    for (var i = 0; i < propertiesList.length; i++) {
        var propertyString = propertiesList[i];
        var iProperty = jsonResponse[propertyString];
        propertyChanged = updateProperty(propertyString, iProperty) || propertyChanged;
    }
    return propertyChanged;
}

function updateProperty(propertyString, iProperty) {
    var changed = false;
    if (propertyString == "volume") {
        if (volume != iProperty) {
            volume = iProperty;
            changed = true;
        }
    } else if (propertyString == "shuffle") {
        if (shuffle != iProperty) {
            shuffle = iProperty;
            changed = true;
        }
    } else if (propertyString == "playing") {
        if (playing != iProperty) {
            playing = iProperty;
            changed = true;
        }
    } else if (propertyString == "repeat") {
        if (repeat != iProperty) {
            repeat = iProperty;
            changed = true;
        }
    }
    return changed;
}
 
function postProperty(propertyString, property) {
    var xmlhttp = new XMLHttpRequest();
    var url = "https://partify.herokuapp.com/api/status"
    var params = propertyString + "=" + property.toString() + "&accessCode=" + accessCode;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        } else {
            //console.log(xmlhttp.responseText);
        }
    }
    xmlhttp.open("POST", url, true);
    xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function postTrackToPlaylist(playingPosition, length, turningOff) {
    var xmlhttp = new XMLHttpRequest();
    url = "https://partify.herokuapp.com/api/currentSong";
    if (turningOff) {
        playing = false;
    }
    var params = "accessCode=" + accessCode + "&songId=" + currentTrack + "&playingPosition=" + playingPosition + "&length=" + length + "&timestamp=" + Date.now() + "&playing=" + playing + "&repeat=" + repeat + "&shuffle=" + shuffle + "&volume=" + volume;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //console.log(xmlhttp.responseText);
            //console.log("new song posted to partify");
        } else if (xmlhttp.readyState == 4 && xmlhttp.status == 404) {
            getAccessCode(spotifyId, false);
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

var getAccessCode = function(id, openTabs) {
    var url = "http://www.partify.club/api/auth?spotifyId=" + id;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            var localAccessCode = jsonResponse["accessCode"];
            var localPlaylistId = jsonResponse["playlistId"];
            playlistId = localPlaylistId;
            accessCode = localAccessCode;
            if (openTabs) {
                openTabsInitially();
            }
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
    chrome.tabs.create({"url":starredPlaylistUrl, "active":false}, function(tab){});
    setTimeout(function() {
        chrome.tabs.create({"url":partifyPlaylistUrl,"active":false}, function(tab){});
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
                initializeTokens();
            } else if (jsonResponse["track"]["track_resource"]["uri"]) {
                var trackUri = jsonResponse["track"]["track_resource"]["uri"];
                var localCurrentTrack = trackUri;
                var updated = updateTrackId(jsonResponse);
                var properties = ["volume", "playing", "shuffle", "repeat"];
                var length = jsonResponse["track"]["length"];
                var position = jsonResponse["playing_position"];
                playingPositionGlobal = position;
                lengthGlobal = length;
                var percent = (position / length) * 100;
                var skipDetected = false;
                var changed = updateProperties(properties, jsonResponse);
                var skipThreshold = (updateIntervalSeconds / length) * 100.00;
                if (currentPosition) {
                    var delta = Math.abs(percent - currentPosition)
                    if (delta > (skipThreshold * skipThresholdMultiplier)) {
                        skipDetected = true;
                    }
                }
                if (!updated && (changed || skipDetected)) {
                    postTrackToPlaylist(position, length, false);
                }
                currentPosition = percent;
                if (percent >= refreshThreshold && refreshed == false) {
                    //refreshPlaylist();
                }
            }
        }
        else if ((xmlhttp.readyState == 4 && xmlhttp.status == 0) || (xmlhttp.readyState == 0 && xmlhttp.status == 0)) {
            xmlhttp.abort();
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

var getOauth = function() {
    var xmlhttp = new XMLHttpRequest();
    url = "http://open.spotify.com/token";
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
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
    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            csrf = jsonResponse["token"];
            return;
        }
    }
    xmlhttp.onerror = function() {
        port += 1;
        if (port == 4390) {
            port = 4370;
        }
        setTimeout(function() { getCsrf(); }, 500);
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();  
}

