console.log('Loading...');

//Load config
var config = require('./config.json');

//Load modules
var fs = require('fs');
var http = require('http');

//Setup web server
var app = require('express')();
var httpServer = http.Server(app);

//Bicycle module
function getBikeJson() {
    return new Promise(function (resolve, reject) {
        http.get({host: 'wservice.viabicing.cat', path: '/v2/stations'}, function (resp) {
            var str = '';

            resp.on('data', function (chunk) {
                str += chunk;
            });

            resp.on('error', reject);

            resp.on('end', function () {
                resolve(JSON.parse(str));
            });
        }).end();
    });
}

//Bicycle cache module
function now() {
    return parseInt(new Date().getTime());
}
var cachedBikes;
var updateUntil = now();
setInterval(function () {
    if (now() < updateUntil) {
        getBikeJson().then(function (data) {
            cachedBikes = data;
        }, function (err) {
            console.trace(err);
        });
    }
}, 10000);

//Handle get requests
app.get('/bicycles', function (req, res) {
    if (cachedBikes && now() < updateUntil) {
        res.send(JSON.stringify(cachedBikes));
    } else {
        updateUntil = now() + 5 * 60 * 1000;
        getBikeJson().then(function (data) {
            cachedBikes = data;
            res.send(JSON.stringify(data));
        }, function (err) {
            console.trace(err);
            res.send('An error occured, check console for more details');
        });
    }
});

app.get('*', function (req, res) {
    var url = req.url.split('?')[0];
    if (url === '/')url += 'index.html';
    var path = __dirname + '/public' + url;
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        path = __dirname + '/public/err404.html';
    }

    res.sendFile(path);
});

//Start http server
httpServer.listen(config.port, function () {
    console.log('Listening on *:' + config.port);
});