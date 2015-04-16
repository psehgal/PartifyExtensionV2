var csrf = "";
var oauth = "";
var port = 4370;
var currentTrack = "";
var currentPosition;
var accessCode = "";
var playlistId = "";
var spotifyId = "";
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
            getAccessCode(id, true);
            //initializeTokens();
            //logTokens();
            //updateStatus();
            break;
        case "login":
            console.log("case login");
            login();
            break;
        case "get-status":
            console.log("case get-status");
            var res = '<span style="opacity:.5;">connect</span>';
            if (accessCode) {
                res = accessCode;
            } 
            var onoff = (off == false) ? "Turn Off Partify" : "Turn On Partify";
            console.log("onoff: " + onoff);
            sendResponse({
                message: res,
                onoff: onoff,
                boolv: off
            });
            if (!accessCode) {
                if (spotifyId)
                    getAccessCode(spotifyId, false);
            }
            initializeTokens();
            break;
        case "new-access-code":
            console.log("case new-access-code");
            var code = request.value;
            removeTab("http://www.partify.club/party/" + accessCode);
            accessCode = code;
            chrome.tabs.create({url:"http://www.partify.club/party/" + accessCode,"active":false});
            console.log("new access code: " + code);
            break;
        case "toggle":
            console.log("toggle");
            if (off == false) {
                off = true;
            } else {
                off = false;
                login();
                initializeTokens();
                logTokens();
                //updateStatus();
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
    if (spotifyId == undefined) {
        login();
    }
    if (!off) {
        if (csrf && oauth && accessCode && playlistId) {
            getStatus();
        } else if (!csrf || !oauth) {
            initializeTokens();
        } else if (!accessCode) {
            getAccessCode(spotifyId, false);
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
        console.log("current track updated: " + currentTrack);
        var playingPosition = jsonResponse["playing_position"];
        var length = jsonResponse["track"]["length"];
        postTrackToPlaylist(playingPosition, length);
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
            console.log("volume: " + iProperty);
            changed = true;
        }
    } else if (propertyString == "shuffle") {
        if (shuffle != iProperty) {
            shuffle = iProperty;
            console.log("shuffle: " + iProperty);
            changed = true;
        }
    } else if (propertyString == "playing") {
        if (playing != iProperty) {
            playing = iProperty;
            console.log("playing: " + iProperty);
            changed = true;
        }
    } else if (propertyString == "repeat") {
        if (repeat != iProperty) {
            repeat = iProperty;
            console.log("repeat: " + iProperty);
            changed = true;
        }
    }
    // if (changed) {
    //     postProperty(propertyString, iProperty);
    // }
    return changed;
}
 
function postProperty(propertyString, property) {
    var xmlhttp = new XMLHttpRequest();
    var url = "https://partify.herokuapp.com/api/status"
    var params = propertyString + "=" + property.toString() + "&accessCode=" + accessCode;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log(xmlhttp.responseText);
        } else {
            console.log(xmlhttp.responseText);
        }
    }
    xmlhttp.open("POST", url, true);
    xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function postTrackToPlaylist(playingPosition, length) {
    var xmlhttp = new XMLHttpRequest();
    url = "https://partify.herokuapp.com/api/currentSong";
    // var params = "accessCode=" + accessCode + "&songId=" + '"' + currentTrack + '"';
    var params = "accessCode=" + accessCode + "&songId=" + currentTrack + "&playingPosition=" + playingPosition + "&length=" + length + "&timestamp=" + Date.now() + "&playing=" + playing + "&repeat=" + repeat + "&shuffle=" + shuffle + "&volume=" + volume;
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log(xmlhttp.responseText);
            console.log("new song posted to partify");
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
            console.log("getAccessCode() got accessCode: " + accessCode);
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
                var updated = updateTrackId(jsonResponse);
                //console.log(localCurrentTrack);
                var properties = ["volume", "playing", "shuffle", "repeat"];
                var length = jsonResponse["track"]["length"];
                var position = jsonResponse["playing_position"];
                var percent = (position / length) * 100;
                // for (var i = 0; i < properties.length; i++) {
                //     var propertyString = properties[i];
                //     var iProperty = jsonResponse[propertyString];
                //     updateProperty(propertyString, iProperty);
                // }
                var skipDetected = false;
                var changed = updateProperties(properties, jsonResponse);
                var skipThreshold = (updateIntervalSeconds / length) * 100.00;
                if (currentPosition) {
                    var delta = Math.abs(percent - currentPosition)
                    if (delta > (skipThreshold * skipThresholdMultiplier)) {
                        console.log("skip detected!");
                        skipDetected = true;
                        //postTrackToPlaylist(position, length);
                    }
                }
                if (!updated && (changed || skipDetected)) {
                    //post to /api/currentSong
                    console.log("change detected");
                    postTrackToPlaylist(position, length);
                }
                currentPosition = percent;
                if (percent >= refreshThreshold && refreshed == false) {
                    //console.log("about to call refreshPlaylist()");
                    //refreshPlaylist();
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
        if (port == 4390) {
            port = 4370;
        }
        setTimeout(function() { getCsrf(); }, 500);
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();  
}

