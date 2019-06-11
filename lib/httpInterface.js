'use strict';

const debug = require('debug')('neeo-driver-spotify:httpInterface');
const Promise = require('bluebird');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('./Config');
const events = require('./Events');
const api = require('./SpotifyAPI');

const port = config.get('localhost.http_port') || 3042;
const url = config.get('localhost.http_url');

var app = express();
app.listen(port);

console.log('# Spotify driver HTTP Interface listening on port', port);
console.log('# Visit', url, 'to get started');

/*
 *  Simple logging middleware function. If you don't see NEEO requesting images,
 *  it is because of the brain's image cache. Update KodiClient.getHash() to invalidate.
 */
app.use(function (req, res, next) {
//  debug('HTTP Request', req.connection.remoteAddress, req.originalUrl);
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/*
 *  Dumps the contents of the configiguration store.
 */
app.get('/authorize', function (req, res) {
	let output = '';
	if(req.query) {
		if(req.query.code) {
      debug('Got authorization code:', req.query.code);
			config.set('auth.authorization_code', req.query.code);
		}
		if(req.query.state) {
      debug('Got authorization state:', req.query.state);
      let state = config.get('auth.state');
      if(req.query.state == state) {
        output += 'State checks out<br />';
        debug('State checks out');
      }
		}
	}
  events.emit('auth_authorize');
	output += '<a href="/">Back</a><br />';
  res.send(output).end();
});

app.post('/', function (req, res) {
  let output = 'OK';
  if(req.body.client_id) {
    config.set('auth.client_id', req.body.client_id);
  }
  if(req.body.client_secret) {
    config.set('auth.client_secret', req.body.client_secret);
  }
  res.set('Location', '/');
  // res.location('/');
  // res.setHeader('Location', '/');
  res.send(output).end();
});


app.get('/', function (req, res) {
	let output = '';

	let url = config.get('auth.authorize_url');
	debug('AUTH', config.get('auth'));
  debug('Presented URL', url);

	output += '<ol>';
  output += '<li><a href="https://developer.spotify.com/dashboard/applications" target="_new">Go to https://developer.spotify.com/dashboard/applications</a></li>';
  output += '<li>Add an application for the driver</li>';
  output += '<li>Click on the created application and click Edit Settings</li>';
	output += '<li>Add this URL to Redirect URIs: ' + config.get('auth.redirect_url') + '</li>';
  output += '<li>Copy/paste client ID and client secret values into the form:</li>';
  output += '<form method="post"><input name="client_id" /><input name="client_secret" /><input type="submit" /></form>';
  output += '<li>Restart the driver, reload this page</li>';
  let id = config.get('auth.client_id');
  let secret = config.get('auth.client_secret');
  if(id && secret) {
    output += '<li><a href="' + url + '">Click me!</a> and approve</li>';
  }
	output += '</ol>';

  res.send(output).end();
});
