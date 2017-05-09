const armory = require("wow-armory");
const config = require("../../config");
const request = require("request");


const simTypes = {
    scale: 'stats',
    quick: 'quick',
    profile: 'advanced',
}

//Maps parameter names to names used in "API"-requests
const acceptedParams = {
    scale: 'stats',
    quick: 'quick',
    profile: 'advanced',
    iterations: 'iterations',
};

module.exports = (msg, guild, command) => {
    const args = command._;
    const params = Object.keys(command).filter(elem => !(elem === '_' || elem === 'cmd'));
    const charName = args[0] || "";
    const server = args[1] || "";
    const region = args[2] || "EU";

    let simOpts = {type: "quick", profile: "", iterations: 10000}
    const specialParams = params.filter(elem => !!acceptedParams[elem])
    specialParams.forEach(param => {
        if (simTypes[param]) {  // istype
            simOpts.type = simTypes[param];
        }
        const paramValue = command[param];
        if (paramValue) { //need more specific check here, as we add simOpts for e.g "scale=true"
            simOpts[param] = paramValue;
        }

    })
    console.log(simOpts);
    startSim({name: charName, realm: server, region}, msg, guild, simOpts)
};


//startSim({name: "Padni", realm: "bladefist", region: "eu"})
let gl_statusMsg = null;
function startSim(armObj, msg, guild, opts) {
    const {region, realm} = armObj;
    armory.set_options({
        "region": region,
        "realm": realm,
        "apikey": config.blizzApiKey
    });

    if (opts.type == "advanced") {
        if (!opts.profile) {
            msg.reply("Failed to start advanced simulation. No profile-input given.")
            return;
        }
        const json = createSimJSON(null, armObj, opts);
        sendSimRequest(json).then(body => {
            console.log(body)
            msg.reply(`your advanced simulation has started, you will be notified when it's done!`);
            startPoll(body).then(data => {
                console.log(data);
                simCompleted(msg, data.htmlReportURL, data.body.body, json, body);
            }).catch(err => {
                console.log(err);
                msg.reply(`An error occurred during your simulation of ${json.baseActorName}:\n${err}`)
            })
        }).catch(err => {
            console.log(err);
            let errMsg = err;
            if(err.body && err.body.error)
                errMsg = err.body.error;
            msg.reply(`Failed to start advanced simulation.\n${err.body.error}`);
        })

    } else {

        armory.character({"name": armObj.name, "fields": ["items", "talents"]}, (err, data) => {
            if (err) {
                msg.reply(`Failed to retrieve character ${armObj.name}. Simulation aborted.\n${err}`);
                return;
            }
            const json = createSimJSON(data, armObj, opts);
            sendSimRequest(json).then(body => {
                let statusMsg = null;
                msg.reply(`your simulation for ${json.baseActorName} has started, you will be notified when it's done!`)
                    .then(msg => gl_statusMsg = msg);
                startPoll(body, statusMsg).then(data => {
                    console.log(data);
                    simCompleted(msg, data.htmlReportURL, data.body.body, json, body);
                }).catch(err => {
                    console.log(err);
                    msg.reply(`An error occurred during your simulation of ${json.baseActorName}:\n${err}`)
                });
            }).catch(err => {
                console.log(err);
                msg.reply(`Failed to start simulation for ${json.baseActorName}.\n${err}`);
            })
        })
    }
}

function simCompleted(msg, htmlReportUrl, resultSimData, requestJson, simStartedJson) {
    let str = "";
    str += `Full report: ${htmlReportUrl}\n`;
    str += parseSimResults(resultSimData);
    const pawnStr = generatePawnString(simStartedJson, resultSimData);
    str += "\n" + pawnStr;
    console.log(pawnStr);
    const players = resultSimData.sim.players;
    const player = players[0];
    msg.reply("your simulation for " + player.name.replace(/^\s+|\s+$/g, '') + " is done!\n" + str)
}

function generatePawnString(simStartedJson, resultSimData) {
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    const players = resultSimData.sim.players;
    const player = players[0];
    const scaleFactors = player.scale_factors;
    if (!scaleFactors) {
        return "";
    }
    const pawnStats = {
        Crit: 'CritRating',
        Haste: 'HasteRating',
        Mastery: 'MasteryRating',
        Vers: 'Versatility',
        Int: 'Intellect',
        Agi: 'Agility',
        Str: 'Strength'

    }
    const playerClass = capitalize(simStartedJson.class).replace(/\s/g, '');
    ;
    const playerSpec = capitalize(simStartedJson.spec).replace(/\s/g, '');
    const base = `\`\`\`( Pawn: v1: "${player.name} - ${playerSpec} ${playerClass}": Class= ${playerClass},
    Spec=${playerSpec}, `;
    let factors = "";
    const pawnKeys = Object.keys(scaleFactors).filter(key => scaleFactors[key] > 0);
    for (let i = 0; i < pawnKeys.length; i++) {
        const key = pawnKeys[i];
        const pawnKey = pawnStats[key];
        const factor = Math.round(scaleFactors[key] * 100) / 100;
        if (factor <= 0) continue;
        factors += `${pawnKey}=${factor}${i < pawnKeys.length - 1 ? ", " : " )```"}`
    }

    return base + factors;
}

function parseSimResults(jsonResult) {
    const players = jsonResult.sim.players;
    const player = players[0];
    const dps = Math.round(player.collected_data.dps.mean);
    const scaleFactors = player.scale_factors;
    let scfString = "";
    if (scaleFactors) {
        const sortedFactors = Object.keys(scaleFactors).filter(key => scaleFactors[key] > 0)
            .sort((a, b) => scaleFactors[b] - scaleFactors[a]);

        for (let i = 0; i < sortedFactors.length; i++) {
            const stat = sortedFactors[i];
            const factor = Math.round(scaleFactors[stat] * 100) / 100;
            if (factor <= 0) continue;
            scfString += stat + ": " + factor
                + (i != sortedFactors.length - 1 ? " > " : "")
        }
    }
    // let pawnString =
    return "```DPS: " + dps + (scaleFactors ? "\nScale Factors: " + scfString : "") + "```"
}

function createSimJSON(arm, armObj, opts) {
    //console.log(arm);
    const json = {
        advancedInput: opts.profile || "",
        armory: armObj,
        baseActorName: arm && (arm.name || ""),
        email: "",
        fightLength: 300,
        fightStyle: "Patchwerk",
        frontendHost: "raidbots.com",
        frontendVersion: "2d69119f8063dc5f0a43cfa40cd8846fa5d1c3ee",
        gearsets: [],
        iterations: opts.iterations || 10000,
        relics: [],
        reportName: "Quick Sim",
        sendEmail: false,
        simcItems: {},
        simcVersion: "nightly",
        talentsets: [],
        text: "",
        type: opts.type,

    };
    if (arm) {
        json.character = arm;
    }
    return json;

}

function sendSimRequest(json, doneCB) {
    const url = "https://www.raidbots.com/sim";
    const j = request.jar();
    const cookie = request.cookie("raidsid=s%3ALQVBpim-51GV8hz0IkVCUpl4R1eD4ArZ.eaIsjGdulzLkNncYG53m8Pr9BDw92ZiMMhjLpD9lbrQ")
    j.setCookie(cookie, url);

    return new Promise((resolve, reject) => {
        request.post({url, jar: j, body: json, json: true}, (err, resp, body) => {
            if (err || resp.statusCode != 200) {
                console.log(err);
                console.log(resp.statusMessage)
                reject({err, body, resp});
            } else {
                console.log("Started sim for " + json.baseActorName);
                resolve(body);
            }
        })
    })
}


function startPoll(info, statusMsg) {

    return new Promise((resolve, reject) => {
        pollStatus(info, statusMsg).then(body => {
            console.log("Result: " + body);
            requestReportHTML(info).then((data) => {
                const htmlReportURL = data.url;
                requestReportJSON(info).then(data => resolve({htmlReportURL, body: data}))
            })
        }).catch(err => {
            console.log(err);
            reject(err)
        });
    })
}

function pollStatus(info) {
    const maxPolling = 1000 * 60 * 5; //5min
    const start = new Date();
    let orgStatusMsgContent;
    return new Promise((resolve, reject) => {
        (function poll() {
            requestStatus(info).then((data) => {
                if (data.job.state === "complete") {
                    console.log("Complete, stop polling.");
                    resolve(data);
                } else if (new Date - start > maxPolling) {
                    console.log("Timed out");
                    reject(new Error("Timed out"));
                } else {
                    console.log(data.log);
                    console.log(data.queue);
                    if(gl_statusMsg) {
                        if(!orgStatusMsgContent && gl_statusMsg.content) {
                            orgStatusMsgContent = gl_statusMsg.content;
                        }
                        console.log("log length " + data.log.length);
                        const lastLogMsg = data.log[data.log.length-1];
                        const {position, total } = data.queue;
                        const statusStr = `\nIn queue: (${position}/${total})`;
                        let simProgressMsg = "";
                        console.log(lastLogMsg)
                        if(lastLogMsg && lastLogMsg.startsWith("Generating")) {
                            simProgressMsg = "In progress:";
                            const log = lastLogMsg.split(" ");
                            const progress = log[5];
                            console.log(progress);
                            const progressVals = progress.split("/");
                            console.log(progressVals);
                            const simProgressPercent = (parseInt(progressVals[0]) / parseInt(progressVals[1])) * 100;
                            console.log("Percent: " + simProgressPercent)
                            simProgressMsg = `${simProgressMsg} ${simProgressPercent} %`;
                        }
                        gl_statusMsg.edit(orgStatusMsgContent + statusStr + "\n" + simProgressMsg);
                    }
                    setTimeout(poll, 1000);
                }
            }).catch(err => {
                console.log(err);
                if (err.statusCode && err.statusCode == 404)
                    setTimeout(poll, 2000);
                else
                    reject(err);
            })
        })();
    })
}

function requestStatus(info) {
    const url = `https://raidbots.com/job/${info.simId}`;
    return new Promise((resolve, reject) => {
        request.get({url}, (err, resp, body) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(JSON.parse(body));
            }
        })
    })
}

function requestReportHTML(info, cb) {
    const url = `https://raidbots.com/reports/${info.simId}/index.html`;
    return new Promise((resolve, reject) => {
        request.get({url}, (err, resp, body) => {
            if (err) {
                console.log(err);
                reject(err);
            } else if (resp.statusCode != 200) {
                reject(resp);
            }
            resolve({url, body});
        });
    })
}

function requestReportJSON(info, cb) {
    const url = `https://raidbots.com/reports/${info.simId}/data.json`;
    return new Promise((resolve, reject) => {
        request.get({url}, (err, resp, body) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            const res = JSON.parse(body);
            resolve({url, body: res})
        });
    })
}
