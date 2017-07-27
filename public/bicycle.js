//Jquery
var $window = $(window);
var $winmap = $('.window.map');
var $failreason = $('#failreason');

//Settings
var settings = {
    positionTimeout: 2000
};

//Page module
var mypage = {
    setWindow: function (win) {
        $('.window').removeClass('active');
        $('.window.' + win).addClass('active');
    }
};

//Lib module
var lib = {
    dist: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    },
    getPosition: function (callback) {
        if (navigator.geolocation) {
            var state = 0;
            setTimeout(function () {
                if (state == 0) {
                    state = -1;
                    callback();
                }
            }, settings.positionTimeout);
            navigator.geolocation.getCurrentPosition(function (pos) {
                if (state != 0) return;
                state = 1;
                callback(pos);
            });
        } else {
            callback();
        }
    },
    buildStationContent: function (st) {
        return 'Bike Station:<br>' +
            st.streetNumber + ' ' + st.streetName + '<br>' +
            st.bikes + ' / ' + st.slots + ' Available';
    }
};

//Bikes module
function getBikes(callback) {
    var state = 0;
    setTimeout(function () {
        state = -1;
        if (state == 0) {
            callback();
        }
    }, 6000);

    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (state == 0) {
                state = 1;
                callback(JSON.parse(this.responseText));
            }
        }
    };
    req.open("GET", "/bicycles");
    req.send();
}

var map, infowindow, myPos;
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(41.3990183, 2.1353762),
        zoom: 12
    });
    infowindow = new google.maps.InfoWindow({});
    if (myPos) loadBikes();
}

lib.getPosition(function (pos) {
    if (pos) {
        mypage.setWindow('map');
        myPos = pos;
        if (map) loadBikes();
    } else {
        mypage.setWindow('browserNotSupported');
        $failreason.html('No Position');
    }
});

function loadBikes() {
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(myPos.coords.latitude, myPos.coords.longitude),
        map: map
    });
    map.setCenter(marker.position);
    map.setZoom(16);

    getBikes(function (bikes) {
        if (!bikes) {
            return mypage.setWindow('noBikes');
        }

        var stations = bikes.stations;
        stations.sort(function (a, b) {
            var aDist = lib.dist(a.latitude, a.longitude, myPos.coords.latitude, myPos.coords.longitude);
            var bDist = lib.dist(b.latitude, b.longitude, myPos.coords.latitude, myPos.coords.longitude);
            var m = Math.pow(10, 6);
            return parseInt(aDist * m - bDist * m);
        });

        for (var i = 0; i < stations.length && i < 7; i++) {
            var st = stations[i];
            var iconUrl = 'https://barcelonabikes.tk/bicon.png';
            if (st.bikes == 0) iconUrl = 'https://barcelonabikes.tk/biconRed.png';
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(st.latitude, st.longitude),
                icon: iconUrl,
                map: map
            });

            google.maps.event.addListener(marker, 'click', (function (marker, st) {
                return function () {
                    infowindow.setContent(lib.buildStationContent(st));
                    infowindow.open(map, marker);
                };
            })(marker, st))
        }
    });
}

function onResize() {
    var ratio = $window.height() / $window.width();
    if ((ratio > 1) != $winmap.hasClass('mobile')) {
        $winmap.toggleClass('mobile');
    }
}
$window.resize(onResize);
onResize();