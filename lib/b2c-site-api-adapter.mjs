import puppeteer from 'puppeteer-core';
import axios from 'axios';
import * as chromeLauncher from 'chrome-launcher';

export class B2CSiteAPIAdapter {
    static _chrome;
    static _webSocketDebuggerUrl;
    static _b2cBrowser;
    static _pages = {};
    static _b2c_query_cache = {};
    _home_page;
    constructor(brand = 'coral') {
        this._home_page = B2CSiteAPIAdapter.homeRandomForBrand(brand);
    }

    static homeRandomForBrand(brand) {
        const pages = {
            coral: ['https://www.coral.ru/', 'https://www.coral.ru/hot-offers/', 'https://www.coral.ru/ping-page-please-dont-remove/'],
            sunmar: ['https://www.sunmar.ru/', 'https://www.sunmar.ru/info-actions/', 'https://www.sunmar.ru/ping-page-please-dont-remove/']
        };
        const len = pages[brand].length;
        return pages[brand][Math.round(Math.random() * (len - 1))];
    }

    static get chromeInstance() {
        if (this._chrome) {
            return this._chrome;
        } else {
            return this._chrome = chromeLauncher.launch({
                chromeFlags: ['--disable-default-apps', '--no-startup-window'/*,'--headless'*/]
            });
        }
    }

    get b2cPage() {
        return B2CSiteAPIAdapter._pages[this._home_page];
    }
    set b2cPage(p) {
        B2CSiteAPIAdapter._pages[this._home_page] = p;
    }

    waitasecond(timeout = 1000) {
        console.log("...waiting %o", timeout);
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    async getB2CPage() {
        if (this.b2cPage) {
            return this.b2cPage;
        } else {
            return this.b2cPage = new Promise(async resolve => {
                const chrome = await B2CSiteAPIAdapter.chromeInstance;
                B2CSiteAPIAdapter._webSocketDebuggerUrl ||= await (async () => {
                    const response = await axios.get(`http://127.0.0.1:${ chrome.port }/json/version`);
                    const { webSocketDebuggerUrl } = response.data;
                    return webSocketDebuggerUrl;
                })();
                B2CSiteAPIAdapter._b2cBrowser ||= await puppeteer.connect({ browserWSEndpoint: B2CSiteAPIAdapter._webSocketDebuggerUrl });
                const newPagePromise = B2CSiteAPIAdapter._b2cBrowser.newPage();
                const page = await newPagePromise;
                await page.goto(this._home_page, { waitUntil: 'domcontentloaded' });
                await this.waitasecond(5000);

                // const jquery_defined = await page.evaluate('window.$');
                const jquery_defined = await page.evaluate(() => !!window.$);
                if (!jquery_defined) {
                    alert("F*ck INCAPSULA!\n\n" +
                        "Seems B2C site suspects you aren't a human ;)\n" +
                        "Please, click OK here, then pass verification on B2C page if present, OR just reload (F5).");
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
                }

                resolve(newPagePromise);
            });
        }
    }

    cleanupHotelName(hotel_name) {
        return hotel_name.replace(/,/g, '').replace(/&\s+SPA/,'');
    }

    async lookupDestination(hotel_name, type = 'package') {
        const b2c_response = await this.queryB2C('/v1/search/destinations', {
            type:    type, /* 'package' or 'hotel' */
            keyword: this.cleanupHotelName(hotel_name)
        });
        if (b2c_response?.Results?.length > 0) {
            const exactly_matched = _(b2c_response.Results).find(hotel => hotel.TitleRu.toUpperCase() === hotel_name.toUpperCase());
            return exactly_matched ?? b2c_response.Results[0];
        } else {
            throw 'Unknown hotel name';
        }
    }

    async getB2CSearchHref(departure, destination, date_formatted /* YYYY-MM-DD */, nights = 7) {
        // https://www.coral.ru/v1/onlyhotel/search
        return await this.queryB2C('/v1/package/search', {
                SelectedDate: date_formatted,
                Departures:   [departure],
                Destination:  [destination],
                DateRange:    0,
                Guest:        { Adults: 2 },
                isCharter:    true,
                isRegular:    false,
                Acc:          [nights]
                // BeginDate:    '2022-08-07',
                // EndDate:      '2022-08-07',
            }
            , 'POST');
    }

    async getB2CHotelHref(destination, begin_date_formatted, end_date_formatted /* YYYY-MM-DD */) {
        return await this.queryB2C('/v1/onlyhotel/search', {
                BeginDate:   begin_date_formatted,
                EndDate:     end_date_formatted,
                Destination: destination,
                Guest:       { Adults: 2 },
            }
            , 'POST');
    }

    async queryB2C(endpoint, request_data = {}, request_method='GET') {
        const page = await this.getB2CPage();
        const req_key = JSON.stringify({endpoint, request_data, request_method});
        if (B2CSiteAPIAdapter._b2c_query_cache[req_key]) {
            return await B2CSiteAPIAdapter._b2c_query_cache[req_key];
        } else {
            return page.evaluate((endpoint, request_data, request_method) => {
                return new Promise((resolve, reject) => {
                    $.ajax(endpoint, {
                        method: request_method,
                        data:   request_data
                    }).then(response_data => resolve(response_data)).fail(reason => reject(reason));
                });
            }, endpoint, request_data, request_method);
        }
    }

    static async cleanup() {
        if (B2CSiteAPIAdapter._b2cBrowser) {
            const chrome = await B2CSiteAPIAdapter.chromeInstance;
            await B2CSiteAPIAdapter._b2cBrowser.close();
            await chrome.kill();
            B2CSiteAPIAdapter._chrome = undefined;
            B2CSiteAPIAdapter._b2cBrowser = undefined;
            B2CSiteAPIAdapter._webSocketDebuggerUrl = undefined;
            B2CSiteAPIAdapter._pages = {};
        }
    }

}
