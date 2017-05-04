const wlogs = require("weasel.js");
const config = require('../../config.js');
wlogs.setApiKey(config.wclApiKey);


wclTypes = {
    dmg: 'damage-done',
    heal: 'healing',
    buffs: 'auras'
}

module.exports = (msg, guild, command) => {
    const args = command.args;
    const modifiers = command.specials;
    const guildName = args[0];
    const server = args[1];
    const region = args[2] || "EU";
    const params = {}
    wlogs.getReportsGuild(guildName, server, region, params,(err, data) => {

        if(err) {
            msg.reply(`Failed to retrieve logs for ${guildName} on ${server}-${region}\n ${err}`);
            console.log(err);
            return;
        }
        const lastLog = data[data.length-1];
        let type = "";
        if(modifiers.length > 0) {
            const modiferType = modifiers.find(elem => !!wclTypes[elem] )
            type = wclTypes[modiferType];

        }

        msg.channel.send(`Latest logs for ${guildName}: \n${buildWclString(lastLog.id, type)}`);
    })

};

function buildWclString(reportId, type = "") {
    const typeString = type ? `&type=${type}` : "";
    return `http://www.warcraftlogs.com/reports/${reportId}#view=analytical${typeString}`;
}