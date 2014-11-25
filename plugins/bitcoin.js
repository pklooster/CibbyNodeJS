var cfg = require('../config');
var http = require('http');

module.exports = function() {
    return function(irc) {
        var data, response;

        // http://api.coindesk.com/v1/bpi/currentprice.json
        var optionsCoinbase = {
          host: 'api.coindesk.com',
          port: 80,
          path: '/v1/bpi/currentprice.json'
        };

        function get(target) {
            try {
                http.get(optionsCoinbase, function(resp){
                    data = [], response = [];

                    resp.setEncoding('utf8');
                    resp.on('data', function(chunk){
                        data.push(chunk);
                    });
                    resp.on('end', function() {
                        try {
                            data = JSON.parse(data.join(''));

                            for (key in data.bpi) {
                                response.push(data.bpi[key].code + ' ' + data.bpi[key].rate);
                            }

                            irc.send(target, '1 BTC = ' + response.join(', '));
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

                if (command === 'btc') {
                    get(m.params);
                }
            }
        });
    }
}
