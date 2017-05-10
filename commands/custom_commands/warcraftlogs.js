const wlogs = require("weasel.js");
const webshot = require("webshot");
const config = require('../../config.js');
const fs = require("fs");
wlogs.setApiKey(config.wclApiKey);


wclTypes = {
    dmg: 'damage-done',
    heal: 'healing',
    buffs: 'auras'
};

module.exports = (msg, guild, command) => {
    const args = command._;
    const modifiers = Object.keys(command).filter(elem => !(elem === '_' || elem === 'cmd'));
    const guildName = args[0];
    const server = args[1];
    const region = args[2] || "EU";
    const params = {};
    wlogs.getReportsGuild(guildName, server, region, params,(err, data) => {

        if(err) {
            msg.reply(`Failed to retrieve logs for ${guildName} on ${server}-${region}\n ${err}`);
            console.log(err);
            return;
        }
        const lastLog = data[data.length-1];
        let type = "";
        if(modifiers.length > 0) {
            const modifierType = modifiers.find(elem => !!wclTypes[elem]);
            type = wclTypes[modifierType];

        }
        const wclString = buildWclString(lastLog.id, type);
        const message = msg.channel.send(`Latest logs for ${guildName}: \n${wclString}`);

        captureScreenShot(wclString).then(buffer => {
            msg.channel.send("Screenshot of latest logs: ",{files: [{attachment: buffer, name: 'file.png'}]})
        })
    })

};

function buildWclString(reportId, type = "") {
    const typeString = type ? `&type=${type}` : "";
    return `https://www.warcraftlogs.com/reports/${reportId}#view=analytical${typeString}`;
}

function captureScreenShot(wclURL) {
    let buff = new Buffer(150000);
    const stream = webshot(wclURL,{
        captureSelector: '.dataTables_wrapper table'
    })
    return new Promise((resolve, reject) => {
        let written = 0;
        stream.on('data', data => {
            console.log("data");
            written += buff.write(data.toString('binary'), written,data.length, 'binary');
        })

        stream.on("end", () => {
            console.log("END stream")
            resolve(buff)
        })
    })

}