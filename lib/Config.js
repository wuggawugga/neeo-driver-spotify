'use strict';

const debug = require('debug')('neeo-driver-spotify:Config');
const Configstore = require('configstore');
const dotProp = require('dot-prop');
const conf = require('../config');
//var api = require('spotify-web-api-node');
const load_keys = [
	'auth.scopes',
	'auth.state_salt',
	'localhost.http_port',
	'localhost.net.address',
	'locale',
	'page_size',
	'recommendations',
	'playlists'
];

class Config extends Configstore {

	constructor() {
		debug('CONSTRUCTOR');
		super('neeo-driver-spotify');
		if(this.all.auth) {
			for(let key of load_keys) {
				this.set(key, dotProp.get(conf, key, undefined));
			}
		} else {
			this.set(conf);
		}
		this.set('auth.authorized', false);
		//debug(this.all);
	}

}

const config = new Config();
module.exports = config;
