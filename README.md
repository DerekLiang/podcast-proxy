# podcast proxy

This is a simple podcast proxy that you can setup locally to serve as a private podcast feed. The main purpose of this repo is to allow podcast client to bypass restrictions that imposed by the DNS based firewall (Chinese Firewall).

The program has been tested on Ubuntu 22.04, NodeJS 18. 

## Install dependence
```sh
sudo apt-get install -y lame
```

Under the project folder install NPM packages by running `npm i`.

## Configure
Copy the `config.example.js` to `config.js` and update the configuration file based your setup.

```ts
module.exports = {
   public_host_name: 'http://8.8.8.8',  // your public IP address
   public_folder:'public_downlaod',     // folder that store the downloaded files
   secret: '/you-secret', // your secret, serve as password in the URL
   podcast: {       
       // in order to differentiate from the original podcast, we change the title,
       replaceTexts: [{from: /<title>Ask/g, to: '<title>P-Ask'}], 
       // your podcast information, you should have access to <host><url>
       host: 'https://www.patreon.com',
       url: '/rss/askspaceman?auth=kd99kd09ka93i093',
   }
};

```

## Download

Download the podcast to the public folder. you might want to configur it to run on schedule.
`npm run download` 

For cron job, run `download.sh`

## Serve
Serve the downloads in the public folder.
`npm run start`

## Test
You can now test by point your podcast to `<public_host_name><secret>`. Using the configuration in the example, it will be `http://8.8.8.8//you-secret`.

