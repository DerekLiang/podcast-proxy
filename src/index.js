const express = require('express');

const app = express();


const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const config = require('../config');

const proxy = createProxyMiddleware({
  target: config.podcast.host, 
  changeOrigin: true,
  logger: console,
  /**
   * IMPORTANT: avoid res.end being called automatically
  //  **/
  // selfHandleResponse: true, // res.end() will be called internally by responseInterceptor()

  // /**
  //  * Intercept response and replace 'Hello' with 'Goodbye'
  //  **/
  // onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
  //   const response = responseBuffer.toString('utf8'); // convert buffer to string

  //   // response.match(/url="https:\/\/.*[.]patreonusercontent[.]com.*[^"]/g)

  //   return response.replace(/上海/g, '中国上海'); // manipulate response and return the result
  // }),
  pathRewrite: async function (path, req) {    
    console.log('path', path);
    return path === config.secret ? config.podcast.url : path;
  }
});


app.use('/', proxy);
app.listen(3000, '0.0.0.0');
