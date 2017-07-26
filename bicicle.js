function getBikeJson(callback) {
    http.get({host: 'wservice.viabicing.cat', path: '/v2/stations'}, function (resp) {
        var str = '';

        resp.on('data', function (chunk) {
            str += chunk;
        });

        resp.on('end', function () {
            callback(JSON.parse(str));
        });
    }).end();
}

module.exports = {
    getBikeJson: getBikeJson
};