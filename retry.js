const axios = require('axios');

const checkWebsiteStatus = async () => {
  const url = 'https://ais.usvisa-info.com/en-ca/niv/users/sign_in';

  try {
    const response = await axios.get(url);
    return response.status === 200;
  } catch (error) {
    console.error('Error while checking website status:', error.message);
    return false;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  while (true) {
    const isWebsiteUp = await checkWebsiteStatus();

    if (isWebsiteUp) {
      console.log('The website is back! Returning status code 200.');
      break;
    } else {
      console.log('The website is still down. Retrying in 5 seconds...');
      await delay(5000); // Adjust the delay time as needed
    }
  }
  return false;
};

// Call the main function
module.exports = main;
