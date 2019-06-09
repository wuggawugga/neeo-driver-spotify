
module.exports = {
	page_size: 32,
	locale: {
		market: 'DK',
		country: 'DK',
		locale: 'da_DK'
	},
	recommendations: {
		default: {
			limit: 5
		},
		new: {
			seed_artists: [ 'top_artists.1' ],
			seed_genres: 'new-release',
			limit: 5
		},
		top: {
			seed_tracks: [ 'top_tracks.1', 'top_tracks.2' ],
			seed_artists: [ 'top_artists.1' ],
			limit: 5
		},
		acoustic: {
			seed_genres: 'acoustic',
			limit: 5
		}
	},
	playlists: [
		{key: 'root.browse.charts.global_top_50', id: '37i9dQZEVXbMDoHDwVN2tF'},
		{key: 'root.browse.charts.global_viral_50', id: '37i9dQZEVXbLiRSasKsNU9'},
		{key: 'root.browse.charts.denmark_top_50', id: '37i9dQZEVXbL3J0k32lWnN'},
		{key: 'root.browse.charts.denmark_viral_50', id: '37i9dQZEVXbMA8BIYDeMkD'},
	],
	auth: {
		scopes: ['user-read-recently-played', 'user-top-read', 'user-library-read', 'playlist-read-private', 'playlist-read-collaborative', 'user-read-email', 'user-read-birthdate', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'app-remote-control', 'streaming', 'user-follow-read'],
		state_salt: 'salty brine',
		redirect_url: 'http://localhost:3042/authorize',
	},
	localhost: {
		http_port: 3043,
		http_url: 'http://192.168.1.20:3043',
		net: {
			address: '192.168.1.20',
		}
	}
}
