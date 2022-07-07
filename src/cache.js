import { readFileSync, writeFileSync } from 'fs';

let _file_name = '';
let _cache = {};

export const cache = {
    init: (filename) => {
        _file_name = filename;
        try {
            _cache = JSON.parse(readFileSync(_file_name, { encoding: 'utf-8' }));
        } catch { };
        _cache = {};
    },

    add: (key, value) => {
        _cache[key] = value;
        writeFileSync(_file_name, JSON.stringify(_cache), { encoding: 'utf-8' });
    },

    get: (key) => {
        return _cache[key];
    }
};
