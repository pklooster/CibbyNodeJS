var cfg = require('../config');
var http = require('http');
var c = require('irc-colors');

function checkPrice(price){
    var sp = price.split(' ');
    if (sp["0"].indexOf('+') > -1) {
        return c.green(sp["0"]) + ' (' + c.green(sp["2"]) + ')';
    }
     if (sp["0"].indexOf('-') > -1) {
        return c.red(sp["0"]) + ' (' + c.red(sp["2"]) + ')';
    } else {
        return c.blue(sp["0"]) + ' (' + c.blue(sp["2"]) + ')'; 
    }
  }

module.exports = function() {
    return function(irc) {
        var data, response;
        function get(target, prefix, bits) {
            var ticker = bits["1"];
              if (typeof ticker === 'undefined') {
                    irc.send(target, 'syntax: ' + prefix + 'stock goog');
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
                               if (data.query.results[key].LastTradePriceOnly == "0.00") {
                                    irc.send(target, c.red('stock '+ticker+' does not exist.'));
                                    return;
                                }
                                response.push('[' + data.query.results[key].Name + '] Price: ' + data.query.results[key].LastTradePriceOnly + ' Change: ' + checkPrice(data.query.results[key].Change_PercentChange));
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

                if (command === 'stock' || command == 's') {
                    get(m.params, prefix, bits);
                }
            }
        });
    }
}

