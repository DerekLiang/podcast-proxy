const express = require('express');
const htmlEntity = require('html-entities');
const path = require('path');
const fs = require('fs');
const sha1 = require('sha1');
 
const app = express();

const publicPath = path.join(__dirname, 'public');

const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const config = require('../config');
const { hostname } = require('os');

const cachedUrls = {};

const getHashFileInfo = (hostName, url) => {
  if (url.indexOf('?') >= 0) {
    url = url.split('?')[0];
  }
  const hash = sha1(`${hostName}${url}`);

    let extension = '';
    if (url.indexOf('.') >=0) {
      extension = url.substring(url.indexOf('.'));
    } 
    
    const fileName = `${publicPath}/${hash}${extension}`;

  return { hash, extension, fileName };
}

// search and replace urls, if the urls has been cached, it will use static path
const replaceUrls = (xml) => {
  const regex = /https:\/\/([^\/]*)(\/[^<"]*)/gm;

  let logCount = 10;
  const result = xml.replace(regex, (match, hostName, originalUrl) => {
    const { hash, extension, fileName } = getHashFileInfo(hostname, originalUrl);

    const cachedUrl =  cachedUrls[hash];
    if (cachedUrl) return cachedUrl;
    
    const fileExists = fs.existsSync(fileName);
    
    const replacementText = fileExists ? 
      `${config.public_host_name}/static/${hash}${extension}`:
        // $1 is the host name, and $2 is the url
      `${config.public_host_name}${config.secret}/https/${hostName}${originalUrl}`;  

    if (logCount) {
      logCount--;
      console.log(`** replaceUrls hash: ${hash} extesion: ${extension} fileName: ${fileName} fileExists: ${fileExists} hostname: ${hostName} \n--replacing ${match} -> ${replacementText}` );
    }
    
    cachedUrls[hash] = replacementText;
    return replacementText;
  });

  return result;
}

const getHostFromRul = (url, defaultUrl) => {
  const regex = /https\/([^\/]*)\//;

  let m;

  if ((m = regex.exec(url)) !== null) {
      return m[1];
  }
  console.warn('no host name found: ', url);
  return defaultUrl;
}

const getHostUrlFromRul = (url, defaultUrl) => {
  const regex = /https\/([^\/]*)(\/.*)/;

  let m;

  if ((m = regex.exec(url)) !== null) {
      return m[2];
  }
  console.warn('no host name url found: ', url);
  return defaultUrl;
}

const proxy = createProxyMiddleware({
  target: config.podcast.host, 
  changeOrigin: true,
  logger: console,
  /**
   * IMPORTANT: avoid res.end being called automatically
   **/
  selfHandleResponse: true, // res.end() will be called internally by responseInterceptor()

  /**
   * Intercept response and replace 'Hello' with 'Goodbye'
   **/
  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (req.url === config.podcast.url) {  // if it made to the destination
      console.log('onProxyRes url matched', req.url);
      const response = responseBuffer.toString('utf8'); // convert buffer to string
      
      const urlReplaced = replaceUrls(response);
      
      return (config.podcast.replaceTexts || []).reduce((acc, {from, to}) => acc.replace(from, to), urlReplaced);
    }

    const { hash, fileName } = getHashFileInfo(proxyRes.req.host, req.url);

    fs.writeFileSync(fileName, responseBuffer, );
    
    console.log('onProxyRes url not matched', proxy.req.host, req.url);
    console.log('  write to cache', fileName);
    
    delete cachedUrls[hash];

    return responseBuffer;
  }),

  pathRewrite: async function (path, req) {    
    if (path === config.secret) {
      console.log(`pathRewrite path  ${path} -> ${config.podcast.url}`);
      return config.podcast.url;
    }
    let rewrittenPath = getHostUrlFromRul(path, '');
    rewrittenPath = htmlEntity.decode(rewrittenPath);
    console.log(`pathRewrite path  ${path} -> ${rewrittenPath}`);

    return rewrittenPath;
  },

  // Custom router function (target object)
  router: function(req) {
    if (req.url === config.secret) {
      console.log(`router host ${config.podcast.host}`);
      return config.podcast.host;
    }
    const host = getHostFromRul(req.url, "unknow.host.com");
    const result = {
      protocol: 'https:', // The : is required
      host,
      port: 443
  };

    console.log(`router host ${result.protocol}//${result.host}:${result.port}`);
    return result;
  }
}); 
 
app.use('/static', express.static(publicPath));

app.use('/', proxy);
app.listen(3000, '0.0.0.0');
