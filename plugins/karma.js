var mongo = require('mongodb'),
    monk = require('monk'),
    cfg = require('../config'),
    db = monk(cfg.mongo.connstr);

module.exports = function() {
    return function(irc) {
        var data, token, target;

        function get(topic, callback) {
            var query = { topic: topic }, dbt = db.get('karma');

            dbt.find(query, { limit: 1 }, function(err, res) {
                if (typeof res[0] === 'object') {
                    callback(res[0].karma);
                }
                else {
                    callback(null);
                }
            });
        }

        function set(topic, num, insert, who) {
            var dbtk = db.get('karma');

            if (insert === true) {
                dbtk.insert({ topic: topic, karma: num });
            }
            else {
                dbtk.update({ topic: topic }, { $set: { karma: num } });
            }

        }

        function karmaUpdate(string, incdec, to, who) {
            var topic = string.split(' ')[0].substr(0, (string.split(' ')[0].length - 2)),
                insert = false;

            get(topic, function(num) {
                if (num === null) {
                    num = 0;
                    insert = true;
                }

                newNum = (num + incdec);

                set(topic, newNum, insert, who);

                var dbtw = db.get('karma_author');
                dbtw.insert({ topic: topic, effect: incdec, who: who, ts: new Date() });

                irc.send(to, 'karma voor ' + topic + ' is: ' + newNum);
            });
        }

        function karmaStats(topic, to) {
            get(topic, function(num) {
                if (num !== null) {
                    irc.send(to, 'karma voor ' + topic + ' is: ' + num);
                }

                var dbtw = db.get('karma_author'),
                    filter = {
                        reduce: function(cur, result) { result.effect += cur.effect },
                    };

                // db.karma_author.group({ key: { who: 1 }, cond: { topic: 'test' }, reduce: function(cur, result) { result.effect += cur.effect }, initial: { effect: 0 } })
                dbtw.col.group({ who : 1 }, { topic: topic }, { effect: 0 }, filter.reduce, function(err, results) {
                    if (results.length > 0) {
                        var data = [], str = [];
                        for (var i = 0; i < results.length; i++) {
                            data.push({ who: results[i].who, effect: results[i].effect });
                        }

                        data.sort(function(a,b) {
                            return b.effect - a.effect;
                        });
                        data = data.slice(0, 5);

                        for (var i = 0; i < data.length; i++) {
                            var r = data[i];
                            str.push(r.who + ' met ' + (r.effect > 0 ? ('+' + r.effect) : r.effect));
                        };

                        irc.send(to, 'zo denken we over ' + topic + ': ' + str.join(', '));
                    }
                });
            });
        }

        irc.on('message', function(message) {
            if (message.to.substr(0, 1) !== '#') {
                return;
            }

            var string = message.message, to = message.to, topic;
            if (string.split(' ')[0].substr(-1) === '?') {
                topic = string.split(' ')[0].substr(0, (string.split(' ')[0].length - 1))
                karmaStats(topic, to);
                return;
            }

            switch (string.split(' ')[0].substr(-2)) {
                case '++':
                    karmaUpdate(string, 1, to, message.from);
                    break;

                case '--':
                    karmaUpdate(string, -1, to, message.from);
                    break
            }
        });
    }
}
