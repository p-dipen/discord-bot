const puppeteer = require('puppeteer');
const parseArgs = require('minimist');
const axios = require('axios');
const notifyDiscord = require('./discordNotification');
const dotenv = require('dotenv');
dotenv.config();

const usVisaAppointment = async (str, res) => {
  const args = parseArgs(str.split(' '), {
    string: ['u', 'p', 'c', 'a', 'n', 'd', 'r', 'e'],
    boolean: ['g'],
  });

  const {
    d: currentDate,
    u: usernameInput,
    p: passwordInput,
    e: appointmentDate,
    a: appointmentId,
    t: retryTimeout,
    c: consularId,
    n: userToken,
    g: groupAppointment,
    r: region,
  } = args;

  const torontoOnly = true;
  let index = 0;
  const arr = [91, 92, 93, 94, 95];

  const log = async (msg) => {
    const currentDate = '[' + new Date().toLocaleString() + ']';
    console.log(currentDate, msg);
    notifyDiscord(msg);
  };

  const notify = async (msg) => {
    log(msg);

    if (!userToken) {
      return;
    }

    const pushOverAppToken = 'a5o8qtigtvu3yyfaeehtnzfkm88zc9';
    const apiEndpoint = 'https://api.pushover.net/1/messages.json';
    const data = {
      token: pushOverAppToken,
      user: userToken,
      message: msg,
    };

    await axios.post(apiEndpoint, data);
  };

  const sleep = async (timeout) => {
    return await new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const launchPuppeteer = async () => {
    return await puppeteer.launch({
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process',
        '--no-zygote',
      ],
      executablePath:
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
  };

  const navigateToLoginPage = async (page) => {
    await page.goto(
      `https://ais.usvisa-info.com/en-${region}/niv/users/sign_in`,
      {
        waitUntil: 'domcontentloaded',
      },
    );
  };

  const fillInput = async (page, selector, value) => {
    const element = await waitForSelectors(page, selector);
    await scrollIntoViewIfNeeded(element);
    await element.type(value);
  };

  const clickElement = async (page, selector) => {
    const element = await waitForSelectors(page, selector);
    await scrollIntoViewIfNeeded(element);
    await element.click();
  };

  const runLogic = async () => {
    const browser = await launchPuppeteer();
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(30000);

    try {
      await setViewport(page);
      await navigateToLoginPage(page);
      await fillInput(page, ['aria/Email *', '#user_email'], usernameInput);
      await fillInput(page, ['aria/Password', '#user_password'], passwordInput);
      await clickElement(page, [
        '#sign_in_form > div.radio-checkbox-group.margin-top-30 > label > div',
      ]);
      await clickElement(page, [
        'aria/Sign In[role="button"]',
        '#new_user > p:nth-child(9) > input',
      ]);
      await page.waitForNavigation();
      // ... other steps

      await browser.close();
      return true;
    } catch (err) {
      console.error(err);
      log(`This is error ${JSON.stringify(err)}`);
      throw err;
    }
  };

  const setViewport = async (page) => {
    const targetPage = page;
    try {
      await targetPage.setViewport({ width: 2078, height: 1479 });
    } catch (error) {
      console.log('Error from setViewport');
      throw error;
    }
  };

  const waitForSelectors = async (page, selectors, options) => {
    // ... implementation
    for (const selector of selectors) {
      try {
        return await waitForSelector(selector, frame, options);
      } catch (err) {}
    }
    throw new Error(
      'Could not find element for selectors: ' + JSON.stringify(selectors),
    );
  };

  const scrollIntoViewIfNeeded = async (element, timeout) => {
    // ... implementation
    await waitForConnected(element, timeout);
    const isInViewport = await element.isIntersectingViewport({ threshold: 0 });
    if (isInViewport) {
      return;
    }
    await element.evaluate((element) => {
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'auto',
      });
    });
    await waitForInViewport(element, timeout);
  };

  try {
    const result = await runLogic();
    const logStatement = `The title of this blog post `;
    console.log(logStatement);
    if (result) {
      notify('Successfully scheduled a new appointment');
      // break;
    }
    res.send(logStatement);
  } catch (err) {
    // Swallow the error and keep running in case we encountered an error.
    console.error(err);
    log(`This is error ${JSON.stringify(err)}`);
    res
      .status(200)
      .send(`Something went wrong while running Puppeteer: ${err}`);
  }
};

module.exports = usVisaAppointment;
