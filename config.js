const secret = require('./secret.js');

const config = {
    token: process.env.BOT_TOKEN || secret.token,
}

module.exports = config;