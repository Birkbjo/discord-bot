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
    const councilChannel = voices.find(chan => chan.name === LOOT_COUNCIL_ROLE);
    const councilRole = AOD.roles.find('name', LOOT_COUNCIL_ROLE);
    const councilMembers = councilRole.members;
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
    else if (msg.content === 'mvB') {
        councilMembers.every(member => member.setVoiceChannel(lobby)
            .then( member => {
                console.log("Moved " + member.user.username);

            }).catch(member => {
                console.log("Failed to move user " + member.user.username)
            }));
        msg.reply("Moved Loot Council")
    }
});

client.login(config.token).catch(err =>
    console.log("Failed to log in: " + err)
)

function moveCouncil() {

}