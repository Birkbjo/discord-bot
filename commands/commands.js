const Screenshot = require('custom_commands/Screenshot.js');

module.exports = {
  "!move": {
    "file": "move.js",
    "permission": 2
  },
  "!ping": {
    "file": "pong.js"
  },
  "!count": {
    "file": "count.js"
  },
  "!armory": {
    "file": "armory.js"
  },
  "!wclogs": {
    "file": "warcraftlogs.js"
  },
  "!help": {
    "file": "help.js"
  },
  "!dj": {
    "file": "dj.js"
  },
  "!sim": {
    "file": "sim.js"
  },
  "!ss":(msg) => new Screenshot(msg)
};