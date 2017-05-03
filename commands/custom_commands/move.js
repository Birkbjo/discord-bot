module.exports = (msg, guild, command) => {
    if(command.args.length < 2){
        return;
    }
    const roleStr = command.args[0];
    const roomTo = command.args[1];

    let members;
    if(roleStr.toLowerCase() === "all"){
        members = guild.members;
    }else{
        const role = guild.roles.find(role => role.name.toLowerCase() === roleStr.toLowerCase());
        if(!role){
            msg.reply(` ${roleStr} is not a valid role`);
            return;
        }
        members = role.members;
    }
    const channel = guild.channels.find(chan => chan.type === 'voice' && chan.name.toLowerCase() === roomTo.toLowerCase());
    if(!channel){
        msg.reply(` ${roomTo} is not a valid room`);
        return;
    }
    members = members.filter(member => member.voiceChannel !== undefined && member.voiceChannel.name.toLowerCase() !== roomTo.toLowerCase());
    members.every(member => {
        console.log(member.user.username);
        member.setVoiceChannel(channel)
            .then( member => {
                console.log("Moved " + member.user.username);
            }).catch(member => {
                console.log("Failed to move user " + member.user.username)
            });
        return true;
    });
};
