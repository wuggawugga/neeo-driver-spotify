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
			if(route.path) {
				debug('\t', route.name, route.path);
			}
			if(route.paths) {
				for(let p of route.paths) {
					debug('\t', route.name, p);
				}
			}
		}
	}

	_setupRoutes(node_in) {
		if(node_in.path || node_in.paths) {
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
				var paths = [];
				var regexp;
				for(var route of this.routes) {
					// debug('ROUTE', route.name);
					if(route.paths) {
						paths = route.paths;
					} else {
						paths = [route.path];
					}
					for(let p of paths) {
						keys = [];
						debug('\t' + path + ' ~ ' + p);
						regexp = pathToRegexp(p, keys);
						res = regexp.exec(path);
						if(res !== null) {
							for(let k of keys) {
								if(k.name) keys[k.name] = k;
							}
							debug('Route matched:', route.name);
							debug('\t', path, p, keys);
							route.list(res, params).then((list) => {
								if(list.constructor.name == 'default_1') {
									resolve(list);
								} else {
									reject('Invalid list');
								}
							});
//							break;
							return;
						}
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
		return new Promise(async (resolve, reject) => {
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
			var list_out = {
				title: undefined,
				total_items: undefined,
				path: path,
				items: []
			};
			if(node) {
				if(node.title) {
					list_out.title = node.title;
				}
				if(node.list) {
					if(node.list.title) list_out.title = node.list.title;
					if(node.list.params) Object.assign(params_api, node.list.params);
					debug('Populating from API');
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
						if(node.list.list_callback) {
							let obj_in = node.list.list_callback(response);
							Object.assign(list_out, obj_in);
						}
						debug('LIST');
						debug(list_out);
						list_out.total_items = data.total;
						if(node.list.title) {
							list_out.title = node.list.title;
						} else {
							if(response.body.message) {
								list_out.title = response.body.message;
							}
						}
						if(node.list.header) {
							list_out.header = node.list.header;
						}
						for(var item_in of data.items) {
//							debug('ITEM', item_in);
							if(node.list.item_callback) {
								let obj_in = node.list.item_callback(item_in);
								Object.assign(item_in, obj_in);
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
							if(item_in.thumbnailUri) {
								item_out.thumbnailUri = item_in.thumbnailUri;
							} else {
								let images = item_in.images;
								if(node.list.item_images) {
									images = dotProp.get(item_in, node.list.item_images, null);
								}
								if(images && images.length) {
									let image = images[0];
									debug('IMAGE', image);
									item_out.thumbnailUri = image.url;
								} else {
									if(node.list.thumbnails == true) {
										// FIXME: Default thumbnail
									}
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
							list_out.items.push(item_out);
						}
						resolve(list_out);
					});
				} else {
					for(var [key, child] of Object.entries(node)) {
						if(child.disabled === true || child.enabled === false) continue;
						var item = {};
						if(child.node_callback) {
							let obj_in = child.node_callback(child);
							Object.assign(child, obj_in);
						}
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
							list_out.items.push(item);
						}
					}
					list_out.total_items = list_out.items.length;
					resolve(list_out);
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
		if(list_in.header && options.offset == 0) {
			list_out.addListHeader(list_in.header);
		}
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
