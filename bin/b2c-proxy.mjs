#!/usr/bin/env node

import { launchProxy } from '../lib/index.mjs';
import { default as commandLineArgs } from 'command-line-args';

const optionDefinitions = [
    { name: 'port', alias: 'p', type: Number, defaultValue: 8888 },
    { name: 'brand', type: String, defaultValue: 'coral' },
    { name: 'credentials', type: Boolean, defaultValue: false },
    { name: 'origin', type: String, defaultValue: '*' }
];

try {
    const options = commandLineArgs(optionDefinitions);
    launchProxy(options);
} catch (error) {
    console.error(error);
}
