var cfg = require('../config');
var http = require('http');

module.exports = function() {
    // https://www.flitsmeister.nl/tfd/NGVkZjAwNTQyN2Q0YmE4ODZmYmJiMjE2NzM5MDlhNGI=?0.5101725228596479
    // TJ = vertraging
    // ST = flitser
    //
    return function(irc) {
        var data;

        var options = {
          host: 'www.flitsmeister.nl',
          port: 80,
          path: '/tfd/NGVkZjAwNTQyN2Q0YmE4ODZmYmJiMjE2NzM5MDlhNGI=?0.5101725228596479'
        };

        function fm(target, bits) {
            var output = [];

            if (bits.length <= 0) {
                output.push('er zijn ' + data.features.length + ' meldingen');
            }
            else {
                for (var i = 0; i < data.features.length; i++) {
                    var node = data.features[i].properties;

                    switch (node.tfdType) {
                        case 'ST':
                            if (node.snelweg.toLowerCase() === bits[0].toLowerCase()) {
                                output.push('flitser ' + node.snelweg + ' hectometerpaal ' + node.hmpaal + ' richting ' + node.richting + ' met ' + node.aantalusers + ' verificaties');
                            }
                            break;
                        case 'TJ':
                            if (node.weg.toLowerCase() === bits[0].toLowerCase()) {
                                output.push('file ' + node.weg + ' - ' + node.locatie + ' ' + node.detail + ', ' + node.oorzaak + ' - ' + node.minutenVertraging + ' minuten vertraging');
                            }
                            break;
                    }
                }
            }

            if (output.length > 0) {
                for (var i = 0; i < output.length; i++) {
                    irc.send(target, output[i]);
                }
            }
            else {
                irc.send(target, 'niets gevonden =(');
            }
        }

        function fmInit() {
            fmDownload();
            setInterval(fmDownload, 60000);
        }

        function fmDownload() {
            http.get(options, function(resp){
                data = [];

                resp.setEncoding('utf8');
                resp.on('data', function(chunk){
                    data.push(chunk);
                });
                resp.on('end', function() {
                    data = JSON.parse(data.join(''));
                });

            }).on("error", function(e){
                console.log("Got error: " + e.message);
            }).end();
        }

        irc.on('data', function(m) {
            if (m.command !== 'PRIVMSG') { return; }

            var message = m.trailing,
                prefix = cfg.commands.prefix;

            if (message.substr(0, prefix.length) === prefix) {
                var command = message.split(' ')[0].substr(prefix.length);
                var bits = message.split(' ');
                bits.shift();

                if (command === 'fm') {
                    fm(m.params, bits);
                }
            }
        });

        fmInit();
    }
}
