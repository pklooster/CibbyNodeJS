var irc = require('slate-irc'),
    net = require('net'),
    mongo = require('mongodb'),
    monk = require('monk'),
    cfg = require('./config')

var ac = cfg.getConfig();
var db = monk(ac.mongo.connstr);

var stream = net.connect({
  port: ac.server.port,
  host: ac.server.host
});

var client = irc(stream);

client.nick(ac.who.nickname);
client.user(ac.who.username, ac.who.realname);

function cibby(irc) {
    var activity = {};
    var nicks = {};
    var velocity = {};
    var lastnick = {};

    function processLine(channel, str) {
        // talking about someone on the channel? mix that shit up for confusion
        if (typeof nicks[channel] === 'object' && nicks[channel].length > 0) {
            var parts = str.split(' ');
            for (var i = parts.length - 1; i >= 0; i--) {
                var chunk = parts[i];
                chunk = chunk.replace('!', '');
                chunk = chunk.replace(':', '');
                chunk = chunk.replace('?', '');

                if (nicks[channel].indexOf(chunk) >= 0) {
                    str = str.replace(chunk, '<lastnick>');
                }
            };
        }

        return str;
    }

    function processOutgoing(channel, str) {
        // check if we have record of the last person
        // who said anything, then use the placeholder to engage
        // in conversion.
        if (str.indexOf('<lastnick>') >= 0) {
            var newname = nicks[channel][Math.floor(Math.random()*nicks[channel].length)]
            if (channel in lastnick && lastnick[channel].length > 0) {
                newname = lastnick[channel];
            }

            str = str.replace('<lastnick>', newname);
        }

        return str;
    }

    function storeNames(channel, names) {
        nicks[channel] = [];
        for (var i = names.length - 1; i >= 0; i--) {
            nicks[channel].push(names[i].name);
        };
    }

    function getVelocity(channel) {
        var vel = 0, baseSeconds = 180;
        if (channel in velocity) {
            vel = velocity[channel];
        }

        // make it a bit more random
        if (vel === 1) {
            vel = vel + (Math.floor((Math.random() * 5) + 1));
        }

        // really busy?!
        if (vel > baseSeconds) {
            return 1000; // just output after one second
        }

        var calculated = Math.abs(Math.floor(baseSeconds / vel) - (Math.floor((Math.random() * 20) + 1)));
        return calculated * 1000;
    }

    function runAI(channel) {
        var offset = (24 * 60 * 60 * 1000) * ac.ai.dateThreshold,
            dateObj = new Date(),
            query;

        dateObj.setTime(dateObj.getTime() - offset);
        query = { datetime: { $gt: dateObj }, to: channel };

        // get a random message matching 'query'
        var dbt = db.get('messages'), rand;

        dbt.count(query, function(err, count) {
            rand = Math.floor(Math.random() * count);
            dbt.find(query, { limit: 1, skip: rand }, function(err, res) {
                if (typeof res[0] === 'object') {
                    // SPLURT
                    client.send(channel, processOutgoing(channel, res[0].message));
                }

                // reset.
                activity[channel] = null;
            });
        });
    }

    irc.on('welcome', function() {
        for (var i = ac.server.join.length - 1; i >= 0; i--) {
            var channel = ac.server.join[i];
            client.join(channel);
            setInterval(function() {
                client.names(channel, function(err, names) {
                    storeNames(channel, names);
                });
            }, 10000);
        }
    });

    irc.on('message', function(message) {
        // only for public channels
        if (message.to.substr(0, 1) !== '#') {
            return;
        }

        // process
        var line = processLine(message.to, message.message);

        // insert this crap into our database
        var dbt = db.get('messages');
        dbt.insert({
            who: message.from,
            to: message.to,
            message: line,
            datetime: new Date()
        });

        // increment the velocity counter
        if (message.to in velocity === false) {
            velocity[message.to] = 0;
        }
        velocity[message.to]++;

        // keep track of the last person speaking
        // to possible engage in conversation
        lastnick[message.to] = message.from;

        // set flag to run somewhere between 1 and 120 seconds after this message
        if (message.to in activity === false || activity[message.to] === null) {
            var runAfter = getVelocity(message.to);
            activity[message.to] = setTimeout(function() { runAI(message.to); }, runAfter);
            velocity[message.to] = 0;
        }
    });
}

client.use(cibby);
