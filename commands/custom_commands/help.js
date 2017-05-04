var commands = require('../commands.json');

module.exports = (msg, guild, command) => {

    let str = "I know these commands:\n";

    const sortedCommands = Object.keys(commands).sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase()) return -1;
        if (a.toLowerCase() > b.toLowerCase()) return 1;
        return 0;
    }).join("\n");

    msg.channel.send(str + "\n" + sortedCommands);
};