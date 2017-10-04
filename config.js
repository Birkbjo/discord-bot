const secret = require('./secret.js');
const config = {
    token: process.env.BOT_TOKEN || secret.token,
    blizzApiKey : process.env.BLIZZ_API_KEY || secret.blizzApiKey,
    wclApiKey: process.env.WCL_API_KEY || secret.wclApiKey,
    ytApiKey: process.env.YT_API_KEY || secret.ytApiKey,
    rbCookie: process.env.RB_COOKIE || secret.rbCookie,
};

module.exports = config;