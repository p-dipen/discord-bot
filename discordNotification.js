const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const discordWebHook = process.env.DISCORD_WEBHOOK;

const notifyDiscord = (message) => {
  let payload = {
    username: 'Webhook',
    content: message,
  };
  return axios.post(discordWebHook, payload);
};

module.exports = notifyDiscord;
