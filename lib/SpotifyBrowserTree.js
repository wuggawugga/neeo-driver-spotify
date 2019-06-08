/*
 *	Basic tree structure for directory browser
 */

'use strict';

const debug = require('debug')('neeo-driver-spotify:SpotifyBrowserTree');
//const Promise = require('bluebird');
const format = require('date-format');
const dotProp = require('dot-prop');

//const events = require('./Events');
//const api = require('./SpotifyAPI');
const config = require('./Config');

//{ limit : 3, offset: 1, country: 'SE', locale: 'sv_SE', timestamp:'2014-10-23T09:00:00' }
let date = new Date();
let params = {};
params.country = config.get('locale.country');
params.locale = config.get('locale.locale');
params.timestamp = format(format.ISO8601_FORMAT, new Date());

var current_user = config.get('spotify.current_user');
var params_out = {};

module.exports = {
	root: {
		home: {
			title: 'Home',
			/*
			*	Featured playlists
			*/
			featured_playlists: {
				title: 'Featured Playlists',
				label: 'Spotify featured playlists',
				list: {
					title: 'Featured Playlists', list_callback: playlistHeader,
					method: 'getFeaturedPlaylists', key: 'playlists', params: {country: params.country, locale: params.locale, timestamp: params.timestamp},
					item_label: playlistLabel, item_path: '/playlist/*', item_key: 'id'
				},
			},
			recently_played: {
				title: 'Recently Played',
				label: 'Recently played',
				list: {
					method: 'getMyRecentlyPlayedTracks', params: params_out, list_callback: resetParams,
					item_title: 'track.name', item_label: trackLabel, item_images: 'track.album.images', item_path: '/track/*', item_key: 'track.id'
				},
			},
			new_releases: {
				title: 'New Releases',
				label: 'New releases',
				list: {
					method: 'getNewReleases', key: 'albums', params: {country: params.country},
					item_title: 'name', item_label: albumLabel, item_images: 'images', item_path: '/album/*', item_key: 'id'
				},
			},



		},
		browse: {
			title: 'Browse',
			categories: {
				title: 'Categories',
				label: 'Categories',
				list: {
					method: 'getCategories', key: 'categories', params: {country: params.country, locale: params.locale},
					item_title: 'name', item_path: '/category/*', item_key: 'id', item_callback: category
				},
			},
		},
		library: {
			title: 'Library',

			songs: {
				title: 'Songs',
				label: 'Songs',
				list: {
					method: 'getMySavedTracks', params: {},
					item_title: 'track.name', item_label: trackLabel, item_images: 'track.album.images', item_path: '/track/*', item_key: 'id'
				},
			},
			albums: {
				title: 'Albums',
				label: 'Albums',
				list: {
					method: 'getMySavedAlbums', params: {},
					item_title: 'album.name', item_label: albumLabel, item_images: 'album.images', item_path: '/album/*', item_key: 'id'
				},
			},
			artists: {
				title: 'Artists',
				label: 'Artists',
				list: {
					method: 'getFollowedArtists', key: 'artists', params: params_out, list_callback: resetParams,
					item_label: genre, item_path: '/artist/*', item_key: 'id', item_callback: updateAfter
				},
			},
			playlists: {
				title: 'Playlists',
				label: 'Playlists',
				list: {
					method: 'getUserPlaylists', params: {country: params.country, locale: params.locale, timestamp: params.timestamp},
					item_label: playlistLabel, item_path: '/playlist/*', item_key: 'id'
				},
			},
			top_artists: {
				title: 'Top Artists',
				label: 'Top artists',
				list: {
					method: 'getMyTopArtists', params: params_out, list_callback: resetParams,
					item_label: genre, item_path: '/artist/*', item_key: 'id', item_callback: updateAfter
				},
			},
			top_tracks: {
				title: 'Top Songs',
				label: 'Top songs',
				list: {
					method: 'getMyTopTracks', params: params_out, list_callback: resetParams,
					item_label: albumLabel, item_images: 'album.images', item_path: '/artist/*', item_key: 'id', item_callback: updateAfter
				},
			},
		},
		user: {
			title: 'User',
			node_callback: getUser,
			me: {
				title: 'User',
				node_callback: getUser,
				browseIdentifier: '/me'
			},
			devices: {
				title: 'Devices',
				browseIdentifier: '/devices'
			}
		}
	},
};

function playlistHeader(data_in) {
	return {header: data_in.body.message};
}

function getUser() {
	current_user = config.get('spotify.current_user');
	return {title: current_user.display_name};
}

function category(item_in) {
	debug('category');
	debug(item_in);
	let key = ['spotify', 'categories', item_in.id].join('.');
	config.set(key, item_in);

	if(item_in.icons && item_in.icons.length) {
		debug(item_in.icons[0].url);
		return {thumbnailUri: item_in.icons[0].url};
	}
}

function updateAfter(item_in) {
	debug('updateAfter()');
//	after = item.id;
	params_out.after = item_in.id;
}

function resetParams() {
	params_out = {};
}

function empty() {
	return '';
}

function albumLabel(item) {
	let album = item;
	if(item.album) {
		album = item.album;
	}
	if(album.artists && album.artists.length) {
		let artists = [];
		for(let a of album.artists) {
			artists.push(a.name);
		}
		return artists.join(', ');
	}
	return 'N/A';
}

function genre(item) {
	if(item.genres && item.genres.length) {
		return item.genres[0];
	}
	return 'N/A';
}

function genres(item) {
	if(item.genres && item.genres.length) {
		return item.genres.join(', ');
	}
	return 'N/A';
}

function playlistLabel(playlist) {
	return 'By ' + dotProp.get(playlist, 'owner.display_name', 'N/A');
}

function trackLabel(item) {
	let artists = [];
	for(let artist of item.track.artists) {
		artists.push(artist.name);
	}
	return artists.join(', ');
}

function movieTitle(movie) {
	let title = movie.title;
	if(movie.year) title += ' (' + movie.year + ')';
	return title;
}

function movieLabel(movie) {
	let parts = [];
	if(movie.genre && movie.genre.length) parts.push(movie.genre[0]);
	if(movie.runtime) parts.push('' + Math.floor(movie.runtime/60) + 'm');
	if(movie.country) parts.push(movie.country);
	return parts.join(' - ');
}

function musicVideoLabel(v) {
	let parts = [];
	if(v.artist && v.artist.length) parts.push(v.artist.join(', '));
	// if(movie.runtime) parts.push('' + Math.floor(movie.runtime/60) + 'm');
	// if(movie.country) parts.push(movie.country);
	// debug(movie);
	// debug(parts);
	return parts.join(' - ');
}
