'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_playlist');
const config = require('../Config');
const api = require('../SpotifyAPI');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'playlist';
	this.title = 'Playlist';
	this.path = '/playlist/:playlist_id';

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let playlist_id = route_in[1];
			let market = config.get('locale.market');

			api.getPlaylist(playlist_id, {market: market}).then((response) => {
				let data = response.body;

				var list_options = {
					title: data.name,
					offset: params_in.offset,
					limit: params_in.limit
				};
				var list_out = neeoapi.buildBrowseList(list_options);
				if(data.description) {
					list_out.addListHeader(data.description);
				}

				list_out.addListButtons([
					{ title: 'Play', actionIdentifier: ['controller', 'play', data.uri].join('|') }
				]);

				debug('RESPOINSE', response);
				if(data.tracks && data.tracks.items && data.tracks.items.length) {
					for(let item of data.tracks.items) {
						let track = item.track;
						debug('TRACK', track);
//						debug('ALBUM', track.album);
						let item_options = {
							title: track.name,
							browseIdentifier: '/track/' + track.id
						};
						// Label
						if(track.artists && track.artists.length) {
							let artists = [];
							for(let a of track.artists) {
								artists.push(a.name);
							}
							item_options.label = 'By ' + artists.join(', ');
						}
						// Thumbnail
						if(track.album.images && track.album.images.length) {
							for(let image of track.album.images) {
								if(image.width == null || image.width == 64) {
									item_options.thumbnailUri = image.url;
								}
							}
						}
						list_out.addListItem(item_options);
					}
				}
				resolve(list_out);
			});

/*
			let devices = config.get('spotify.devices');

			if(devices[device_id]) {
				let device = devices[device_id];


				list_out.setListTitle(listOptions.title);
				list_out.addListHeader(device.type);
				list_out.addListItem({ title: 'Active', label: device.is_active ? 'True' : 'False' });
				list_out.addListItem({ title: 'Private session', label: device.is_private_session? 'True' : 'False' });
				list_out.addListItem({ title: 'Restricted', label: device.is_restricted? 'True' : 'False' });

				list_out.addListButtons([
					{ title: 'Select device', actionIdentifier: ['controller', 'selectDevice', device_id].join('|') }
				]);

			}
*/
		});
	}
}
