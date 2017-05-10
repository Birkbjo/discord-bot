module.exports = (msg, guild, command) => {

    const roomName = command._[0];
    const answerChannel = guild.channels.find(chan => chan.id === msg.channel.id);

    if (roomName) {
        const countChannel = guild.channels.find(chan => chan.type === 'voice' && chan.name.toLowerCase() === roomName.toLowerCase());
        if (!countChannel) {
            msg.reply(` ${roomName} is not a valid room`);
            return;
        }
        const count = countChannel.members.array().length;
        answerChannel.send(
            `Voice channel ${countChannel.name} ` +
            `has ${count} ` +
            `connected client${count !== 1 ? "s" : ""}`
        );

    } else if (msg.member && msg.member.voiceChannel) {
        const countChannel = msg.member.voiceChannel;
        const count = countChannel.members.array().length;
        answerChannel.send(
            `Voice channel ${countChannel.name} ` +
            `has ${count} ` +
            `connected client${count !== 1 ? "s" : ""}`
        )
    }

    else {
        const countChannels = guild.channels.filter(chan => chan.type === 'voice');
        let totalCount = 0;
        countChannels.every(channel => {
            totalCount += channel.members.array().length;
            return true;
        });
        answerChannel.send(
            `All voice channels ` +
            `have ${totalCount} total ` +
            `connected client${totalCount !== 1 ? "s" : ""}`
        );
    }
}