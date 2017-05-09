const armory = require("wow-armory");
const config = require('../../config.js');

module.exports = (msg, guild, command) => {
    const answerChannel = guild.channels.find(chan => chan.id === msg.channel.id);
    let character = command._[0];
    let realm = command._[1];
    const region = command._[2] || "EU";
    if(character.indexOf("-") > -1){
        realm = character.replace(/.*?-(.*)/, "$1");
        character = character.replace(/(.*?)-.*/, "$1");
    }
    if(!realm || !character){
        return;
    }
    if(command.ilvl){
        armory.set_options({
            "region": region,
            "realm": realm,
            "apikey": config.blizzApiKey
        });
        armory.character({"name": character, "fields":["items"]}, (err, data) => {
            if(err) return;
            answerChannel.send(`Item level for ${data.name} ${data.items.averageItemLevelEquipped} / ${data.items.averageItemLevel}`);
        });
    }else{
        const url = `http://${region.toLowerCase()}.battle.net/wow/en/character/${realm}/${character}/advanced`;
        answerChannel.send(url);
    }
};