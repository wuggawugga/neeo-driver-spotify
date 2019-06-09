'use strict';

const debug = require('debug')('neeo-driver-spotify:dir_track');
const debugData = debug.extend('data');
const Promise = require('bluebird');
const neeoapi = require('neeo-sdk');
const api = require('../SpotifyAPI');
const config = require('../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.name = 'artist';
	this.title = 'Artist';
	this.paths = [ '/artist/:artist_id' ];

	this.list = function(route_in, params_in) {
		return new Promise((resolve, reject) => {

			let artist_id = route_in[1];

			let params_api = {};
			let country = config.get('locale.country');
			if(country) params_api.country = country;


			Promise.join(
				api.getArtist(artist_id),
				api.getArtistTopTracks(artist_id, country),
				api.getArtistRelatedArtists(artist_id),
				api.getArtistAlbums(artist_id, {country: country, include_groups: 'album'}),
				api.getArtistAlbums(artist_id, {country: country, include_groups: 'single'}),
				api.getArtistAlbums(artist_id, {country: country, include_groups: 'compilation,appears_on'}),
			  function(artist_in, tracks_in, artists_in, albums_in, singles_in,compilations_in) {
					let artist = artist_in.body;
					let tracks = tracks_in.body.tracks;
					let artists = artists_in.body.artists;
					let albums = albums_in.body.items;
					let singles = singles_in.body.items;
					let compilations = compilations_in.body.items;

					debug('AFRTIST', artist);
					debug('TRACKS', tracks);
					debug('ALBUMS', albums);
					debug('ARTISTS', artists);

					let params_list = {
						title: 'Artist',
						offset: params_in.offset,
						limit: params_in.limit
					};

					// Title
					let list_out = neeoapi.buildBrowseList(params_list);
					list_out.setListTitle(params_list.title);
					list_out.addListHeader(artist.name);

					// Buttons
					let artist_uri = ['spotify', 'artist', artist_id].join(':');
					let play_uri = ['controller', 'play', artist_uri].join('|');
					list_out.addListButtons([
						{ title: 'Play', actionIdentifier: play_uri }
					]);

					let item_out = {};
					item_out.title = artist.genres.join(', ');
					item_out.label = artist.followers.total + ' followers';
					if(artist.images && artist.images.length) {
						let image = artist.images[1];
						item_out.thumbnailUri = image.url;
					}
					list_out.addListItem(item_out);

					list_out.addListHeader('Popular');
					for(let track of tracks) {
						item_out = {
							title: track.name,
							label: track.album.name,
							browseIdentifier: '/track/' + track.id
						};
						if(track.album.images && track.album.images.length) {
							let image = track.album.images[1];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}

					list_out.addListHeader('Albums');
					for(let album of albums) {
						item_out = {
							title: album.name,
//							label: track.album.name,
							browseIdentifier: '/album/' + album.id
						};
						if(album.images && album.images.length) {
							let image = album.images[1];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}

					list_out.addListHeader('Singles and EPs');
					for(let album of singles) {
						item_out = {
							title: album.name,
//							label: track.album.name,
							browseIdentifier: '/album/' + album.id
						};
						if(album.images && album.images.length) {
							let image = album.images[1];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}

					list_out.addListHeader('Appears on');
					for(let album of compilations) {
						item_out = {
							title: album.name,
//							label: track.album.name,
							browseIdentifier: '/album/' + album.id
						};
						if(album.images && album.images.length) {
							let image = album.images[1];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}

					list_out.addListHeader('Related Artists');
					for(let artist of artists) {
						item_out = {
							title: artist.name,
//							label: track.album.name,
							browseIdentifier: '/artist/' + artist.id
						};
						if(artist.images && artist.images.length) {
							let image = artist.images[1];
							item_out.thumbnailUri = image.url;
						}
						list_out.addListItem(item_out);
					}

					resolve(list_out);
				}
			)
			.catch((error) => {
				debug('ERROR', error);
			});

		});
	}
}
