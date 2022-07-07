
let file_name = '';
let cache = {};

module.exports ={
    init: (filename) => {
         file_name = filename;
        try {
            cache = JSON.parse(readFileSync(cache_file, {encoding: 'utf-8'}));
        } catch {}
    },
    add: (key, value) => {
        cache[key] = value;
    },

    get: (key) => {
        writeFileSync(file_name, JSON.stringify(cache), {encoding: 'utf-8'});
        return cache[key];
    },
}
