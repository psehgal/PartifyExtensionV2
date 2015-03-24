

var csrf = "";
var oauth = "";
var port = 4370;
var currentTrack = "";
var currentPosition;
var accessCode;
var refreshed = false;
var refreshThreshold = 0.90;

chrome.webRequest.onBeforeSendHeaders.addListener(
function(details) {
    details.requestHeaders.push({name:"Origin",value:"https://embed.spotify.com"});
    return {requestHeaders: details.requestHeaders};
},
{urls: ["*://*.spotilocal.com:*/*"]},
["blocking", "requestHeaders"]);
      

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type) {
        case "get-csrf":
            console.log("case get-csrf");
            getCsrf();
            break;
        case "get-oauth":
            console.log("case get-oauth");
            getOauth();
            break;
        case "get-status":
            console.log("case get-status");
            getStatus();
            break;
        case "access-submit":
            console.log("case access-submit");
            var localAccessCode = request.accessCode;
            accessCode = localAccessCode;
            //TODO: send a response to update the popup UI
            initializeTokens();
            logTokens();
            updateStatus();
            break;
        case "refresh-playlist":
            console.log("case refresh-playlist");
            refreshPlaylist();
            break;
        break;
    }
    return true;
});

function logTokens() {
    console.log("csrf: " + csrf);
    console.log("oauth: " + oauth);
}

function updateStatus() {
    getStatus();
    setTimeout(function() { updateStatus() }, 1000);
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

// function refreshCurrentSong() {
//     $.post( "http://partify.club/api/currentSong", {accessCode: accessCode, songId : currentTrack}, function( data ) {
//         console.log("RESPONSE" + data);
//     });
// }

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

//spotify:user:pswizzy:starred
//spotify:user:pswizzy:playlist:5ZLL5PbxX1VCsTyMYJfgY2

var refreshPlaylist = function() {
    refreshed = true;
    chrome.tabs.create({"url":"spotify:user:pswizzy:starred","active":false}, function(tab){
        console.log(tab.id);
    });
    setTimeout(function() {
        chrome.tabs.create({"url":"spotify:user:pswizzy:playlist:4fFrOByHKGK2i2WckG74Vc","active":false}, function(tab){
            console.log(tab.id);
        });
    }, 500);
    setTimeout(function() { removeTab("spotify:user:pswizzy:starred") }, 1000);
    setTimeout(function() { removeTab("spotify:user:pswizzy:playlist:4fFrOByHKGK2i2WckG74Vc") }, 1000);
}

var getStatus = function() {
    var xmlhttp = new XMLHttpRequest();
    url = "https://" + makeid(10) + ".spotilocal.com:" + port.toString() + "/remote/status.json?csrf=" + csrf + "&oauth=" + oauth;
    //console.log(url);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var jsonResponse = JSON.parse(xmlhttp.responseText);
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

