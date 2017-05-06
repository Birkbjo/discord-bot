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
        }
        const json = createSimJSON(data, armObj, type)

        sendSim(json, (body, url, err) => {
            console.log("SUm url " + url)
            body = JSON.parse(body);
            let str = "";
            str += `Full report: ${url}\n`
            str += parseSimResults(body);
            //  getReportJSON()
            msg.reply("your simulation is done!\n" + str)
            return;
        });
        msg.reply("your simulation has started, you will be notified when it's done!")
    });
}

function parseSimResults(jsonResult) {
    const players = jsonResult.sim.players;
    const player = players[0];
    const dps = Math.round(player.collected_data.dps.mean);
    const scaleFactors = player.scale_factors;
    let scfString = "";
    if (scaleFactors) {
        const sortedFactors = Object.keys(scaleFactors)
            .sort((a,b) => scaleFactors[b] - scaleFactors[a]);
        console.log(sortedFactors)
        for (let i = 0; i < sortedFactors.length; i++) {
            const stat = sortedFactors[i];
            const factor = Math.round(scaleFactors[stat] * 100) /100;
            scfString += stat + ": " + factor
               + (i != sortedFactors.length-1 ? " > " : "")
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

function sendSim(json, doneCB) {
    const url = "https://raidbots.com/sim";
    const j = request.jar();
    const cookie = request.cookie("raidsid=s%3ACcTAy05q-w4Pt3FFR3P3TYf-geSfCUGi.as4QQuhDNQWFdaF3BHOT1piFMr80HyY5kY8MNl%2F56Ts")
    j.setCookie(cookie, url);


    request.post({url, jar: j, body: json, json: true}, (err, resp, body) => {
        console.log(err)
        if (err) {
            console.log(err)
        } else {

        }
        console.log(body);
        startPoll(body, doneCB);

    })
}


function startPoll(info, cb) {
    //refactor this mess please
    const maxPolling = 1000 * 60 * 5; //5min
    const start = new Date();
    const poll = () => {
        pollStatus(info, body => {
            body = JSON.parse(body);
            console.log(body.queue);
            //  console.log(job);
            if (body.job.state == "complete") {
                const pollInt = () => {
                    pollReport(info, (url, body, resp) => {
                        if (resp && resp.statusCode == 200) {
                            const htmlReportURL = url;
                            getReportJSON(info, (url, body, resp) => {
                                cb(body, htmlReportURL);
                            })
                        } else if (resp.statusCode != 404) { //something bad happened
                            console.log(resp);
                            cb(null, url, resp)
                        } else {
                            setTimeout(pollInt, 2000);
                        }
                    });
                }
                pollInt();
            } else if (new Date() - start > maxPolling) {
                console.log(`${info.simId} timed out.`)
                cb(null, null, new Error("Timed out."));
            } else {
                setTimeout(poll, 2000);
            }
        })
    }
    poll();
}

function pollStatus(info, cb) {
    const url = `https://raidbots.com/job/${info.simId}`
    return request.get({url}, (err, resp, body) => {
        if (err) {
            console.log(err);
        }
        cb(body);
    });
}

function pollReport(info, cb) {
    const url = `https://raidbots.com/reports/${info.simId}/index.html`;
    return request.get({url}, (err, resp, body) => {
        if (err) {
            console.log(err);
        }
        cb(url, body, resp);
    });
}

function getReportJSON(info, cb) {
    const url = `https://raidbots.com/reports/${info.simId}/data.json`;
    return request.get({url}, (err, resp, body) => {
        if (err) {
            console.log(err);
        }
        cb(url, body, resp);
    });
}

  function sortProperties(obj, sortedBy, isNumericSort, reverse) {
            sortedBy = sortedBy || 1; // by default first key
            isNumericSort = isNumericSort || false; // by default text sort
            reverse = reverse || false; // by default no reverse

            var reversed = (reverse) ? -1 : 1;

            var sortable = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sortable.push([key, obj[key]]);
                }
            }
            if (isNumericSort)
                sortable.sort(function (a, b) {
                    return reversed * (a[1][sortedBy] - b[1][sortedBy]);
                });
            else
                sortable.sort(function (a, b) {
                    var x = a[1][sortedBy].toLowerCase(),
                        y = b[1][sortedBy].toLowerCase();
                    return x < y ? reversed * -1 : x > y ? reversed : 0;
                });
            return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
        }