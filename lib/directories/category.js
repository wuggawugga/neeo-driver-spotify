'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_category');
const config = require('../Config');
const api = require('../SpotifyAPI');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'category';
	this.title = 'N/A';
	this.path = '/category/:category_id';

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {
			let category_id = route_in[1];
			debug('CATEGORY', category_id);
			let category = config.get('spotify.categories.' + category_id);

			let params_api = {};
			let country = config.get('locale.country');
			if(country) params_api.country = country;

			api.getPlaylistsForCategory(category_id, params_api).then((response) => {
				if(response.statusCode == 200 && response.body) {
					debug('RESPONSE', response);

					let playlists = response.body.playlists;

					var Params_list = {
						title: category.name,
						offset: params_in.offset,
						limit: params_in.limit
					};
					var list_out = neeoapi.buildBrowseList(Params_list);
					list_out.setListTitle(Params_list.title);
					list_out.addListHeader(category.name);

					for(let playlist of playlists.items) {
						debug('PLAYLIST', playlist);
						let item_out = {
							title: playlist.name,
							browseIdentifier: '/playlist/' + playlist.id,
						};
						if(playlist.owner) {
							item_out.label = 'By ' + playlist.owner.display_name;
						}
						item_out.label += ' - ' + playlist.tracks.total + ' tracks'
						if(playlist.images && playlist.images.length) {
							let image = playlist.images[0];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}
					resolve(list_out);
				}
			});
		});
	}
}
