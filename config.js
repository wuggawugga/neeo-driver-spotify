



module.exports = {
	page_size: 32,
	locale: {
		market: 'DK',
		country: 'DK',
		locale: 'da_DK'
	},
	auth: {
		client_id: '1045e18758344e7cb73a06b08863f82b',
		client_secret: 'fcd47558e83745298fdba2fbb24e1211',
//		scopes: ['user-read-private', 'user-read-email'],
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
