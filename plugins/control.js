var cfg = require('../config');

module.exports = function() {
    return function(irc) {
        var target;

        var commands = {
            uptime: {
                level: 'boss',
                run: function(prefix, target, message) {
                }
            },
        };

        irc.on('data', function(m) {
            if (m.command !== 'PRIVMSG') { return; }

            var message = m.trailing,
                prefix = cfg.commands.prefix;

            if (message.substr(0, prefix.length) === prefix) {
                var command = message.split(' ')[0].substr(prefix.length);

                if (typeof commands[command] !== 'object') {
                    return;
                }

                if (commands[command].level === 'boss' && m.prefix !== cfg.server.theBoss) {
                    return;
                }

                commands[command].run(m.prefix, m.params, message);
            }
        });
    };
}
