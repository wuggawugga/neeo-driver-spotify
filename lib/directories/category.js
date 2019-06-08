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

			this.title = category.name;

			var Params_list = {
				title: category.name,
				offset: params_in.offset,
				limit: params_in.limit
			};
			var list_out = neeoapi.buildBrowseList(Params_list);
			list_out.setListTitle(Params_list.title);
			list_out.addListHeader('Category');



			resolve(list_out);
		});
	}
}
