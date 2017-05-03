const config = require('./config.js');
const Discord = require("discord.js");
const client = new Discord.Client();

const LOOT_COUNCIL_ROLE = 'Loot Council';
const GUILD_NAME = "The Art of Dying";


client.on('ready', () => {
    console.log(`Logged in as ${client.user.username}!`);

    //  const councilMembers = client.users.
});

client.on('message', msg => {
    const AOD = client.guilds.find('name', GUILD_NAME);
    const voices = AOD.channels.filter(chan => chan.type === 'voice');
    const lobby = AOD.channels.find(chan => chan.name === "Lobby");
    const councilChannel = voices.find(chan => chan.name === 'Raid');
    const councilRole = AOD.roles.find('name', LOOT_COUNCIL_ROLE);
    const councilMembers = councilRole.members;
    const msgContent = msg.content.split(' ');
    console.log(msgContent)
    const padni = councilMembers.filter(member => member.user.username === 'Padni').first()
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }
    else if (msg.content === 'mvC') {
        councilMembers.every(member => member.setVoiceChannel(councilChannel)
            .then( member => {
                console.log("Moved " + member.user.username);

            }).catch(member => {
                console.log("Failed to move user " + member.user.username)
        }));
        msg.reply("Moved Loot Council")
    }
    else if (msgContent[0] === 'mvCb') {

        councilMembers.every(member => member.setVoiceChannel(lobby)
            .then( member => {
                console.log("Moved " + member.user.username);

            }).catch(member => {
                console.log("Failed to move user " + member.user.username)
            }));
        msg.reply("Moved Loot Council")
    }

    else if (msgContent[0] === 'mvA') {
        console.log("move all")
        if(!msgContent[1] && !msgContent[2]) {
            console.log("No target channel");
            return;
        }
        const fromChan = voices.find(chan => chan.name === msgContent[1])
        const targetChan = voices.find(chan => chan.name === msgContent[2]);
        if(targetChan && fromChan) {
            console.log(targetChan)
            fromChan.members.every(member => {
                console.log(member)
                member.setVoiceChannel(targetChan).then((mem) =>
                console.log("Moved " + mem.user.username)).catch(err =>
                console.log("Failed to move: " + err));
            });
        } else {
            console.log("Target channel " + targetChan + " not found.")
        }

    }
    else if (msgContent[0] === 'mvB') {
        if(!msgContent[1]) {
            console.log("No target channel");
            return;
        }
        const targetChan = voices.find(chan => chan.name === msgContent[1]);
        if(targetChan.length > 0) {
            targetChan.members.every(member => member.setVoiceChannel(targetChan));
        }

    }
});

client.login(config.token).catch(err =>
    console.log("Failed to log in: " + err)
)

function moveCouncil() {

}