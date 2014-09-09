var irc = require('slate-irc');
var net = require('net');
var db = require('mongodb');
var cfg = require('./config');

var activeConfig = cfg.getConfig();

var stream = net.connect({
  port: activeConfig.server.port,
  host: activeConfig.server.host
});

var client = irc(stream);

client.nick(activeConfig.who.nickname);
client.user(activeConfig.who.username, activeConfig.who.realname);

function cibby(irc) {
    irc.on('welcome', function() {
        client.join('#home');
        client.names('#home', function(err, names){
          console.log(names);
        });
    });

    irc.on('message', function(message) {
        if (message.to.substr(0, 1) !== '#') {
            return;
        }

        client.send(message.to, message.from + ' zegt: ' + message.message);
    })
}

client.use(cibby);
