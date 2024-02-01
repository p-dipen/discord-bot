const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const discordWebHook = process.env.DISCORD_WEBHOOK;

const notifyDiscord = async (message) => {
  let payload = {
    username: 'Webhook',
    content: message,
  };
  try {
    await axios.post(discordWebHook, payload);
  } catch (error) {
    console.log('This is error in discordWebHook');
  }
};

module.exports = notifyDiscord;
