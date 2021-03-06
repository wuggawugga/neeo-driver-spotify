'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_track');
const debugData = debug.extend('data');
const config = require('../Config');
const api = require('../SpotifyAPI');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'track';
	this.title = 'Track';
	this.paths = [ '/track/:track_id', '/album/:album_id/:track_id', '/playlist/:playlist_id/:track_id' ];

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let track_id = null;
			let album_id = null;
			let playlist_id = null;

			let t = route_in.input.split('/');
			switch(t[1]) {
				case 'track':
					track_id = route_in[1];
					break;
				case 'album':
					album_id = route_in[1];
					track_id = route_in[2];
					break;
				case 'playlist':
					playlist_id = route_in[1];
					track_id = route_in[2];
					break;
			}
			let track_uri = ['spotify', 'track', track_id].join(':');
			let album_uri = ['spotify', 'album', album_id].join(':');
			let playlist_uri = ['spotify', 'playlist', playlist_id].join(':');

			let play_uri = ['controller', 'play', track_uri].join('|');
			if(album_id) play_uri = ['controller', 'play', album_uri, track_uri].join('|');
			if(playlist_id) play_uri = ['controller', 'play', playlist_uri, track_uri].join('|');

			let params_api = {};
			let market = config.get('locale.market');
			if(market) params_api.market = market;

			api.getTrack(track_id, params_api)
			.then((response) => {

				if(response.statusCode == 200 && response.body) {
					let track = response.body;
					let album = response.body.album;
					delete track.album;

					let params_list = {
						title: 'Track',
						offset: params_in.offset,
						limit: params_in.limit
					};

					// Title
					let list_out = neeoapi.buildBrowseList(params_list);
					list_out.setListTitle(params_list.title);
					list_out.addListHeader(track.name);

					// Artist
					let item_out = {};
					if(track.artists && track.artists.length) {
						item_out.browseIdentifier = '/artist/' + track.artists[0].id;
						let artists = [];
						for(let a of track.artists) {
							artists.push(a.name);
						}
						item_out.title = 'By ' + artists.join(', ');
					}
					let duration = track.duration_ms / 1000;
					let m = Math.floor(duration / 60);
					let s = Math.floor(duration % 60);
					item_out.label = m + ':' + s;
					list_out.addListItem(item_out);

					// Album
					item_out = {
						title: album.name,
						browseIdentifier: '/album/' + album.id
					}
					if(album.artists && album.artists.length) {
						let artists = [];
						for(let a of album.artists) {
							artists.push(a.name);
						}
						item_out.label = artists.join(', ');
					}
					if(album.images && album.images.length) {
						let image = album.images[1];
						item_out.thumbnailUri = image.url;
					}
					list_out.addListItem(item_out);

					// Buttons
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
