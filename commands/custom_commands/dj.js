const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const config = require('../../config');
const youTube = new YouTube();
youTube.setKey(config.ytApiKey);

const MAX_VOLUME = 0.3;
const VOLUME_INCREMENT = 0.05;


const meta_player = {
    dispatcher : null,
    voiceConnection : null,
    queue : [],
    volume: 0.2,
    channel: null,
    inDev : false,
    lastMsg: null,
    lastDjMsg: null
};

function pauseAndPlayDispatch() {
    if(meta_player.dispatcher && meta_player.dispatcher.paused){
        meta_player.dispatcher.resume()
    }else if(meta_player.dispatcher && !meta_player.dispatcher.paused) {
        meta_player.dispatcher.pause()
    }
}

function nextTrack() {
    if(meta_player.queue.length > 1) {
        if(meta_player.dispatcher) meta_player.dispatcher.end("next");
    }
}

function changeVolume() {
    const volume = meta_player.volume;
    if(volume && volume <= 1 && volume >= 0 && meta_player.dispatcher){
        console.log("Setting volume", volume);
        meta_player.dispatcher.setVolume(volume);
    }
}

function addSong(ytId, streamOptions, songName) {
    if(meta_player.queue.length > 0){
        meta_player.queue.push({id: ytId, options: streamOptions, songName: songName});
    }else{
        meta_player.queue.push({id: ytId, options: streamOptions, songName: songName});
        playYT();
    }
}

function specialStatus(msg) {
    let statusString = "\n";
    for(let key in meta_player){
        if(key === "queue"){
            statusString += `${key}: ${meta_player.queue.length}\n`;
        }else{
            statusString += `${key}: ${meta_player[key]}\n`
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
        meta_player.dispatcher.end("stop");
        meta_player.dispatcher = null;
    }
    if(meta_player.channel) meta_player.channel.leave();
    meta_player.channel = null;
    meta_player.voiceConnection = null;
    if(meta_player.lastMsg) meta_player.lastMsg.clearReactions().then(meta_player.lastMsg = null);
    if(meta_player.lastDjMsg) meta_player.lastDjMsg.delete().then(meta_player.lastDjMsg = null);
    meta_player.lastMsg = null;
}

function emoteButtons(msg) {
    if(meta_player.lastMsg) meta_player.lastMsg.clearReactions().catch(error => console.log(error));
    meta_player.lastMsg = msg;
    const buttons = {
        "⏯" : pauseAndPlayDispatch,
        "⏹": msg => {msg.clearReactions().catch(error => console.log(error));stopDj()},
        "🔉": () => {meta_player.volume -= 0.1; changeVolume()},
        "🔊": () => {meta_player.volume += 0.1; changeVolume()},
        "⏭": nextTrack
    };

    const validButtons = Object.keys(buttons);
    validButtons.every(butt => {
        msg.react(butt).catch(error => console.log(error));
        return true
    });

    const collector = msg.createReactionCollector(
        (reaction, user) => {
            return !user.bot && validButtons.includes(reaction.emoji.name)
        }
    );

    collector.on('collect', r => {
        if(buttons[r.emoji.name]){
            buttons[r.emoji.name](msg);
        }
        r.users.every(elem => {
           if(!elem.bot){
               r.remove(elem.id);
           }
           return true;
        });
    });
}

function youtubeIdGetter(error, result, streamOptions) {
    if (error) {
        console.log(error);
        if(meta_player.dispatcher){
            meta_player.dispatcher.end();
        }

    }else if(result.items.length > 0){
        let ytId;
        let songName = null;
        result.items.every(elem => {
            const kind = typeof elem.id === "string" ? elem.kind : elem.id.kind;
            if(kind === 'youtube#video'){
                ytId = typeof elem.id === "string" ? elem.id : elem.id.videoId;
                songName = elem.snippet.title;
                return false;
            }
            return true;
        });
        if(ytId){
            addSong(ytId, streamOptions, songName);
        }
    }
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
        changeVolume();
    }

    if(!isSong && (command.pause || command.play) && perm){
        pauseAndPlayDispatch();
    }else if(!isSong && command.next && perm){
        nextTrack();
    }else if(isYoutubeID){
        emoteButtons(msg);
        youTube.getById(vidID, (error, result) => {
            youtubeIdGetter(error, result, streamOptions);
        });
    }else if(isYotubeSearch){
        emoteButtons(msg);
        youTube.search(vidID, 10, (error, result) => {
            youtubeIdGetter(error, result, streamOptions);
        });
    }
};

function connectionPlay() {
    const vidID = meta_player.queue[0].id;
    const streamOptions = meta_player.queue[0].options;
    const songName = meta_player.queue[0].songName;
    const connection = meta_player.voiceConnection;

    const ytOptions = {
        filter : 'audioonly',
        quality: "lowest"
    };

    if(!vidID || !vidID.match(/^[a-zA-Z0-9-_]{11}$/)){
        if(meta_player.dispatcher) meta_player.dispatcher.end("next");
    }

    const stream = ytdl(`https://www.youtube.com/watch?v=${vidID}`, ytOptions);
    meta_player.dispatcher = connection.playStream(stream, streamOptions);
    console.log("Youtube stream ready");
    meta_player.dispatcher.on("speaking", speak => {
        console.log("Playing YT stream");
        if(meta_player.lastMsg){
            const djString = `Now playing: "${songName}"`;
            meta_player.lastMsg.channel.send(djString)
                .then(msg => {
                    if(meta_player.lastDjMsg) meta_player.lastDjMsg.delete();
                    meta_player.lastDjMsg = msg;
                });
        }
        if(streamOptions.playtime && streamOptions.playtime > 0 ){
            console.log("Setting timeout for end: ", streamOptions.playtime);
            setTimeout(() => {
                if(meta_player.dispatcher) meta_player.dispatcher.end("next");
            }, streamOptions.playtime * 1000)
        }
    });
    meta_player.dispatcher.on("start", () => {
        console.log("Loading YT stream");
        const djString = `Now loading: "${songName}"`;
        meta_player.lastMsg.channel.send(djString)
            .then(msg => {
                if(meta_player.lastDjMsg) meta_player.lastDjMsg.delete();
                meta_player.lastDjMsg = msg;
            });
    });

    meta_player.dispatcher.on('end', reason => {
        console.log("Dispatch end because ", reason);
        console.log("Shifting queue");

        if(reason === undefined){
            connectionPlay();
            return;
        }else if(reason === "stop"){
            return;
        }
        meta_player.queue.shift();
        if(meta_player.queue.length === 0){
            console.log("Done, leaving channel");
            stopDj();
        }else if(reason === "next" || reason === "Stream is not generating quickly enough."){
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
        if(meta_player.channel) {
            meta_player.channel.join().then(connection => {
                console.log("Joined channel");
                meta_player.voiceConnection = connection;
                connectionPlay();
            }).catch(e => {
                console.log(e)
            });
        }
    }
}