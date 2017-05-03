const config = require('./config.js');
const commands = require('./commands/commands.js');
const Discord = require("discord.js");
const client = new Discord.Client();
const GUILD_NAME = "The Art of Dying";
//TEMP
//****
let main_guild;
const alias = {
    mvC : '!move "loot council" "loot council"',
    mvB : '!move "loot council" "raid"'
};
//****

client.on('ready', () => {
    console.log(`Logged in as ${client.user.username}!`);
    main_guild = client.guilds.find('name', GUILD_NAME);
});

client.on('message', msg => {
    let msgBody = msg.content;
    if(Object.keys(alias).indexOf(msg.content) > -1){
        msgBody =  alias[msg.content];
    }
    const command = parseCommand(msgBody);
    console.log(msg.content);
    if(commands[command.cmd]){
        commands[command.cmd].run(msg, AOD, command);
    }
});

client.login(config.token).catch(err =>
    console.log("Failed to log in: " + err)
);

function parseCommand(input) {
    const argv = input.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    const command = argv[0];
    const args = argv.slice(1,input.length);
    return {
        cmd : command,
        args: args
    }
}