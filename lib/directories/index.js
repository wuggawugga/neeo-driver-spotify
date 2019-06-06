'use strict';





module.exports = function(browser) {
	this.browser = browser;
	this.name = 'dirs';
	this.nodes = [
		new (require('./device'))(browser),
		new (require('./devices'))(browser),
		new (require('./playlist'))(browser),
	];
}
