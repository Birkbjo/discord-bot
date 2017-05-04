var commands = require('../commands.json');

module.exports = (msg, guild, command) => {

    let str = "I know these commands:\n";

    for(let cmd in commands){
        str += '\n'+cmd
    }

    msg.channel.send(str);
};