const { readFile, readFileSync, writeFileSync, existsSync, rmSync } = require('fs');
const path = require('path');
const config = require("../config");
const util = require("./util");
console.log("config:", config);
const htmlEntity = require('html-entities');
const alot = require('alot');
const sha1 = require('sha1');

const publicPath = path.join(__dirname, config.public_folder);

const index_rss_filename = path.join(publicPath, 'index.rss');

async function main()
{
    await util.downloadAsync(config.podcast.host + config.podcast.url, index_rss_filename);

    const rssContent = readFileSync(index_rss_filename, { encoding: 'utf-8'});

    console.log('rss content:', rssContent.substring(0,550));

    const rssContentProcessed = await processRssAsync(rssContent);

    const replacedContent = (config.podcast.replaceTexts || []).reduce((acc, {from, to}) => acc.replace(from, to), rssContentProcessed);

    writeFileSync(index_rss_filename + '.bak', replacedContent, { encoding: 'utf-8'});
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
            const fileName = sha1(url+config.secret) + '.mp3';
            const fullLocalPathFileName = path.join(publicPath, fileName) ;
            console.log(`${index}-prepare downloading (${url})`);
            return {url, fullLocalPathFileName, fileName };
        })
        .take(300)
        .mapAsync(async ({url, fileName, fullLocalPathFileName}, index) => {

            const compressedFullLocalPathFileName = util.toCompressedAudioFileName(fullLocalPathFileName);

            if (existsSync(fullLocalPathFileName) || existsSync(compressedFullLocalPathFileName)) {
                console.log(`  ${index}-skip downloading ${fullLocalPathFileName}`);
            } else {
                console.log(`  ${index}-downloading (${fullLocalPathFileName})...`);
                await util.downloadAsync(htmlEntity.decode(url), fullLocalPathFileName);                
            }            
            if (!existsSync(compressedFullLocalPathFileName)) {           
                console.log(`  ${index}-compressing audio (${fullLocalPathFileName})...`);
                await util.compressAudioAsync(fullLocalPathFileName);
            }
            rmSync(fullLocalPathFileName, {force: true});   
            
            const result = { url, localUrl: `${config.public_host_name}${config.secret}/${util.toCompressedAudioFileName(fileName)}` };
            console.log(`  ${index}-result is (${result.localUrl})...`);          
            return result;
        })
        .toArrayAsync({threads: 5, errors: 'ignore'});
    
    const errors = downloadInfo.filter(info => info instanceof Error );
    if (errors.length) {
        console.error(`there are errors occurred while processing URLs. Totoal error ${errors.length}/${downloadInfo.length}`);
        errors.forEach(err => {
            console.error(err);
        })
        console.error('--- end of error list ----');        
    } else {
        console.log(`processing URLs successfully. Total is: ${downloadInfo.length}`);
    }

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
