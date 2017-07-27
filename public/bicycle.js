//Jquery
var $window = $(window);
var $winmap = $('.window.map');
var $failreason = $('#failreason');
var $stations = $('.stationswrapper');

//Settings
var settings = {
    positionTimeout: 6000
};

//Page module
var mypage = {
    setWindow: function (win) {
        $('.window').removeClass('active');
        $('.window.' + win).addClass('active');
    },
    addStationOpt: function (st) {
        var $div = $(document.createElement('div'));
        $div.addClass('stationopt');
        var g = st.bikes == 1 ? '' : 's';

        var dist = lib.getDistanceFromLatLonInKm(myPos.coords, st);

        var tbl = document.createElement('table');
        $div.append(tbl);
        var row = tbl.insertRow(-1);
        $(row.insertCell(-1))
            .html('<span style="font-size:28px;">' + st.bikes + '</span> bike' + g)
            .addClass('numbikes');
        $(row.insertCell(-1))
            .html(st.streetNumber + ' ' + st.streetName)
            .addClass('location');
        $(row.insertCell(-1))
            .html(dist.toFixed(2) + 'km')
            .addClass('distt');
        $(row.insertCell(-1))
            .html('<a href="https://www.google.com/maps/dir/?api=1&origin=' + lib.formatPos(myPos.coords) + '&destination=' + lib.formatPos(st) + '" target="_blank"><img src="directions.png"></a>')
            .addClass('directions');

        $stations.append($div);

        //Add move more to end
        $stations.append($stations.find('.loadmore'));

        //Scroll to bottom
        var obj = $stations[0];
        obj.scrollTop = obj.scrollHeight;

        return $div;
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
    },
    formatPos: function (pos) {
        return pos.latitude + ',' + pos.longitude;
    },
    deg2rad: function (deg) {
        return deg * (Math.PI / 180)
    },
    getDistanceFromLatLonInKm: function (aa, bb) {
        var lat1 = aa.latitude;
        var lon1 = aa.longitude;
        var lat2 = bb.latitude;
        var lon2 = bb.longitude;
        var R = 6371; // Radius of the earth in km
        var dLat = lib.deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = lib.deg2rad(lon2 - lon1);
        var a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lib.deg2rad(lat1)) * Math.cos(lib.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
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

var map, infowindow, myPos, stations;
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

        bikes.stations.sort(function (a, b) {
            var aDist = lib.dist(a.latitude, a.longitude, myPos.coords.latitude, myPos.coords.longitude);
            var bDist = lib.dist(b.latitude, b.longitude, myPos.coords.latitude, myPos.coords.longitude);
            var m = Math.pow(10, 6);
            return parseInt(aDist * m - bDist * m);
        });
        stations = bikes.stations;
        $('.loading').css('display', 'none');

        loadStations(5);

        $stations.find('.loadmore').click(function () {
            loadStations(5);
        });
    });
}

function loadStations(num) {
    for (var i = 0; i < num && stations.length > 0; i++) {
        var st = stations.splice(0, 1)[0];
        var $opt = mypage.addStationOpt(st);
        var iconUrl = 'https://barcelonabikes.tk/bicon.png';
        if (st.bikes == 0) iconUrl = 'https://barcelonabikes.tk/biconRed.png';
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(st.latitude, st.longitude),
            icon: iconUrl,
            map: map
        });

        $opt.click((function (marker) {
            return function () {
                map.panTo(marker.position);
            };
        })(marker));

        google.maps.event.addListener(marker, 'click', (function (marker, st) {
            return function () {
                infowindow.setContent(lib.buildStationContent(st));
                infowindow.open(map, marker);
            };
        })(marker, st));
    }
}

var isMobile = function () {
    var check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}();
if (isMobile) {
    $winmap.addClass('mobile');
}

function onResize() {
    var ratio = $window.height() / $window.width();
    if ((ratio > 1) != $winmap.hasClass('portrait')) {
        $winmap.toggleClass('portrait');
    }
}
$window.resize(onResize);
onResize();