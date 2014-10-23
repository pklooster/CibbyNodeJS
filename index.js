// CORE
var irc = require('slate-irc'),
    net = require('net'),
    cfg = require('./config');

// BOT PLUGINS
var autojoin = require('./plugins/autojoin.js'),
    ai = require('./plugins/ai.js');

// CONNECT
var stream = net.connect({
  port: cfg.server.port,
  host: cfg.server.host
});

var client = irc(stream);

// AUTH
client.nick(cfg.who.nickname);
client.user(cfg.who.username, cfg.who.realname);

// ADD PLUGINS
client.use(ai());
client.use(autojoin());
