const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const config = require('../../config');
const youTube = new YouTube();
youTube.setKey(config.ytApiKey);

const meta_player = {
    dispatcher : null,
    voiceConnection : null,
    queue : [],
    volume: 0.5,
    channel: false,
    inDev : false,
};

function specialStatus(msg) {
    let statusString = "\n";
    for(let key in meta_player){
        if(key !== "dispatcher"){
            if(key === "queue"){
                statusString += `${key}: \n`;
                meta_player[key].forEach(elem => {
                    statusString += `    ${elem.id} \n`;
                });
            }else{
                statusString += `${key}: ${meta_player[key]}\n`
            }
        }

    }
    msg.reply(statusString)
}

function assignArgs(key, val) {
    if(!val || isNaN(val)){
        val = false;
    }
    meta_player[key] = val;
}

function stopDj() {
    meta_player.queue = [];
    if(meta_player.dispatcher){
        meta_player.dispatcher.end();
        meta_player.dispatcher = null;
    }
    meta_player.channel.leave();
    meta_player.voiceConnection = null;
}

module.exports = (msg, guild, command) => {
    const perm = msg.member.roles.find(role => role.name.toLowerCase() === "dev");
    /*if(!perm){
        msg.reply(" You do not have permission to do that");
        return;
    }*/
    if(command.status){
        specialStatus(msg);
        return;
    }

    if(perm && command.dev){
        meta_player.inDev = !meta_player.inDev;
        return;
    }

    if(meta_player.inDev) return;

    const djChannel = msg.member.voiceChannel;
    if(!djChannel){
        return
    }
    meta_player.channel = djChannel;
    const vidID = command._[0];

    let skip = command.skip;
    let playtime = command.playtime;
    let vol = command.volume ? ((command.volume <= 1 || command.volume > 0) ? command.volume : 0.5) : meta_player.volume;

    assignArgs("volume", vol);

    const isYoutubeID = vidID && vidID.match(/^[a-zA-Z0-9-_]{11}$/);
    const isYotubeSearch = vidID && !isYoutubeID;

    const isSong = isYoutubeID || isYotubeSearch;
    const streamOptions = {
        seek: skip || 0,
        volume : vol || meta_player.volume,
        passes: 1,
        playtime: playtime || false
    };

    if(command.stop && perm) {
        stopDj();
        return;
    }

    if(!isSong && command.volume && perm){
        if(vol && vol <= 1 && meta_player.dispatcher){
            console.log("Setting volume", vol);
            meta_player.dispatcher.setVolume(vol);
        }
    }

    if(!isSong && command.pause && perm){
        if(meta_player.dispatcher && !meta_player.dispatcher.paused){
            meta_player.dispatcher.pause()
        }

    }else if(!isSong && command.play && perm){
        if(meta_player.dispatcher && meta_player.dispatcher.paused){
            meta_player.dispatcher.resume();
        }

    }else if(!isSong && command.next && perm){
        if(meta_player.queue.length > 1) {
            if(meta_player.dispatcher) meta_player.dispatcher.end();
        }

    }else if(isYoutubeID){
        if(meta_player.queue.length > 0){
            meta_player.queue.push({id:vidID, options: streamOptions});
        }else{
            meta_player.queue.push({id:vidID, options: streamOptions});
            playYT();
        }

    }else if(isYotubeSearch){
        youTube.search(vidID, 10, (error, result) => {
            if (error) {
                console.log(error);
                if(meta_player.dispatcher){
                    meta_player.dispatcher.end();
                }

            }else if(result.items.length > 0){
                let ytId;
                result.items.every(elem => {
                    if(elem.id.kind === 'youtube#video'){
                        ytId = elem.id.videoId;
                        return false;
                    }
                    return true;
                });
                if(!ytId){
                    return;
                }
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

function connectionPlay() {
    const vidID = meta_player.queue[0].id;
    const streamOptions = meta_player.queue[0].options;
    const connection = meta_player.voiceConnection;

    const ytOptions = {
        filter : 'audioonly',
        quality: "lowest"
    };

    if(!vidID || !vidID.match(/^[a-zA-Z0-9-_]{11}$/)){
        if(meta_player.dispatcher) meta_player.dispatcher.end();
    }

    const stream = ytdl(`https://www.youtube.com/watch?v=${vidID}`, ytOptions);
    meta_player.dispatcher = connection.playStream(stream, streamOptions);
    console.log("Youtube stream ready");
    meta_player.dispatcher.on("start", () =>{
        console.log("Playing YT stream");
        if(streamOptions.playtime && streamOptions.playtime > 0 ){
            console.log("Setting timeout for end: ", streamOptions.playtime);
            setTimeout(() => {
                if(meta_player.dispatcher) meta_player.dispatcher.end();
            }, streamOptions.playtime * 1000)
        }
    });

    meta_player.dispatcher.on('end', reason => {
        console.log("Dispatch end because ", reason);
        console.log("Shifting queue");
        meta_player.queue.shift();
        if(meta_player.queue.length === 0){
            console.log("Done, leaving channel");
            meta_player.dispatcher = null;
            stopDj();
        }else{
            console.log("Playing next ", meta_player.queue[0].id);
            playYT();
        }
    });
    meta_player.dispatcher.on('error', err => {
        console.log("error on error", err);
    })
}

function playYT() {
    if(meta_player.voiceConnection){
        console.log("Already in channel");
        connectionPlay();
    }else{
        meta_player.channel.join().then(connection =>{
            console.log("Joined channel");
            meta_player.voiceConnection = connection;
            connectionPlay();
        }).catch(e => {console.log(e)});
    }

}