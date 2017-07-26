//Page module
var mypage = {
    setWindow: function (win) {
        $('.window').removeClass('active');
        $('.window.' + win).addClass('active');
    }
};

//Bikes module
function getBikes(callback) {
    var timedout = false;
    setTimeout(function () {
        timedout = true;
        callback();
    }, 6000);

    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (!timedout) {
                callback(JSON.parse(this.responseText));
            }
        }
    };
    req.open("GET", "/bicycles");
    req.send();
}

var map, myPos;
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(41.3990183, 2.1353762),
        zoom: 12
    });
}

if (navigator.geolocation) {
    mypage.setWindow('map');
    navigator.geolocation.getCurrentPosition(function (pos) {
        myPos = pos;

        new google.maps.Marker({
            position: new google.maps.LatLng(myPos.coords.latitude, myPos.coords.longitude),
            map: map
        });
    });
} else {
    mypage.setWindow('browserNotSupported');
}