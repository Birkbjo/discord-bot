const wlogs = require("weasel.js");
const config = require('../../config.js');
const fs = require("fs");
const Pageres = require("pageres");
var strmToArray = require('stream-to-array')
wlogs.setApiKey(config.wclApiKey);


const wclTypes = {
    dmg: 'damage-done',
    heal: 'healing',
    buffs: 'auras'
};


const acceptedCommands = Object.assign({}, wclTypes)
module.exports = (msg, guild, command) => {
    const args = command._;
    const modifiers = Object.keys(command).filter(elem => !(elem === '_' || elem === 'cmd'));
    const guildName = args[0];
    const realm = args[1];
    const region = args[2] || "EU";

    let type = "";
    if (modifiers.length > 0) {
        const modifierType = modifiers.find(elem => !!wclTypes[elem]);
        type = wclTypes[modifierType];

    }

    const log = new WCLlogs(msg, {
        guildName,
        realm,
        region,
        type,
        includeSS: command.ss,
        boss: command.boss,
        bossIncludeWipes: command.wipes

    });

    const boss = command.boss;
    if (boss) {
        log.sendLatestLogsForBoss();
        return;
    }
    log.sendLatestLogs();
}

/**
 * Returns a promise with an array of the input streams
 * converted to buffers.
 * @param streams to convert
 * @returns {Promise.<Array: Buffer>}
 */
function streamsToBuffers(streams) {
    return Promise.all(streams.map(strm => {
        return strmToArray(strm).then(parts => {
            const buffs = parts.map(part => Buffer.from(part));
            return Buffer.concat(buffs);
        })
    }))
}


function buildWCLUrl(reportId, type = "", fight = "") {
    const typeString = type ? `&type=${type}` : "";
    const fightString = fight ? `&fight=${fight}` : "";
    return `https://www.warcraftlogs.com/reports/${reportId}#view=analytical${typeString}${fightString}`;
}


function captureScreenShot(wclURL, opts) {
    const pageres = new Pageres({selector: '.dataTables_wrapper table'})
        .src(wclURL, ['1920x1080'])
        .run()
    return pageres;
}


class WCLlogs {
    constructor(msg, opts) {
        const defaults = {
            guildName: '',
            region: 'EU',
            realm: '',
            msg: msg,
            wclType: wclTypes['dmg'],
            includeSS: true,
            reports: null,
            fights: null,
            boss: '',
            bossIncludeWipes: false,

        }
        Object.assign(this, defaults, opts || {});
    }

    getReports() {
        const {guildName, realm, region} = this;
        return new Promise((resolve, reject) => {
            wlogs.getReportsGuild(guildName, realm, region, {}, (err, data) => {
                if (err) {
                    reject(err);
                }
                this.reports = data;
                resolve(data);
            })
        })
    }

    getFights(reportId) {
        return new Promise((resolve, reject) => {
            wlogs.getReportFights(reportId, {}, (err, data) => {
                if (err)
                    reject(err);
                this.fights = data;
                resolve(data);
            });
        })
    }

    searchForBoss(reportId, bossName) {
        return new Promise((resolve, reject) => {
            this.getFights(reportId).then(data => {
                const fightsWithBossName = data.fights.filter(elem => elem.name.toLowerCase().includes(bossName.toLowerCase()))
                const lastFight = fightsWithBossName.find(elem => !!elem.kill || this.bossIncludeWipes);
                if (lastFight)
                    resolve(lastFight);

                reject({error: true, reportId, bossName});
            });

        });
    }

    sendLatestLogs() {
        const {msg, guildName, realm, region, wclType} = this;
        this.getReports().then(data => {
            const lastLog = data[data.length - 1];
            const wclUrl = buildWCLUrl(lastLog.id, wclType);
            const message = msg.channel.send(`Latest logs for ${guildName}: \n${wclUrl}`);

            this.checkAndSendSS(wclUrl);
        }).catch(err => {
            msg.reply(`Failed to retrieve logs for ${guildName} on ${realm}-${region}\n ${err}`);
        })
    }

    checkAndSendSS(url, opts) {
        const {msg, guildName, realm, region, wclType} = this;
        console.log("SS")
        if (this.includeSS) {
            captureScreenShot(url, opts || {selector: '.dataTables_wrapper table'})
                .then(streams => streamsToBuffers(streams))
                .then(buffers => {
                    const img = buffers[0];
                    return msg.channel.send("Screenshot of latest logs: ",
                        {files: [{attachment: img, name: 'file.png'}]})
                }).catch(err => {
                console.log(err);
                msg.channel.send("Error occurred during screenshot: " + err);
            })
        }
    }

    sendLatestLogsForBoss() {
        const {msg, guildName, realm, region, wclType, boss} = this;
        if (boss && typeof boss !== 'string') {
            msg.reply("No boss-name given.")
        }

        this.getReports().then(data => {
            const lastLog = data[data.length - 1];

            this.searchForBoss(lastLog.id, boss).then(fight => {
                console.log(fight)
                const wclUrl = buildWCLUrl(lastLog.id, wclType, fight.id);
                msg.channel.send(`Latest logs for ${fight.name}:\n${wclUrl}`)
                this.checkAndSendSS(wclUrl, {});
            }).catch(err => {
                msg.reply(`No fight found for ${err.bossName} in report ${err.reportId}`)
            })

        }).catch(err => {
            msg.reply(`Failed to retrieve logs for ${guildName} on ${realm}-${region}\n ${err}`);
        })

    }
}
