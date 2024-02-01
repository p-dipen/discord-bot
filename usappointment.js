const puppeteer = require('puppeteer');
const parseArgs = require('minimist');
const axios = require('axios');
const notifyDiscord = require('./discordNotification');
const dotenv = require('dotenv');
const main = require('./retry');
dotenv.config();
let siteIsAlive = true;

const retrySiteBack = async () => {
  siteIsAlive = false;
  try {
    await main();
    siteIsAlive = true;
  } catch (err) {
    console.error(err);
    siteIsAlive = true;
  }
};
const usVisaAppointment = async (str, res) => {
  //#region Command line args
  console.log(str.split(' '));
  const args = parseArgs(str.split(' '), {
    string: ['u', 'p', 'c', 'a', 'n', 'd', 'r', 'e'],
    boolean: ['g'],
  });
  console.log(args);

  const currentDate = new Date(args.d);
  const usernameInput = args.u || process.env.USER;
  const passwordInput = args.p || process.env.PASS;
  const appointmentDate = new Date(args.e || process.env.APPOINT);
  const appointmentId = args.a;
  const retryTimeout = args.t * 1000;
  const consularId = args.c;
  const userToken = args.n || process.env.PUSHOVER;
  const groupAppointment = args.g;
  const region = args.r;
  const torontoOnly = true;
  var index = 0;
  const arr = [91, 92, 93, 94, 95];
  //#endregion
  console.log(appointmentDate);
  //#region Helper functions
  async function waitForSelectors(selectors, frame, options) {
    for (const selector of selectors) {
      try {
        return await waitForSelector(selector, frame, options);
      } catch (err) {}
    }
    throw new Error(
      'Could not find element for selectors: ' + JSON.stringify(selectors),
    );
  }

  async function scrollIntoViewIfNeeded(element, timeout) {
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
  }

  async function waitForConnected(element, timeout) {
    await waitForFunction(async () => {
      return await element.getProperty('isConnected');
    }, timeout);
  }

  async function waitForInViewport(element, timeout) {
    await waitForFunction(async () => {
      return await element.isIntersectingViewport({ threshold: 0 });
    }, timeout);
  }

  async function waitForSelector(selector, frame, options) {
    if (!Array.isArray(selector)) {
      selector = [selector];
    }
    if (!selector.length) {
      throw new Error('Empty selector provided to waitForSelector');
    }
    let element = null;
    for (let i = 0; i < selector.length; i++) {
      const part = selector[i];
      if (element) {
        element = await element.waitForSelector(part, options);
      } else {
        element = await frame.waitForSelector(part, options);
      }
      if (!element) {
        throw new Error('Could not find element: ' + selector.join('>>'));
      }
      if (i < selector.length - 1) {
        element = (
          await element.evaluateHandle((el) =>
            el.shadowRoot ? el.shadowRoot : el,
          )
        ).asElement();
      }
    }
    if (!element) {
      throw new Error('Could not find element: ' + selector.join('|'));
    }
    return element;
  }

  async function waitForFunction(fn, timeout) {
    let isActive = true;
    setTimeout(() => {
      isActive = false;
    }, timeout);
    while (isActive) {
      const result = await fn();
      if (result) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timed out');
  }

  async function sleep(timeout) {
    return await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  async function log(msg) {
    const currentDate = '[' + new Date().toLocaleString() + ']';
    console.log(currentDate, msg);
    try {
      notifyDiscord(msg);
    } catch (err) {
      console.error('Discord notification', JSON.stringify(err));
    }
  }

  async function notify(msg) {
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

    try {
      await axios.post(apiEndpoint, data);
    } catch (err) {
      console.log(JSON.stringify(err));
    }
  }
  //#endregion

  async function runLogic() {
    //#region Init puppeteer
    // const browser = await puppeteer.launch();
    // Comment above line and uncomment following line to see puppeteer in action
    const browser = await puppeteer.launch({
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
    const page = await browser.newPage();
    const timeout = 5000;
    const navigationTimeout = 30000;
    const smallTimeout = 100;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(navigationTimeout);
    //#endregion

    //#region Logic

    // Set the viewport to avoid elements changing places
    {
      const targetPage = page;
      await targetPage.setViewport({ width: 2078, height: 1479 });
    }

    // Go to login page
    {
      const targetPage = page;
      await targetPage.goto(
        'https://ais.usvisa-info.com/en-' + region + '/niv/users/sign_in',
        { waitUntil: 'domcontentloaded' },
      );
    }

    // Click on username input
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['aria/Email *'], ['#user_email']],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 118, y: 21.453125 } });
    }

    // Type username
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['aria/Email *'], ['#user_email']],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      const type = await element.evaluate((el) => el.type);
      if (
        [
          'textarea',
          'select-one',
          'text',
          'url',
          'tel',
          'search',
          'password',
          'number',
          'email',
        ].includes(type)
      ) {
        await element.type(usernameInput);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, usernameInput);
      }
    }

    // Hit tab to go to the password input
    {
      const targetPage = page;
      await targetPage.keyboard.down('Tab');
    }
    {
      const targetPage = page;
      await targetPage.keyboard.up('Tab');
    }

    // Type password
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['aria/Password'], ['#user_password']],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      const type = await element.evaluate((el) => el.type);
      if (
        [
          'textarea',
          'select-one',
          'text',
          'url',
          'tel',
          'search',
          'password',
          'number',
          'email',
        ].includes(type)
      ) {
        await element.type(passwordInput);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, passwordInput);
      }
    }

    // Tick the checkbox for agreement
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [
          [
            '#sign_in_form > div.radio-checkbox-group.margin-top-30 > label > div',
          ],
        ],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 9, y: 16.34375 } });
    }

    // Click login button
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [
          ['aria/Sign In[role="button"]'],
          ['#new_user > p:nth-child(9) > input'],
        ],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 34, y: 11.34375 } });
      await targetPage.waitForNavigation();
    }

    // We are logged in now. Check available dates from the API
    {
      let availableDates;
      while (true) {
        const targetPage = page;
        await targetPage.setExtraHTTPHeaders({
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
        });
        const id = torontoOnly ? consularId : arr[index];
        console.log(id);
        const response = await targetPage.goto(
          'https://ais.usvisa-info.com/en-' +
            region +
            '/niv/schedule/' +
            appointmentId +
            '/appointment/days/' +
            id +
            '.json?appointments[expedite]=false',
        );

        availableDates = JSON.parse(await response.text());
        console.log(availableDates);
        if (availableDates.length <= 0) {
          let id = torontoOnly ? consularId : arr[index];
          console.log(
            'There are no available dates for consulate with id ' + id,
          );
          await browser.close();
          return false;
        }

        const firstDate = new Date(availableDates[0].date);

        if (firstDate < appointmentDate) {
          break;
        }
      }
      log('Found an earlier date! ' + firstDate.toISOString().slice(0, 10));
      notify('Found an earlier date! ' + firstDate.toISOString().slice(0, 10));
    }

    // Go to appointment page
    {
      const targetPage = page;
      await targetPage.goto(
        'https://ais.usvisa-info.com/en-' +
          region +
          '/niv/schedule/' +
          appointmentId +
          '/appointment',
        { waitUntil: 'domcontentloaded' },
      );
      await sleep(1000);
    }

    // Select multiple people if it is a group appointment
    {
      if (groupAppointment) {
        const targetPage = page;
        const element = await waitForSelectors(
          [
            ['aria/Continue'],
            ['#main > div.mainContent > form > div:nth-child(3) > div > input'],
          ],
          targetPage,
          { timeout, visible: true },
        );
        await scrollIntoViewIfNeeded(element, timeout);
        await element.click({ offset: { x: 70.515625, y: 25.25 } });
        await sleep(1000);
      }
    }

    // Select the specified consular from the dropdown
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [
          ['aria/Consular Section Appointment', 'aria/[role="combobox"]'],
          ['#appointments_consulate_appointment_facility_id'],
        ],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      let id = torontoOnly ? consularId : arr[index];
      await page.select('#appointments_consulate_appointment_facility_id', id);
      await sleep(1000);
    }

    // Click on date input
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [
          ['aria/Date of Appointment *'],
          ['#appointments_consulate_appointment_date'],
        ],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 394.5, y: 17.53125 } });
      await sleep(1000);
    }

    // Keep clicking next button until we find the first available date and click to that date
    {
      const targetPage = page;
      while (true) {
        try {
          const element = await waitForSelectors(
            [
              ['aria/25[role="link"]'],
              [
                '#ui-datepicker-div > div.ui-datepicker-group.ui-datepicker-group > table > tbody > tr > td.undefined > a',
              ],
            ],
            targetPage,
            { timeout: smallTimeout, visible: true },
          );
          await scrollIntoViewIfNeeded(element, timeout);
          await page.click(
            '#ui-datepicker-div > div.ui-datepicker-group.ui-datepicker-group > table > tbody > tr > td.undefined > a',
          );
          await sleep(500);
          break;
        } catch (err) {
          {
            const targetPage = page;
            const element = await waitForSelectors(
              [
                ['aria/Next', 'aria/[role="generic"]'],
                [
                  '#ui-datepicker-div > div.ui-datepicker-group.ui-datepicker-group-last > div > a > span',
                ],
              ],
              targetPage,
              { timeout, visible: true },
            );
            await scrollIntoViewIfNeeded(element, timeout);
            await element.click({ offset: { x: 4, y: 9.03125 } });
          }
        }
      }
    }

    // Select the first available Time from the time dropdown
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['#appointments_consulate_appointment_time']],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await page.evaluate(() => {
        document.querySelector(
          '#appointments_consulate_appointment_time option:nth-child(2)',
        ).selected = true;
        const event = new Event('change', { bubbles: true });
        document
          .querySelector('#appointments_consulate_appointment_time')
          .dispatchEvent(event);
      });
      await sleep(1000);
    }

    // Click on reschedule button
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['aria/Reschedule'], ['#appointments_submit']],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 78.109375, y: 20.0625 } });
      await sleep(1000);
    }

    // Click on submit button on the confirmation popup
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [
          ['aria/Cancel'],
          ['body > div.reveal-overlay > div > div > a.button.alert'],
        ],
        targetPage,
        { timeout, visible: true },
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await page.click(
        'body > div.reveal-overlay > div > div > a.button.alert',
      );
      await sleep(5000);
    }

    await browser.close();
    return true;
    //#endregion
  }

  // while (true) {
  try {
    if (siteIsAlive) {
      const result = await runLogic();
      const logStatement = `The title of this blog post `;
      console.log(logStatement);
      if (result) {
        notify('Successfully scheduled a new appointment');
        // break;
      }
      res.send(logStatement);
    }
    res.send('Waiting for site to back');
  } catch (err) {
    // Swallow the error and keep running in case we encountered an error.
    console.error(JSON.stringify(err));
    if (err.name != 'TimeoutError') {
      log(`This is error ${JSON.stringify(err)}`);
    } else {
      retrySiteBack();
    }
    res
      .status(err.name != 'TimeoutError' ? 500 : 200)
      .send(`Something went wrong while running Puppeteer: ${err}`);
  }
  if (!torontoOnly) {
    if (index < arr.length) {
      index++;
    } else {
      index = 0;
    }
  }
  // await sleep(retryTimeout);
  // }
};

// "start": "node usappointment.js -r \"ca\" -d \"2024-03-04\" -a 52463688 -c 94 -t 120 -g"

module.exports = { usVisaAppointment };
