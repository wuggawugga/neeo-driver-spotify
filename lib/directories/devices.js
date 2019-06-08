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

		var Params_list = {
			title: 'Devices',
			offset: params_in.offset,
			limit: params_in.limit
		};

		return new Promise((resolve, reject) => {
			var list_out = neeoapi.buildBrowseList(Params_list);
			list_out.setListTitle(Params_list.title);
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
/*
						params_out = {
							title: device.name,
							label: device.type,
							text: null,
							affirmativeButtonText: 'Select',
							negativeButtonText: 'Close',
							actionIdentifier: ['controller', 'selectDevice', device.id].join('|'),
						};
						if(device.restricted) delete params_out.actionIdentifier;
						let keys = {name: 'Name', type: 'Type', is_active: 'Active', is_private_session: 'In private session', is_restricted: 'Restricted'};
						let lines = [];
						for(let [key, caption] of Object.entries(keys)) {
							lines.push(caption + ': ' + device[key]);
						}
						params_out.text = lines.join('<br />\r\n');
						list_out.addListInfoItem(params_out);
*/
	        }
					resolve(list_out);
	      }
	    });
		});
	}
}
