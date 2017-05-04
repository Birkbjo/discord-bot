const secret = require('./secret.js');
const config = {
    token: process.env.BOT_TOKEN || secret.token,
    blizzApiKey : process.env.BLIZZ_API_KEY ||  secret.blizzApiKey,
    wclApiKey: process.env.WCL_API_KEY || secret.wclApiKey,
};

module.exports = config;