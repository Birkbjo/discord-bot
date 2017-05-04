const secret = require('./secret.js');
const config = {
    token: process.env.BOT_TOKEN || secret.token,
    blizzApiKey : process.env.BLIZZ_API_KEY ||  secret.blizzApiKey
};

module.exports = config;