'use strict';

const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-spotify:dir_devices');
const config = require('../Config');
const api = require('../SpotifyAPI');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'devices';
	this.title = 'Devices';
	this.path = '/devices';

	this.list = function(route_in, params_in) {

		var listOptions = {
			title: 'Devices',
			offset: params_in.offset,
			limit: params_in.limit
		};

		return new Promise((resolve, reject) => {
			var list_out = neeoapi.buildBrowseList(listOptions);
			list_out.setListTitle(listOptions.title);
			api.getMyDevices()
	    .catch((error) => {
	      debug('ERR', error);
	    })
	    .then((data) => {
	      if(data.body.devices) {
	        let devices = data.body.devices;
					config.set('spotify.devices', {});
	        for(let device of devices) {
						config.set('spotify.devices.' + device.id, device);
						var params_out = {
							title: device.name,
							label: device.type,
							browseIdentifier: '/device/' + device.id
						};
						list_out.addListItem(params_out);
	        }
					resolve(list_out);
	      }
	    });
		});
	}
}
