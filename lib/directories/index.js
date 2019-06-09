'use strict';

module.exports = function(browser) {
	this.browser = browser;
	this.name = 'dirs';
	this.nodes = [
		new (require('./album'))(browser),
		new (require('./artist'))(browser),
		new (require('./category'))(browser),
		new (require('./device'))(browser),
		new (require('./devices'))(browser),
		new (require('./me'))(browser),
		new (require('./playlist'))(browser),
		new (require('./recommendations'))(browser),
		new (require('./track'))(browser),
	];
}
