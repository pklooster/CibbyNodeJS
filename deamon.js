var forever = require('forever');

var child = new (forever.Monitor)('index.js', {
  max: 1,
  silent: true,
  fork: true,
  args: []
});

child.start();

forever.startServer(child);
