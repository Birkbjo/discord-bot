const armory = require("wow-armory");
const config = require("../../config");
const request = require("request");
const simTypes = {
    scale: 'stats',
    quick: 'quick'

}

module.exports = (msg, guild, command) => {
    const args = command.args;
    const modifiers = command.specials;
    const charName = args[0];
    const server = args[1];
    const region = args[2] || "EU";

    let type = "quick";
    if (modifiers.length > 0) {
        const modifierType = modifiers.find(elem => !!simTypes[elem])
        type = simTypes[modifierType];
    }

    startSim({name: charName, realm: server, region}, msg, guild, type)
}


//startSim({name: "Padni", realm: "bladefist", region: "eu"})

function startSim(armObj, msg, guild, type) {
    const {region, realm} = armObj;
    armory.set_options({
        "region": region,
        "realm": realm,
        "apikey": config.blizzApiKey
    });

    armory.character({"name": armObj.name, "fields": ["items", "talents"]}, (err, data) => {
        if (err) {
            msg.reply(`Failed to retrieve character ${armObj.name}. Simulation aborted.\n${err}`);
            return;
        }
        const json = createSimJSON(data, armObj, type)
        sendSimRequest(json).then(body => {
            msg.reply(`your simulation for ${json.baseActorName} has started, you will be notified when it's done!`)
            startPoll(body).then(data => {
                console.log(data);
                simCompleted(msg, data.htmlReportURL, data.body.body, json, body);
            }).catch(err => {
                console.log(err);
                msg.reply(`An error occurred during your simulation of ${json.baseActorName}:\n${err}`)
            });
        }).catch(err => {
            msg.reply(`Failed to start simulation for ${json.baseActorName}.\n${err}`);
        })
    })
}

function simCompleted(msg, htmlReportUrl, resultSimData, requestJson, simStartedJson) {
    let str = "";
    str += `Full report: ${htmlReportUrl}\n`
    str += parseSimResults(resultSimData);
    const pawnStr = generatePawnString(simStartedJson, resultSimData);
    str += "\n" + pawnStr;
    console.log(pawnStr);
    msg.reply("your simulation for " + requestJson.baseActorName + " is done!\n" + str)
}

function generatePawnString(simStartedJson, resultSimData) {
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    const players = resultSimData.sim.players;
    const player = players[0];
    const scaleFactors = player.scale_factors;
    if(!scaleFactors) {
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
    const playerClass = capitalize(simStartedJson.class).replace(/\s/g, '');;
    const playerSpec = capitalize(simStartedJson.spec).replace(/\s/g, '');
    const base = `\`\`\`( Pawn v1: "${player.name} - ${playerSpec} ${playerClass}": Class= ${playerClass},
    Spec=${playerSpec}, `;
    let factors = "";
    const pawnKeys = Object.keys(scaleFactors).filter(key => scaleFactors[key] > 0);
    for(let i = 0; i < pawnKeys.length; i++) {
        const key = pawnKeys[i];
        const pawnKey = pawnStats[key];
        const factor = Math.round(scaleFactors[key] * 100) / 100;
        if(factor <= 0) continue;
        factors += `${pawnKey}=${factor}${i < pawnKeys.length -1 ? ", " : " )```"}`
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
            if(factor <= 0) continue;
            scfString += stat + ": " + factor
                + (i != sortedFactors.length - 1 ? " > " : "")
        }
    }
    // let pawnString =
    return "```DPS: " + dps + (scaleFactors ? "\nScale Factors: " + scfString : "") + "```"
}

function createSimJSON(arm, armObj, type) {
    //console.log(arm);
    const json = {
        advancedInput: "",
        armory: armObj,
        baseActorName: arm.name,
        character: arm,
        email: "",
        fightLength: 300,
        fightStyle: "Patchwerk",
        frontendHost: "raidbots.com",
        frontendVersion: "17ce9b7bcf0d8d9e534816f81585f25e4b727b2d",
        gearsets: [],
        iterations: 10000,
        relics: [],
        reportName: "Quick Sim",
        sendEmail: false,
        simcItems: {},
        simcVersion: "nightly",
        talentsets: [],
        text: "",
        type: type,

    }
    return json;

}

function sendSimRequest(json, doneCB) {
    const url = "https://raidbots.com/sim";
    const j = request.jar();
    const cookie = request.cookie("raidsid=s%3ACcTAy05q-w4Pt3FFR3P3TYf-geSfCUGi.as4QQuhDNQWFdaF3BHOT1piFMr80HyY5kY8MNl%2F56Ts")
    j.setCookie(cookie, url);

    return new Promise((resolve, reject) => {
        request.post({url, jar: j, body: json, json: true}, (err, resp, body) => {
            if (err) {
                console.log(err)
                reject(err);
            } else {
                console.log("Started sim for " + json.baseActorName)
                resolve(body);
            }
        })
    })
}


function startPoll(info) {
    //refactor this mess please


    return new Promise((resolve, reject) => {
        pollStatus(info).then(body => {
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
    return new Promise((resolve, reject) => {
        (function poll() {
            requestStatus(info).then((data) => {
                if (data.job.state === "complete") {
                    console.log("Complete, stop polling.")
                    resolve(data);
                } else if (new Date - start > maxPolling) {
                    console.log("Timed out");
                    reject(new Error("Timed out"));
                } else{
                    console.log(data.queue);
                    setTimeout(poll, 2000);
                }
            }).catch(err => {
                console.log(err)
                if (err.statusCode && err.statusCode == 404)
                    setTimeout(poll, 2000);
                else
                    reject(err);
            })
        })();
    })
}

function requestStatus(info) {
    const url = `https://raidbots.com/job/${info.simId}`
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
