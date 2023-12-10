import express from 'express';
import cors from 'cors';
import { B2CSiteAPIAdapter } from './b2c-site-api-adapter.mjs'
import { Readable } from 'node:stream';

const proxy = express();
let b2cAdapter;

export function launchProxy({ port, brand, credentials, origin }) {

    const proxyUrl = {
        coral:  'https://www.coral.ru',
        sunmar: 'https://www.sunmar.ru',
    }[brand];

    proxy.use(cors({ credentials: credentials, origin: origin }));
    proxy.options('*', cors({ credentials: credentials, origin: origin }));

    proxy.use('/', async (req, res) => {
        console.log('<- Got request: %o', req.url);
        b2cAdapter ||= new B2CSiteAPIAdapter(brand);
        const something = await b2cAdapter.queryB2C(req.url);
        const readable = new Readable();
        readable.push(something);
        readable.push(null);
        readable.pipe(res);
    });

    process.on('SIGINT', exitCleanup);
    process.on('SIGTERM', exitCleanup);

    proxy.listen(port);

    console.log('B2C Proxy Active');
}

function exitCleanup() {
    B2CSiteAPIAdapter.cleanup().then(() => {
        process.exit();
    });
}
