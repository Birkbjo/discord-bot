const custom_commands = require('./commands.json');

const commands = {};

for(let cmd in custom_commands){
    const cur_cmd = custom_commands[cmd];
    commands[cmd] = {
        run : (msg, guild, command) => {
            try{
                require(`./custom_commands/${cur_cmd.file}`)(msg, guild, command)
            }catch (e){
                console.log(e);
            }
        }
    }
}

module.exports = commands;