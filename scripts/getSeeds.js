'use strict';

const api = require('../lib/SpotifyAPI');
const events = require('../lib/Events');


console.log('Stand by...');
api.initialize();

events.on('auth_authorized', () => { go() });

function go() {
  api.getAvailableGenreSeeds()
  .catch((error) => {
    console.error(error);
  })
  .then((response) => {
    for(let genre of response.body.genres) {
      console.log(genre);
    }
    process.exit(0);
  });
}
