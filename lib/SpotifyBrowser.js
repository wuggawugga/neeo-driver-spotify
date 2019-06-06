'use strict';

/*
 *	KodiBrowser: Handles list and directories
 */

const debug = require('debug')('neeo-driver-spotify:SpotifyBrowser');
const debugData = debug.extend('data');

const neeoapi = require('neeo-sdk');
//const Promise = require('bluebird');
const dotProp = require('dot-prop');
const config = require('./Config');
const tree = require('./SpotifyBrowserTree');
const api = require('./SpotifyAPI');

const pathToRegexp = require('path-to-regexp');

module.exports = class SpotifyBrowser {

	constructor() {
		debug('CONSTRUCTOR');
		this.page_size = config.get('page_size');
/*
		this.id = id;
		this.controller = controller;
		this.client = client;
		this.library = new KodiLibrary(this.id, this.client);
		this.directory_page_size = parseInt(conf.get('directory_page_size'));
		this.thumbnail_widths = conf.get('thumbnail_widths');
//		this.thumbnail_default_image = conf.get('thumbnail_default_image');
*/
		this.routes = [];
		this.dirs = new (require('./directories'))(this);
		this._setupRoutes(this.dirs);
		// Push default route as the last item
		this.routes.push({
			name: 'default',
			path: '/:key*',
			list: (path_in, params) => {
				return new Promise((resolve, reject) => {
					this.buildList(path_in, params).then((list) => {
						resolve(this.formatList(list, params));
					});
				});
			}
		});
		debug('ROUTES:');
		for(var route of this.routes) {
			debug('\t', route.name, route.path);
		}
	}

	_setupRoutes(node_in) {
		if(node_in.path) {
			this.routes.push(node_in);
		}
		if(node_in.nodes) {
			for(let node of node_in.nodes) {
				this._setupRoutes(node);
			}
		}
	}

	_router(path, params) {
		debug('_router()', path);
			return new Promise((resolve, reject) => {
				var res = null;
				var keys = [];
				var regexp;
				for(var route of this.routes) {
					// debug('ROUTE', route.name);
					regexp = pathToRegexp(route.path, keys);
					res = regexp.exec(path);
					if(res !== null) {
						debug('Route matched:', route.name);
						debug('\t', path, route.path);
						route.list(res, params).then((list) => {
							if(list.constructor.name == 'default_1') {
								resolve(list);
							} else {
								reject('Invalid list');
							}
						});
						break;
					}
				}
				if(res == null) {
					reject('Invalid path');
				}
			});
	}

	browseDirectory(directory_id, params_in) {
		debug('browseDirectory()', directory_id, params_in);

		let params_out = {
			browseIdentifier: params_in.browseIdentifier || null,
			limit: this.page_size,
			offset: params_in.offset || 0,
			start: params_in.offset || 0,
			end: this.directory_page_size
		};
		if(params_out.offset > 0) {
			params_out.end = params_out.offset + params_out.limit;
		}
		var path;
		return new Promise((resolve, reject) => {
			switch(directory_id) {
				case 'DIRECTORY_DEVICES':
					path = params_out.browseIdentifier || '/devices';
					break;
				case 'DIRECTORY_ROOT':
					path = params_out.browseIdentifier || '/';
					break;
				case 'DIRECTORY_LIBRARY_AUDIO':
					path = params_out.browseIdentifier || '/audio';
					break;
				case 'DIRECTORY_LIBRARY_VIDEO':
					path = params_out.browseIdentifier || '/video';
					break;
				case 'DIRECTORY_QUEUE':
					path = '/queue';
					break;
				case 'DIRECTORY_NOW_PLAYING':
					path = '/now_playing';
					break;
				case 'DIRECTORY_FAVOURITES':
					path = '/favourites';
					break;
				default:
					path = params_out.browseIdentifier || '/';
					break;
			}
			this._router(path, params_out).then((list) => {
				resolve(list);
			}).catch((error) => {
				debug('ERROR', error);
			});

		});
	}


	/*
	 *	Builds basic list structure
	 */
	buildList(path_in, params_in) {
		debug('buildList()', path_in, params_in);
		return new Promise((resolve, reject) => {
			const root = tree.root;
			var path = path_in[0];
			var dotPath = path.substring(1).replace(/\//g, '.');
			var node = undefined;

			if(dotProp.get(root, dotPath)) {
				node = dotProp.get(root, dotPath);
			} else {
				node = root;
				path = '';
			}
			var params_api = {
				limit: params_in.limit,
				offset: params_in.offset
			};
			var list = {
				title: undefined,
				total_items: undefined,
				path: path,
				items: []
			};
			if(node) {
				if(node.title) {
					list.title = node.title;
				}
				if(node.list) {
					if(node.list.title) list.title = node.list.title;
					if(node.list.params) Object.assign(params_api, node.list.params);
					debug('Populating from API');
					if(node.list.list_callback) {
						node.list.list_callback();
					}
					debug('Params', params_api);
					api[node.list.method](params_api)
					.then((response) => {
						debug('RESPONSE', response);
						let key = node.list.key;
						let data = response.body;
						if(key) {
							data = response.body[key];
						}
						debugData('DATA', data);
						list.total_items = data.total;
						if(response.body.message) {
							list.title = response.body.message;
						}
						for(var item_in of data.items) {
							debug('ITEM', item_in);
							if(node.list.item_callback) {
								node.list.item_callback(item_in);
							}
							var item_out = {};
							// title
							if(node.list.item_title) {
								if(typeof node.list.item_title == 'function') {
									item_out.title = node.list.item_title(item_in);
								} else {
									item_out.title = dotProp.get(item_in, node.list.item_title, '');
								}
							} else {
								item_out.title = item_in.name;
							}
							// label
							if(node.list.item_label) {
								if(typeof node.list.item_label == 'function') {
									item_out.label = node.list.item_label(item_in);
								} else {
									item_out.label = dotProp.get(item_in, node.list.item_label, '');
								}
							} else if(item_in.label) {
								item_out.label = item_in.label || '';
							}
							// thumbnailUri
							let images = item_in.images;
							if(node.list.item_images) {
								images = dotProp.get(item_in, node.list.item_images, null);
							}
							if(images && images.length) {
								let image = images[0];
								item_out.thumbnailUri = image.url;
							} else {
								if(node.list.thumbnails == true) {
									// FIXME: Default thumbnail
								}
							}
//							if(item_in.thumbnail != '' && typeof item_in.thumbnail !== undefined) item_out.thumbnailUri = this.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small);
//							debug('URL', item_out.title, item_out.thumbnailUri);
							// browseIdentifier
							if(node.list.item_path) {
								item_out.browseIdentifier = node.list.item_path.replace(/\*/g, item_in[node.list.item_key]);
							}
							// actionIdentifier
							if(node.action) {
								item_out.actionIdentifier = [ node.action.method, item_in[node.action.param_key] ].join('|');
							}
							list.items.push(item_out);
						}
						resolve(list);
					});
				} else {
					for(var [key, child] of Object.entries(node)) {
						if(child.disabled === true || child.enabled === false) continue;
						var item = {};
						if(child.browseIdentifier) {
							item.browseIdentifier = child.browseIdentifier;
						} else {
							item.browseIdentifier = path + '/' + key;
						}
						if(child.actionIdentifier) {
							item.actionIdentifier = child.actionIdentifier;
						}
						if(child.title) {
							item.title = child.title;
							if(child.label) item.label = child.label;
							// If a node has both list and action, action applies to listed children
							if(child.action && !child.list) {
								item.actionIdentifier = [ child.action.method, child.action.param ].join('|');
							}
							list.items.push(item);
						}
					}
					list.total_items = list.items.length;
					resolve(list);
				}
			}
		});
	}

	/*
	 *	Builds SDK list from basic list structure
	 */
	async formatList(list_in, listOptions) {
		debug('formatList()');
		const options = {
			title: list_in.title,
			totalMatchingItems: list_in.total_items,
			browseIdentifier: list_in.path,
			offset: listOptions.offset,
			limit: listOptions.limit
		};
		debug('OPTIONS', options);
		var list_out = neeoapi.buildBrowseList(options);
		list_out.setListTitle(options.title);
//		list_out.addListHeader(options.browseIdentifier);
		for(var item_in of list_in.items) {
			var params = {
				title: item_in.title,
				browseIdentifier: item_in.browseIdentifier,
			};
			if(item_in.label) params.label = item_in.label;
			if(item_in.thumbnailUri) {
				params.thumbnailUri = await item_in.thumbnailUri;
				// debug(item_in.thumbnailUri);
			}
			if(item_in.browseIdentifier) params.browseIdentifier = item_in.browseIdentifier;
			if(item_in.actionIdentifier) params.actionIdentifier = item_in.actionIdentifier;
	    list_out.addListItem(params);
	  }
		debug('formatList() returns', list_out.constructor.name);
		return list_out;
	}

}
