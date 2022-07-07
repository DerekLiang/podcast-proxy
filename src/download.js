import { readFileSync, writeFileSync, rmSync, promises as fsPromises, existsSync } from 'fs';
import path from 'path';
import { cache } from './cache.js';
import { config } from "../config.js";
import { util } from "./util.js";
console.log("config:", config);
import htmlEntity from 'html-entities';
import alot from 'alot';
import sha1 from 'sha1';
import os from "os";
import { sha1File } from 'sha1-file';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, config.public_folder);
const cache_file = path.join(__dirname, config.cache_file);
const cpuCores =os.cpus().length;

const startTime = Date.now()/1000;

const index_rss_filename = path.join(publicPath, 'index.rss');

async function main()
{
    await util.downloadAsync(config.podcast.host + config.podcast.url, index_rss_filename);

    const rssContent = readFileSync(index_rss_filename, { encoding: 'utf-8'});

    cache.init(cache_file);

    console.log('rss content:', rssContent.substring(0,550));

    const rssContentProcessed = await processRssAsync(rssContent);

    const replacedContent = (config.podcast.replaceTexts || []).reduce((acc, {from, to}) => acc.replace(from, to), rssContentProcessed);

    const newIndexRssFilename = index_rss_filename + '.bak';

    rmSync(newIndexRssFilename, {force: true});

    writeFileSync(newIndexRssFilename, replacedContent, { encoding: 'utf-8' });

}

main()

async function processRssAsync(rssContent) {
    const regex = /(https:\/\/[^\/]*\/[^<"]*)/gm;

    let urls = [];

    // first path gather all the URLs
    rssContent.replace(regex, (match, url) => {
        try {
            urls.push(url);
            return match;
        } catch {
            console.error('error replacing RSS feed content');
            return match;
        }
    });

    // download the content
    const downloadInfo = await alot(urls)
        .distinct()
        .filter(url => url.indexOf('.mp3?') >=0)
        .map((url, index) => {
            const fileName = sha1(url+config.podcast.secret ?? '') + '.mp3';
            const fullLocalPathFileName = path.join(publicPath, fileName) ;
            console.log(`${index}-prepare downloading (${url})`);
            return {url, fullLocalPathFileName };
        })
        .take(155)   // limit how much to process
        .mapAsync(async ({url, fullLocalPathFileName}, index) => {

            rmSync(fullLocalPathFileName, {force: true});
            let hasDownloaded = true;   // true if file has already downloaded.
            if (!cache.get(url)) {
                hasDownloaded = false;

                console.log(`  ${index}-downloading (${fullLocalPathFileName})...`);
                await util.downloadAsync(htmlEntity.decode(url), fullLocalPathFileName);

                const suffixForFilename = '_compress';
                console.log(`  ${index}-compressing audio (${fullLocalPathFileName})...`);
                await util.compressAudioAsync(fullLocalPathFileName, suffixForFilename);

                const compressed_filename = fullLocalPathFileName + suffixForFilename;
                let sha1 = await sha1File(compressed_filename);
                let sha1FullLocalFileName = path.join(publicPath, `${sha1}-phone.mp3`);

                console.log(`  ${index}-rename compressing audio (${fullLocalPathFileName})...`);

                rmSync(sha1FullLocalFileName, {force: true});
                await fsPromises.rename(compressed_filename, sha1FullLocalFileName);

                cache.add(url, sha1FullLocalFileName);
                rmSync(fullLocalPathFileName, {force: true});
                console.log(`  ${index}-rename compressing audio (${fullLocalPathFileName}) success`);
            }

            const result = { url, localUrl: `${config.public_host_name}${config.secret}/${cache.get(url)}`, hasDownloaded };
            console.log(`  ${index}-result is (${result.localUrl})...`);
            return result;
        })
        .toArrayAsync({threads: cpuCores+1, errors: 'ignore'});

    const errors = downloadInfo.filter(info => info instanceof Error );
    console.log(`Summary:`);
    if (errors.length) {
        console.error(`  There are errors occurred while processing URLs. Totoal error is: ${errors.length}/${downloadInfo.length}`);
        errors.forEach(err => {
            console.error(err);
        })
        console.error('  --- end of error list ----');
    }

    const endTime = Date.now()/1000;
    const successDownloadCount =
    downloadInfo.length
        - downloadInfo.filter(info => info.hasDownloaded === true && !(info instanceof Error)).length // has been already downloaded
        - errors.length;                                                                              // has downloaded unsuccessfully
    console.log(`  processing URLs successfully. Total downloading is: ${successDownloadCount}/${downloadInfo.length}`);
    console.log(`  time spent in seconds: ${Math.floor(endTime - startTime)}`);

    // for fast lookup
    const urlToActualUrlMap = alot(downloadInfo)
        .filter(info => !(info instanceof Error ))
        .toDictionary(urlInfo => urlInfo.url, urlInfo => urlInfo.localUrl);

    // replace with the actual url
    const result = rssContent.replace(regex, (match, url) => {
        return urlToActualUrlMap[url] || url;
    });
    return result;
}
