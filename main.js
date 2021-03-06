const config = require('./config.js');
const commands = require('./commands/commands.js');
const Discord = require("discord.js");
const fs = require("fs");
const strftime = require('strftime');
const argParser = require('minimist');
const webshot = require('webshot');

const client = new Discord.Client();

//TEMP
//****
let main_guild;
const alias = {
    mvC : '!move "loot council" "loot council"',
    mvB : '!move "loot council" "raid"',
    '!logs': '!wclogs "Sløsj" "Bladefist" --dmg',
    '!salt': '!dj 3KquFZYi6L0'
};
//****

client.on('ready', () => {
    console.log(`Logged in as ${client.user.username}!`);
});

client.on('message', msg => {
    if(msg.author.id === client.user.id){
        //Do something maybe
        return;
    }
    prettyLogMessage(msg);
    let msgBody = msg.content;
    const guild = msg.guild;
    if(Object.keys(alias).indexOf(msg.content) > -1){
        msgBody =  alias[msg.content];
    }
    const command = parseCommand(msgBody);
    console.log(command);
    if(commands[command.cmd]){
        commands[command.cmd].run(msg, guild, command);
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
    //remove quotes
    const args = argParser(input.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g));
    args.cmd = args._.shift();
    //split on space
    if(args._.length > 0) args._ = args._.map(elem => elem.replace(/^"(.*)"$/, '$1'));
    return args;

}