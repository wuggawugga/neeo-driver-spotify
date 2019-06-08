'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_me');
const config = require('../Config');
const api = require('../SpotifyAPI');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'current_user';
	this.title = 'N/A';
	this.path = '/me';

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {
			let user = config.get('spotify.current_user');
			this.title = user.display_name;
			let Params_list = {
				title: user.display_name
			};

			var list_out = neeoapi.buildBrowseList(Params_list);
			list_out.setListTitle(Params_list.title);
			list_out.addListHeader('User data');
			if(user.id) list_out.addListItem({ title: 'ID', label: user.id });
			if(user.type) list_out.addListItem({ title: 'Type', label: user.type });
			if(user.display_name) list_out.addListItem({ title: 'Display Name', label: user.display_name });
			if(user.birthdate) list_out.addListItem({ title: 'Birthdate', label: user.birthdate });
			if(user.country) list_out.addListItem({ title: 'Country', label: user.country });
			if(user.email) list_out.addListItem({ title: 'Email', label: user.email });
			if(user.followers) list_out.addListItem({ title: 'Followers', label: '' + user.followers.total });
			if(user.product) list_out.addListItem({ title: 'Product', label: user.product });

			resolve(list_out);
		});
	}
}
