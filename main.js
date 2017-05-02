const Discord = require("discord.js");
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.username}!`);
    const voices = client.channels.filter(chan => chan.type === "voice");
    console.log(voices);

    const council = voices.filter(chan => chan.name === "Loot Council");
    console.log(council)
    console.log(members)
});

client.on('message', msg => {
    if (msg.content === 'ping') {
    msg.reply('Pong!');
}
});

client.login('MzA5MDExMDUwNzEwMzAyNzMx.C-pM5A.qznoIF8xvVgNGWuNwGA9dWBPRW8');
console.log("logged in")