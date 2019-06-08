'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_device');
const config = require('../Config');
const api = require('../SpotifyAPI');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'device';
	this.title = 'Device';
	this.path = '/device/:device_id';

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let device_id = route_in[1];
			let devices = config.get('spotify.devices');

			if(devices[device_id]) {
				let device = devices[device_id];

				var Params_list = {
					title: device.name,
					offset: params_in.offset,
					limit: params_in.limit
				};

				var list_out = neeoapi.buildBrowseList(Params_list);
				list_out.setListTitle(Params_list.title);
				list_out.addListHeader(device.type);
				list_out.addListItem({ title: 'Active', label: device.is_active ? 'True' : 'False' });
				list_out.addListItem({ title: 'Private session', label: device.is_private_session? 'True' : 'False' });
				list_out.addListItem({ title: 'Restricted', label: device.is_restricted? 'True' : 'False' });

				list_out.addListButtons([
					{ title: 'Select device', actionIdentifier: ['controller', 'selectDevice', device_id].join('|') }
				]);
				list_out.addListItem({title: 'Close', uiAction: 'close'});

				resolve(list_out);
			}
		});
	}
}
