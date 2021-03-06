var cfg = require('../config');

module.exports = function() {
    return function(irc) {
        var target;

        var commands = {
            uptime: {
                level: 'public',
                run: function(prefix, target, message) {
                    var exec = require('child_process').exec;
                    exec('uptime', function(error, stdout, stderr) {
                        irc.send(target, stdout)
                    });
                }
            },
            v: {
                level: 'public',
                run: function(prefix, target, message) {
                    var exec = require('child_process').exec;
                    exec('git log --pretty=format:\'%ad %h %d\' --abbrev-commit --date=short -1', function(error, stdout, stderr) {
                        irc.send(target, 'CIBBY ' + stdout)
                    });
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
