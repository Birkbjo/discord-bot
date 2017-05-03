module.exports = (msg, guild, command) => {
    const mainChannel = guild.channels.find(chan => chan.name === "dev");
    mainChannel.send("pong");
};