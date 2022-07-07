import express from 'express';
import path from 'path';
import {config} from "../config.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, config.public_folder);

const app = express();

function setCustomCacheControl(res, path) {
  if (path.match(/[.]rss/)) {
    console.log('set index rss header')
    res.setHeader('content-type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  }
}

app.use(`${config.secret}`, express.static(publicPath, { index: ['index.rss.bak', 'index.rss'], setHeaders: setCustomCacheControl }));

app.listen(3000, '0.0.0.0');
