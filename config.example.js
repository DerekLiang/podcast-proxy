export const config = {
   public_host_name: 'http://8.8.8.8',  // your public IP address
   public_folder:'public_downlaod',     // folder that store the downloaded files
   secret: '/you-secret', // your secret, serve as password in the URL
   cache_file: 'cache_file.json', // the persistent cache for downloaded files based on url.
   podcast: {
       // in order to differentiate from the original podcast, we change the title,
       replaceTexts: [{from: /<title>Ask/g, to: '<title>P-Ask'}],
       // your podcast information, you should have access to <host><url>
       host: 'https://www.patreon.com',
       url: '/rss/askspaceman?auth=kd99kd09ka93i093',
   }
};
