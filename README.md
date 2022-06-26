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
   public_host_name: 'http://<your public ip address>', // your public IP address can be found by search "my ip address" in google.
   public_folder:'public_downlaod',                     // folder that store the downloaded files, relative to project root folder.
   secret: '/you-secret',                               // your secret, serve as password in the URL. see below
   podcast: {
       // in order to differentiate from the original podcast, we change the title,
       replaceTexts: [{from: /<title>Ask/g, to: '<title>P-Ask'}],
       // Your podcast information. You should have access to <host><url>
       host: 'https://www.patreon.com',
       url: '/rss/askspaceman?auth=kd99kd09ka93i093',
   }
};

```

## Download

Download the podcast to the public folder. you might want to configur it to run on schedule.
`npm run download`

For cron job, you have to make `download.sh` runnable by running `chmod a+x download.sh` in the Bash shell. Here is the example for cron entry to download files hourly:
```
50 * * * * /bin/bash -c "cd /home/<your path>/podcast-proxy && ./download.sh"
```

Since it compressed the mp3 files using `lame` command utility, it will take some time to compress. The end result is that for 1 hour long audio file, it takes only 10MB hard drive space. On the first run, the number of donwloads can be limited by uncommenting the line `.take(150)`.

## Serve
Serve the downloads in the public folder.
`npm run start`

## Test
You can now test by point your podcast to `<public_host_name><secret>`. Using the configuration in the example, it will be `http://<your public ip address>/<you-secret>`. The `secret` is defined in the configuration file.
