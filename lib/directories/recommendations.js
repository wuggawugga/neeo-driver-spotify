'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_device');
const config = require('../Config');
const api = require('../SpotifyAPI');
const dotProp = require('dot-prop');

function getItems(items, key) {
	let a_out = [];
	let uri = null;
	for(let item of items) {
		uri = item;
		if(key)	uri = dotProp.get(item, key);
		if(uri) {
			// debug('URI', uri);
			a_out.push(uri);
		} else {
			debug('ERRRRRRR', key);
			debug(items);
			break;
		}
	}
	return a_out;
}

module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'recommendations';
	this.title = 'Recommendations';
	this.paths = [ '/recommendations', '/recommendations/:profile' ];

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let profile = route_in[1] || 'default';
			debug('PROFILE', profile);
			let profiles = config.get('recommendations');

			var Params_list = {
				title: 'Recommendations',
				offset: params_in.offset,
				limit: params_in.limit
			};

			var list_out = neeoapi.buildBrowseList(Params_list);
			list_out.setListTitle(Params_list.title);
//			list_out.addListHeader(device.type);

			let top_artists = null;
			let top_tracks = null;
			let recent_tracks = null;
			let seeds = {};

			Promise.join(
				api.getMyTopArtists(),
				api.getMyTopTracks(),
				api.getMyRecentlyPlayedTracks(),
			  function(r1, r2, r3) {
					top_artists = getItems(r1.body.items, 'id');
					top_tracks = getItems(r2.body.items, 'id');
					recent_tracks = getItems(r3.body.items, 'track.id');

					seeds.top_artists = top_artists;
					seeds.top_tracks = top_tracks;
					seeds.recent_tracks = recent_tracks;

					let params_api = {};
					Object.assign(params_api, profiles[profile]);
					let market = config.get('locale.market');
					if(market) params_api.market = market;

					if(params_api.seed_tracks) {
						let seed = null;
						let a = [];
						for(let key of params_api.seed_tracks) {
							seed = dotProp.get(seeds, key);
							if(seed) a.push(seed);
						}
						params_api.seed_tracks = a.join(',');
					}
					if(params_api.seed_artists) {
						let seed = null;
						let a = [];
						for(let key of params_api.seed_artists) {
							seed = dotProp.get(seeds, key);
							if(seed) a.push(seed);
						}
						params_api.seed_artists = a.join(',');
					}
					debug(params_api);

					let item_out = null;

					api.getRecommendations(params_api)
					.catch((error) => {
						debug(error);
					})
					.then((response) => {
						let data = response.body;
						for(let track of data.tracks) {
							item_out = {
								title: track.name,
								browseIdentifier: [ '/track', track.id ].join('/')
							};
							// Label
							if(track.artists && track.artists.length) {
								let artists = [];
								for(let a of track.artists) {
									artists.push(a.name);
								}
								item_out.label = 'By ' + artists.join(', ');
							}
							// Thumbnail
							if(track.album.images && track.album.images.length) {
								for(let image of track.album.images) {
									if(image.width == null || image.width == 64) {
										item_out.thumbnailUri = image.url;
									}
								}
							}
							list_out.addListItem(item_out);
						}
						resolve(list_out);
					});
				}
			);
		});
	}
}

/*
acoustic
afrobeat
alt-rock
alternative
ambient
anime
black-metal
bluegrass
blues
bossanova
brazil
breakbeat
british
cantopop
chicago-house
children
chill
classical
club
comedy
country
dance
dancehall
death-metal
deep-house
detroit-techno
disco
disney
drum-and-bass
dub
dubstep
edm
electro
electronic
emo
folk
forro
french
funk
garage
german
gospel
goth
grindcore
groove
grunge
guitar
happy
hard-rock
hardcore
hardstyle
heavy-metal
hip-hop
holidays
honky-tonk
house
idm
indian
indie
indie-pop
industrial
iranian
j-dance
j-idol
j-pop
j-rock
jazz
k-pop
kids
latin
latino
malay
mandopop
metal
metal-misc
metalcore
minimal-techno
movies
mpb
new-age
new-release
opera
pagode
party
philippines-opm
piano
pop
pop-film
post-dubstep
power-pop
progressive-house
psych-rock
punk
punk-rock
r-n-b
rainy-day
reggae
reggaeton
road-trip
rock
rock-n-roll
rockabilly
romance
sad
salsa
samba
sertanejo
show-tunes
singer-songwriter
ska
sleep
songwriter
soul
soundtracks
spanish
study
summer
swedish
synth-pop
tango
techno
trance
trip-hop
turkish
work-out
world-music
*/
