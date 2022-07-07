import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import URL from 'url';
import u from 'node:util';
import c from 'node:child_process';
const exec = u.promisify(c.exec);

const TIMEOUT = 10000;

export const util = {
    downloadAsync: function (url, dest) {
        const uri = new URL.URL(url)
        if (!dest) {
            dest = path.basename(uri.pathname)
        }
        const pkg = url.toLowerCase().startsWith('https:') ? https : http

        return new Promise((resolve, reject) => {
            const request = pkg.get(uri.href).on('response', (res) => {
                if (res.statusCode === 200) {
                    const file = fs.createWriteStream(dest, { flags: 'w+' })
                    res
                        .on('end', () => {
                            file.end()
                            console.log(`${uri.pathname} downloaded to: ${dest}`)
                            // resolve to load file file extension
                            resolve()
                        })
                        .on('error', (err) => {
                            file.destroy()
                            fs.unlink(dest, () => reject(err))
                        }).pipe(file)
                } else if (res.statusCode === 302 || res.statusCode === 301) {
                    // Recursively follow redirects, only a 200 will resolve.
                    download(res.headers.location, dest).then(() => resolve())
                } else {
                    reject(new Error(`Download request failed, response status: ${res.statusCode} ${res.statusMessage}`))
                }
            })
            request.setTimeout(TIMEOUT, function () {
                request.destroy()
                reject(new Error(`Request timeout after ${TIMEOUT / 1000.0}s`))
            })
        })
    },

    compressAudioAsync: async function( srcLocalFullPathFileName, suffix) {
        try {
            await exec(`lame --quiet --preset phone ${srcLocalFullPathFileName} ${srcLocalFullPathFileName}${suffix}`);
        }   catch (err) {
            console.log('exception with ' + srcLocalFullPathFileName, err.message);
            throw err;
        }
    },

    toCompressedAudioFileName: function (filename, suffix='-phone') {
        return filename.replace(/([.].*)$/, `${suffix}$1`)
    }
}
