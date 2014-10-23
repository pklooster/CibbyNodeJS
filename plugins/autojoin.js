var cfg = require('../config');

module.exports = function() {
    return function(irc) {
        irc.on('welcome', function() {
            for (var i = cfg.server.join.length - 1; i >= 0; i--) {
                irc.join(cfg.server.join[i]);
            };
        });
    };
}
