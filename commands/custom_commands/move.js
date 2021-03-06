module.exports = (msg, guild, command) => {
    if(command._.length < 2){
        return;
    }
    const roleStr = command._[0];
    const roomTo = command._[1];

    let members;
    const requestMember = msg.member;
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
    if(requestMember && !channel.permissionsFor(requestMember).has('MOVE_MEMBERS')) {
        msg.reply('does not have permission to do that.');
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