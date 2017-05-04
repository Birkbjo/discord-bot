const config = require('./config.js');
const commands = require('./commands/commands.js');
const Discord = require("discord.js");
const strftime = require('strftime');
const client = new Discord.Client();
const GUILD_NAME = "The Art of Dying";
const BOT_ID = 22;
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
    beginServerLogging();
});

client.on('message', msg => {
    if(msg.author.id === client.user.id){
        //Do something maybe
        return;
    }
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
    argv = argv.slice(1, argv.length);
    const args = argv.filter(elem => elem.substr(0,2) !== "--");
    const specials = argv.filter(elem => elem.substr(0,2) === "--");
    return {
        cmd : command,
        args: args,
        specials: specials
    }
}

function beginServerLogging() {
    client.on("voiceStateUpdate", (oldUser, newUser) => {
        let event, kwargs;
        if(oldUser.voiceChannelID && newUser.voiceChannelID){
            event = "changed";
            kwargs = {
                voiceFrom : oldUser.voiceChannel.name,
                voiceTo : newUser.voiceChannel.name
            }
        }else if(!oldUser.voiceChannelID && newUser.voiceChannelID){
            event = "connect";
            kwargs = {
                voiceTo : newUser.voiceChannel.name
            }
        }else if(oldUser.voiceChannelID && !newUser.voiceChannelID){
            event = "disconnect";
            kwargs = {
                voiceFrom : oldUser.voiceChannel.name
            }
        }
        serverLog(newUser.user.username, event, kwargs);

    });
}

function serverLog(username, event, kwargs) {
    const nameLength = 20;
    const spacesToAddName = nameLength - username.length;
    let body;
    if(spacesToAddName < 0){
        username  = username.replace(/(.*).{3}/, "$1...")
    }
    switch(event){
        case "changed":
            body = `Changed voice channel from ${kwargs.voiceFrom} to ${kwargs.voiceTo}`;
            break;
        case "connect":
            body = `Connected to voice channel ${kwargs.voiceTo}`;
            break;
        case "disconnect":
            body = `Disconnected from voice channel ${kwargs.voiceFrom}`;
            break;
    }
    const date = strftime('%F %T', new Date());

    let outMessage = `\`[${date}][${username}]: ${body}\``;
    main_guild.channels.find(chan => chan.name === "log").send(outMessage);
}