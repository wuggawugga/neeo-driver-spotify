'use strict';

const debug = require('debug')('neeo-driver-spotify:SpotifyAPI');
const debugData = debug.extend('data');
var SpotifyWebApi = require('spotify-web-api-node');
const crypto = require('crypto');
const config = require('./Config');
const cache = require('./Receptacle').api_cache;
const events = require('./Events');



class SpotifyAPI extends SpotifyWebApi {

	constructor() {
		debug('CONSTRUCTOR');
		super();
		this.auth = config.get('auth');
		if(this.auth) {
			this.setClientId(this.auth.client_id);
			this.setClientSecret(this.auth.client_secret);
		}
		this.refresh_timeout = null;
		events.on('net_ready', () => { this.initialize() });
		events.on('auth_authorize', () => { this.authorize() });
		events.on('auth_refresh', () => { this.refreshAuth() });
		events.on('auth_authorized', () => { this.getUserData() });
	}

	initialize() {
		this.auth = config.get('auth');
		this.setRedirectURI(this.auth.redirect_url);
		let input = this.auth.state_salt + this.auth.clientSecret + Date.now();
		let hash = crypto.createHash('md5');
		hash.update(input);
		let state = hash.digest('hex');
		config.set('auth.state', state);
		config.set('auth.authorize_url', this.createAuthorizeURL(this.auth.scopes, state));
		this.refreshAuth();
	}

	getUserData() {
		debug('getUserData()');
		// Devices
		api.getMyDevices()
		.catch((error) => {
			debug('ERR', error);
		})
		.then((data) => {
			if(data && data.body && data.body.devices) {
				let devices = data.body.devices;
				config.set('spotify.devices', {});
				for(let device of devices) {
					config.set('spotify.devices.' + device.id, device);
				}
			}
		});
		// Current user
		api.getMe()
		.catch((error) => {
			debug('ERR', error);
		})
		.then((response) => {
				if(response && response.body) {
					config.set('spotify.current_user', response.body);
				}
		});
		setTimeout(() => { this.getUserData() }, 300000);
	}

	authorize() {
		debug('authorize()');
		let code = config.get('auth.authorization_code');
		this.authorizationCodeGrant(code).then(
		  function(data) {
				debugData('DATA', data);

				config.set('auth.authorized', true);
				if(data.body['access_token']) {
					api.setAccessToken(data.body['access_token']);
					config.set('auth.access_token', data.body['access_token']);
				}
				if(data.body['refresh_token']) {
					api.setAccessToken(data.body['refresh_token']);
					config.set('auth.refresh_token', data.body['refresh_token']);
				}
				if(data.body['expires_in']) {
					let expires = parseInt(data.body['expires_in']);
					if(expires) {
						let timeout = ( expires - 120 ) * 1000;
						if(this.refresh_timeout) {
							clearTimeout(this.refresh_timeout);
						}
						this.refresh_timeout = setTimeout(() => { events.emit('auth_refresh') }, timeout);
					}
				}
//				events.emit('auth_authorized');
				setTimeout(() => { this.testAuth() }, 1000);
		  },
		  function(err) {
				config.set('auth.authorized', false);
		    console.log('Something went wrong!', err);
				// FIXME: Delete invalid auth tokens
		  }
		);
	}

	refreshAuth() {
		debug('refreshAuth()');
	  return new Promise((resolve, reject) => {

			let access_token = this.getAccessToken();
			if(access_token == undefined) {
				access_token = config.get('auth.access_token');
				if(access_token) {
					this.setAccessToken(access_token);
				}
			}
			let refresh_token = this.getRefreshToken();
			if(refresh_token == undefined) {
				refresh_token = config.get('auth.refresh_token');
				if(refresh_token) {
					this.setRefreshToken(refresh_token);
				}
			}

			this.refreshAccessToken()
			.catch((error) => {
				config.set('auth.authorized', false);
				debug('Could not refresh access token', error);
			})
			.then((data) => {
		    debug('The access token has been refreshed!');
				if(data.body['access_token']) {
					this.setAccessToken(data.body['access_token']);
					config.set('auth.access_token', data.body['access_token']);
				}
				if(data.body['refresh_token']) {
					this.setRefreshToken(data.body['refresh_token']);
					config.set('auth.refresh_token', data.body['refresh_token']);
				}
				if(data.body['expires_in']) {
					let expires = parseInt(data.body['expires_in']);
					if(expires) {
						let timeout = ( expires - 120 ) * 1000;
						if(this.refresh_timeout) {
							clearTimeout(this.refresh_timeout);
						}
						this.refresh_timeout = setTimeout(() => { events.emit('auth_refresh') }, timeout);
					}
				}
				config.set('auth.authorized', true);
//				events.emit('auth_authorized');
				setTimeout(() => { this.testAuth() }, 1000);
				debugData('DATA', data);
				resolve(true);
			 });
		});
	}

	testAuth() {
		debug('testAuth()');
		return new Promise((resolve, reject) => {
			this.getMe()
			.then(function(data) {
				debug('Authorized');
				events.emit('auth_authorized');
//				resolve(true);
			}, function(err) {
				debug('Unauthorized');
				console.log('Something went wrong!', err);
				reject('Unauthorized');
			});
		});
	}

	_cachedRequest(method, key, ...args) {
		debug('_cachedRequest()', method);
		return new Promise((resolve, reject) => {
//			let key = method;
			if(cache.has(key)) {
				debug('CACHE HIT');
				resolve(cache.get(key));
			} else {
				debug('CACHE MISS');
				let func = super[method];
				super[method](...args).then((response) => {
					cache.set(key, response);
					resolve(response);
				});
			}
		});
	}

/*
	getFeaturedPlaylists(options, callback) {
		debug('getFeaturedPlaylists()');
		return new Promise((resolve, reject) => {
			let key = 'FeaturedPlaylists';
			if(cache.has(key)) {
				debug('CACHE HIT');
				resolve(cache.get(key));
			} else {
				debug('CACHE MISS');
				super.getFeaturedPlaylists(options, callback).then((response) => {
					cache.set(key, response);
					resolve(response);
				});
			}
		});
	}
*/
	getFeaturedPlaylists(options, callback) {
		let key = 'FeaturedPlaylists';
		return this._cachedRequest('getFeaturedPlaylists', key, options, callback);
	}

	getPlaylist(playlistId, options, callback) {
		let key = 'Playlist-' + playlistId;
		return this._cachedRequest('getPlaylist', key, playlistId, options, callback);
	}




}

var api = new SpotifyAPI();













module.exports = api;
