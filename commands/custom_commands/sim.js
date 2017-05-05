const armory = require("wow-armory");
const config = require("../../config");
const request = require("request");
const simTypes = {
    scale: 'scale',
    quick: 'quick'

}

module.exports = (msg, guild, command) => {
    const args = command.args;
    const charName = args[0];
    const server = args[1];
    const region = args[2] || "EU";

    startSim({name: charName, realm: server, region}, msg, guild)
}


//startSim({name: "Padni", realm: "bladefist", region: "eu"})

function startSim(armObj, msg, guild) {
    const {region, realm} = armObj;
    armory.set_options({
        "region": region,
        "realm": realm,
        "apikey": config.blizzApiKey
    });

    armory.character({"name": armObj.name, "fields": ["items", "talents"]}, (err, data) => {
        if (err) return;
        const json = createSimJSON(data, armObj, "quick")

        sendSim(json, (body, url) => {
            console.log("SUm url " + url)
          //  getReportJSON()
            msg.reply("your sim is done! Get it here: " + url)
        })
        msg.reply("Your sim has started, you will be notified when it's done!")
    });
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
    const cookie = request.cookie("raidsid=s%3AyND-v5JdCR01B0voSRZe1irVs_dcwqwH.S6KByCXKtqRSW8vu6K4hftAwNHgT9rcOtvYXh29m8jY")
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

    const poll = setInterval(() => {
        pollStatus(info, body => {
            body = JSON.parse(body);
            console.log(body.queue);
            //  console.log(job);
            if (body.job.state == "complete") {
                clearInterval(poll);
                const pollInt = setInterval(() => {
                    pollReport(info, (url, body, resp) => {
                        if (resp && resp.statusCode == 200) {
                            clearInterval(pollInt);
                            cb(body, url);
                            return;
                        }
                        console.log(resp)
                    });
                }, 2000)
            }
        })
    }, 2000)
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