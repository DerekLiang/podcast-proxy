const express = require('express');
const path = require('path');
const config = require("../config");

const publicPath = path.join(__dirname, config.public_folder);

const app = express();

function setCustomCacheControl(res, path) {
  if (path.match(/[.]rss/)) {
    console.log('set index rss header')
    res.setHeader('content-type', 'application/rss+xml; charset=utf-8');
  }
}

app.use(`${config.secret}`, express.static(publicPath, { index: ['index.rss.bak', 'index.rss'], setHeaders: setCustomCacheControl }));

app.listen(3000, '0.0.0.0');
