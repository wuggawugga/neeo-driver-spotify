'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_album');
const debugData = debug.extend('data');
const config = require('../Config');
const api = require('../SpotifyAPI');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'album';
	this.title = 'Album';
	this.paths = [ '/album/:album_id' ];

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let album_id = route_in[1];

			let params_api = {};
			let market = config.get('locale.market');
			if(market) params_api.market = market;

			api.getAlbum(album_id, params_api)
			.then((response) => {

				if(response.statusCode == 200 && response.body) {
					debug('RESPONSE', response);

					let album = response.body;

					let params_list = {
						title: album.album_type,
						offset: params_in.offset,
						limit: params_in.limit
					};

					// Title
					let list_out = neeoapi.buildBrowseList(params_list);
					list_out.setListTitle(params_list.title);
					list_out.addListHeader(album.name);

					// Artist
					let item_out = {};
					if(album.artists && album.artists.length) {
						item_out.browseIdentifier = '/artist/' + album.artists[0].id;
						let artists = [];
						for(let a of album.artists) {
							artists.push(a.name);
						}
						item_out.title = 'By ' + artists.join(', ');
					}
					let label = [];
					if(album.release_date) {
						label.push(album.release_date.substring(0, 4));
					}
					if(album.total_tracks) {
						let str = album.total_tracks;
						str += album.total_tracks > 1 ? ' songs' : ' song';
						label.push(str);
					}
					item_out.label = label.join(' - ');
					if(album.images && album.images.length) {
						let image = album.images[1];
						item_out.thumbnailUri = image.url;
					}
					list_out.addListItem(item_out);

					// Tracks
					for(let track of album.tracks.items) {
						debug('TRACK', track);
						item_out = {
							title: album.name,
							browseIdentifier: '/track/' + track.id
						}
						let duration = track.duration_ms / 1000;
						let m = Math.floor(duration / 60);
						let s = '' + Math.floor(duration % 60);
						item_out.label = m + ':' + s.padStart(2, '0');

						list_out.addListItem(item_out);
					}

					// Buttons
					let album_uri = ['spotify', 'album', album_id].join(':');
					let play_uri = ['controller', 'play', album_uri].join('|');
		
					list_out.addListButtons([
						{ title: 'Play', actionIdentifier: play_uri }
					]);
					resolve(list_out);
				}
			})
			.catch((error) => {
				debug('ERR', error);
			});
		});
	}
}
