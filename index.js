var irc = require('slate-irc'),
    net = require('net'),
    mongo = require('mongodb'),
    monk = require('monk'),
    cfg = require('./config')

var ac = cfg.getConfig();
var db = monk(ac.mongodb.connstr);

var stream = net.connect({
  port: ac.server.port,
  host: ac.server.host
});

var client = irc(stream);

client.nick(ac.who.nickname);
client.user(ac.who.username, ac.who.realname);

function cibby(irc) {
    var activity = {};

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
                    client.send(channel, res[0].message);
                }

                // reset.
                activity[channel] = null;
            });
        });
    }

    irc.on('welcome', function() {
        for (var i = ac.server.join.length - 1; i >= 0; i--) {
            client.join(ac.server.join[i]);
        }
    });

    irc.on('message', function(message) {
        // only for public channels
        if (message.to.substr(0, 1) !== '#') {
            return;
        }

        // insert this crap into our database
        var dbt = db.get('messages');
        dbt.insert({
            who: message.from,
            to: message.to,
            message: message.message,
            datetime: new Date()
        });

        // set flag to run somewhere between 1 and 180 seconds after this message
        if (message.to in activity === false || activity[message.to] === null) {
            var runAfter = (Math.floor((Math.random() * 180) + 1)) * 1000;
            console.log('running runAI() after ' + (runAfter / 1000) + ' seconds.');
            activity[message.to] = setTimeout(function() { runAI(message.to); }, runAfter);
        }
    })
}

client.use(cibby);
