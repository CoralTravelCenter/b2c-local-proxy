#!/usr/bin/env node

import { launchProxy } from '../lib/index.mjs';
import { default as commandLineArgs } from 'command-line-args';

const optionDefinitions = [
    { name: 'port', alias: 'p', type: Number, defaultValue: 8888 },
    { name: 'brand', type: String, defaultValue: 'coral' },
    { name: 'coral', type: Boolean },
    { name: 'sunmar', type: Boolean },
    { name: 'credentials', type: Boolean, defaultValue: false },
    { name: 'origin', type: String, defaultValue: '*' }
];

try {
    const options = commandLineArgs(optionDefinitions);
    if (options.coral && options.sunmar) {
        throw new Error('Please specify only one option --coral or --sunmar, not both');
    }
    if (options.coral) options.brand = 'coral';
    if (options.sunmar) options.brand = 'sunmar';
    launchProxy(options);
} catch (error) {
    console.error(error);
}
