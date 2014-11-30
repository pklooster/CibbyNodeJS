var cfg = require('../config');
var http = require('http');

module.exports = function() {
    return function(irc) {
        var data, response;

        function get(target, bits) {
            var ticker = bits["1"];
              if (typeof ticker === 'undefined') {
                    irc.send(target, 'syntax: !stock goog');
                    return;
                }

            try {
                http.get({host: 'query.yahooapis.com',
                          port: 80,
                          path: '/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20("'+ticker+'")%0A%09%09&format=json&diagnostics=true&env=http%3A%2F%2Fdatatables.org%2Falltables.env'}, 
                        function(resp){
                    data = [], response = [];
                    resp.setEncoding('utf8');
                    resp.on('data', function(chunk){
                        data.push(chunk);
                    });
                    resp.on('end', function() {
                        try {
                            data = JSON.parse(data.join(''));
                            for (key in data.query.results) {
                                response.push('[' + data.query.results[key].Name + '] Price: ' + data.query.results[key].LastTradePriceOnly + ' Change: ' + data.query.results[key].Change_PercentChange);
                            }
                            irc.send(target, response.join(', '));
                        }
                        catch (e) {

                        }
                    });
                }).on("error", function(e){
                    console.log("Got error: " + e.message);
                }).end();
            }
            catch (err) {

            }
        }

        irc.on('data', function(m) {
            if (m.command !== 'PRIVMSG') { return; }

            var message = m.trailing,
                prefix = cfg.commands.prefix;

            if (message.substr(0, prefix.length) === prefix) {
                var command = message.split(' ')[0].substr(prefix.length);
                var bits = message.split(' ');

                if (command === 'stock') {
                    get(m.params, bits);
                }
            }
        });
    }
}
