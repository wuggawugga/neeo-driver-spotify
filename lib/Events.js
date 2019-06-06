'use strict';

const debug = require('debug')('neeo-driver-spotify:Events');
const EventEmitter = require('events');


class Emitter extends EventEmitter {

	constructor() {
		debug('CONSTRUCTOR');
		super();
	}

}

var emitter = new Emitter();

module.exports = emitter;
