const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const youTube = new YouTube();
youTube.setKey(process.env.YOUTUBE_APIKEY);


const meta_player = {
    dispatcher : null,
    queue : [],
    volume: 0.5,
    skip: false,
    playtime: false,
    inChannel: false,
    inDev : false
};

module.exports = (msg, guild, command) => {
    const perm = msg.member.roles.find(role => role.name.toLowerCase() === "dev");
    /*if(!perm){
        msg.reply(" You do not have permission to do that");
        return;
    }*/

    if(perm && command.specials.indexOf("dev") > -1){
        meta_player.inDev = !meta_player.inDev;
    }
    if(meta_player.inDev) return;

    const vidID = command.args[0];
    let ytSearch;

    let skip = command.specialValue.skip;
    let playtime = command.specialValue.playtime;
    let vol = command.specialValue.volume;

    if(!skip || isNaN(skip)){
        skip = false;
    }
    meta_player.skip = skip;

    if(!vol || isNaN(vol)){
        vol = false;
    }else{
        meta_player.volume = vol;
    }

    if(!playtime || isNaN(playtime)){
        playtime = false;
    }
    meta_player.playtime = playtime;

    const isYoutube = vidID && vidID.match(/^[a-zA-Z0-9-_]{11}$/);
    let search = command.specialValue.search;
    if(search && isNaN(search)){
        ytSearch = search;
    }else{
        search = false;
    }
    const isSpotify = false;

    const isSong = isSpotify || isYoutube || search;
    const streamOptions = {
        seek: skip || 0,
        volume : vol || meta_player.volume,
        passes: 2
    };
    const djChannel = msg.member.voiceChannel;
    if(!djChannel){
        return
    }

    if(command.specials.indexOf("stop") > -1){
        if(!perm){
            msg.reply(" You do not have permission to do that");
            return;
        }
        const allChannels = guild.channels.filter(chan => chan.type === 'voice');
        if(meta_player.dispatcher) meta_player.dispatcher.end();
        allChannels.every(channel => {
            channel.leave();
            return true;
        });
    }else if(!isSong && command.specials.indexOf("volume") > -1){
        if(!perm){
            msg.reply(" You do not have permission to do that");
            return;
        }
        if(vol && vol < 1 && meta_player.dispatcher) meta_player.dispatcher.setVolume(vol);
    }else if(!isSong && command.specials.indexOf("pause") > -1){
        if(!perm){
            msg.reply(" You do not have permission to do that");
            return;
        }
        if(meta_player.dispatcher && !meta_player.dispatcher.paused) meta_player.dispatcher.pause();
    }else if(!isSong && command.specials.indexOf("play") > -1){
        if(!perm){
            msg.reply(" You do not have permission to do that");
            return;
        }
        if(meta_player.dispatcher && meta_player.dispatcher.paused) meta_player.dispatcher.resume();
    }else if(!isSong && command.specials.indexOf("next") > -1){
        if(!perm){
            msg.reply(" You do not have permission to do that");
            return;
        }
        if(meta_player.queue.length > 1) {
            if(meta_player.dispatcher) meta_player.dispatcher.end();
        }
    }else if(isYoutube){
        if(meta_player.queue.length > 0){
            meta_player.queue.push({id:vidID, options: streamOptions});
        }else{
            meta_player.queue.push({id:vidID, options: streamOptions});
            playYT(djChannel);
        }
    }else{
        youTube.search(ytSearch, 1, (error, result) => {
            if (error) {
                if(meta_player.queue.length > 1) {
                    if(meta_player.dispatcher) meta_player.dispatcher.end();
                }
            } else if(result.items.length > 0){
                const ytId = result.items[0].id.videoId;
                if(meta_player.queue.length > 0){
                    meta_player.queue.push({id: ytId, options: streamOptions});
                }else{
                    meta_player.queue.push({id: ytId, options: streamOptions});
                    playYT(djChannel);
                }
            }
        });
    }
};

function playYT(djChannel) {
    const vidID = meta_player.queue[0].id;
    const streamOptions = meta_player.queue[0].options;

    const ytOptions = {
        filter : 'audioonly',
        quality: "lowest"
    };

    if(meta_player.dispatcher) meta_player.dispatcher.end();
    djChannel.join().then(connection =>{
        const stream = ytdl('https://www.youtube.com/watch?v=' + vidID, ytOptions);
        meta_player.dispatcher = connection.playStream(stream, streamOptions);
        meta_player.dispatcher.on("start", () =>{
            if(meta_player.playtime && meta_player.playtime > 0 ){
                setTimeout(() => {
                    if(meta_player.dispatcher) meta_player.dispatcher.end();
                }, meta_player.playtime * 1000)
            }
        });

        meta_player.dispatcher.on('end', reason => {
            meta_player.queue.shift();
            if(meta_player.queue.length === 0){
                djChannel.leave()
            }else{
                playYT(djChannel);
            }
        });
        meta_player.dispatcher.on('error', err => {
            console.log(err);
        })
    }).then(dispatcher => {

    }).catch(console.error);
}