'use strict';

var Receptacle = require('receptacle');
var api_cache = new Receptacle({ ttl: 300000 });

module.exports = {
	api_cache: api_cache,
};
