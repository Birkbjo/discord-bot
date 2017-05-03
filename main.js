const config = require('./config.js');
const commands = require('./commands/commands.js');
const Discord = require("discord.js");
const strftime = require('strftime');
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
    prettyLogMessage(msg);
    let msgBody = msg.content;
    if(Object.keys(alias).indexOf(msg.content) > -1){
        msgBody =  alias[msg.content];
    }
    const command = parseCommand(msgBody);
    //console.log(msg.content);
    if(commands[command.cmd]){
        commands[command.cmd].run(msg, main_guild, command);
    }
});

client.login(config.token).catch(err =>
    console.log("Failed to log in: " + err)
);


function prettyLogMessage(msg) {
    let name = msg.author.username;
    let channelName = msg.channel.name;
    const nameLength = 15;
    const channelLength = 10;
    const spacesToAddName = nameLength - name.length;
    const spacesToAddChannel = channelLength - channelName.length;

    if(spacesToAddName < 0){
        name  = name.replace(/(.*).{3}/, "$1...")
    }
    if(spacesToAddChannel < 0){
        channelName  = channelName.replace(/(.*).{3}/, "$1...")
    }
    for(let i = 0; i < spacesToAddName; i++) name += " ";
    for(let i = 0; i < spacesToAddChannel; i++) channelName += " ";
    const date = strftime('%F %T', new Date(parseInt(msg.createdTimestamp)));
    //TODO: add colors or something
    let outMessage = `[${date}][#${channelName}][${name}]: ${msg.content}`;
    console.log(outMessage);
}

function parseCommand(input) {
    let argv = input.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    argv = argv.map(elem => elem.replace(/^"(.*)"$/, '$1'));
    const command = argv[0];
    const args = argv.slice(1,input.length);
    return {
        cmd : command,
        args: args
    }
} 