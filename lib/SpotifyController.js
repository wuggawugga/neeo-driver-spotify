'use strict';

const debug = require('debug')('neeo-driver-spotify:SpotifyController');
const debugData = debug.extend('data');
const Promise = require('bluebird');
const config = require('./Config');
const api = require('./SpotifyAPI');
const httpInterface = require('./httpInterface');
const events = require('./Events');
const SpotifyBrowser = require('./SpotifyBrowser');

/*
 * Device Controller
 * Events on that device from the Brain will be forwarded here for handling.
 */
class SpotifyController {

  constructor() {
    debug('CONSTRUCTOR');
    this.ready = false;
    this.playback_device_id = config.get('playback_device_id', null);
    this.playback_context_uri = config.get('playback_context_uri', null);
    this.browser = new SpotifyBrowser();
    this.authorized = config.get('auth.authorized');
    this.text_labels = {
      LABEL_AUTHORIZED_STATUS: 'N/A',
      LABEL_CURRENT_DEVICE: 'N/A',
      LABEL_CURRENT_USER: 'N/A',
      LABEL_NOW_PLAYING_ITEM: 'N/A',
      LABEL_NOW_PLAYING_CONTEXT: 'N/A',
    };
    this.image_urls = {
      IMAGE_NOW_PLAYING_THUMBNAIL_LARGE: null,
      IMAGE_NOW_PLAYING_THUMBNAIL_SMALL: null,
    };
    this._component_update_callbacks = {};
    this.timeout_refresh;
    events.on('auth_authorized', () => { this.initialise() });
  }

  initialise() {
    this.getPlaybackState().then(() => {
      this.getPlaybackContext().then(() => {
        this.updateComponents();
      });
    });
  }

  // getPlaybackDevice() {
  //   debug('setPlaybackDevice()');
  //   if(!this.playback_device_id) {
  //     this.playback_device_id = config.get('playback_device_id');
  //   }
  //   if(this.playback_device) {
  //     return this.playback_device;
  //   } else {
  //     return this.setPlaybackDevice(this.playback_device_id);
  //   }
  // }

  setPlaybackDevice(device_id) {
    debug('setPlaybackDevice()', device_id);
    this.playback_device_id = device_id;
    config.set('playback_device_id', this.playback_device_id);
    let key = ['spotify', 'devices', this.playback_device_id].join('.');
    let device = config.get(key);
    if(device) {
      this.playback_device = device;
    }
    this.updateComponents();
    return device;
  }

  getPlaybackContext() {
    debug('getPlaybackContext()');
    return new Promise((resolve, reject) => {
      if(this.playback_context) {
        let key = 'playback_' + this.playback_context.type;
        let params_out = {};
        debug('KEY', key);
        switch(this.playback_context.type) {
          case 'playlist':
            let foo = this.playback_context.href.split('/');
            let id = foo.pop();
            api.getPlaylist(id, params_out)
            .then((response) => {
              debug('SET CONTEXT', key);
              this[key] = response.body;
            });
            break;
        }
      }
    });
  }

  getPlaybackState() {
    debug('getPlaybackState()');
    return new Promise((resolve, reject) => {
      api.getMyCurrentPlaybackState()
      .catch((error) => {
        debug('ERROR', error);
      })
      .then((response) => {
        resolve(this.setPlaybackState(response.body));
      });
    });
  }

  setPlaybackState(data) {
    debug('setPlaybackState()');
    debug('DADA', data);
    clearTimeout(this.timeout_refresh);
    if(data.device) {
      this.playback_device_id = data.device.id;
      this.playback_device = data.device;
    }
    if(data.context) {
      this.playback_context = data.context;
    }
    if(data.item) {
      debug('NEW ITEM');
      this.playback_item = data.item;
      delete this.playback_item.available_markets;
      if(data.item.duration_ms) {
        let progress = data.progress_ms || 0;
        let t = data.item.duration_ms - progress;
        debug('Scheduling refresh in', t, 'ms');
        this.timeout_refresh = setTimeout(() => {this.getPlaybackState()}, t);
      }
    }
    if(data.shuffle_state) this.playback_shuffle = data.shuffle_state;
    if(data.repeat_state) this.playback_repeat = data.repeat_state;
    if(data.timestamp) this.playback_timestamp = data.timestamp;
    if(data.progress_ms) this.playback_progress_ms = data.progress_ms;
    this.currently_playing_type = data.currently_playing_type;
    this.updateComponents();
    return true;
  }

  updateComponents() {
    debug('updateComponents()');
    // Images
    if(this.playback_item && this.playback_item.album && this.playback_item.album.images) {
      for(let image of this.playback_item.album.images) {
        if(image.width == 640) {
          this.image_urls.IMAGE_NOW_PLAYING_THUMBNAIL_LARGE = image.url;
          this.sendComponentUpdate('IMAGE_NOW_PLAYING_THUMBNAIL_LARGE', image.url);
        }
        if(image.width == 300) {
          this.image_urls.IMAGE_NOW_PLAYING_THUMBNAIL_SMALL = image.url;
          this.sendComponentUpdate('IMAGE_NOW_PLAYING_THUMBNAIL_SMALL', image.url);
        }
      }
    }
    // Labels
    debug('LABELS', this.text_labels);
    for(let [label, value] of Object.entries(this.text_labels)) {
      value = this.getTextLabel('default', label);
      this.sendComponentUpdate(label, value);
    }
  }

  getTextLabel(device_id, label_id) {
    debug('getTextLabel()', device_id, label_id);
    var value = 'N/A';
    switch(label_id) {
      case 'LABEL_AUTHORIZED_STATUS':
        this.authorized = config.get('auth.authorized');
        value = this.authorized ? 'Authorized' : 'Not authorized';
        break;
      case 'LABEL_CURRENT_DEVICE':
        if(this.playback_device_id) {
          let key = ['spotify', 'devices', this.playback_device_id].join('.');
          let device = config.get(key);
          if(device) {
            value = device.name;
          }
        } else {
          value = 'Default';
        }
        break;
      case 'LABEL_CURRENT_USER':
        let user = config.get('spotify.current_user');
        if(user) {
          value = user.display_name;
        } else {
          value = 'No user';
        }
        break;
      case 'LABEL_NOW_PLAYING_CONTEXT':
        if(this.playback_context) {
          let key = 'playback_' + this.playback_context.type;
          switch(this.playback_context.type) {
            case 'playlist':
              let playlist = this[key];
              if(playlist) {
                value = playlist.name;
              }
              break;
          }
        }
        break;
      case 'LABEL_NOW_PLAYING_ITEM':
        let caption_item = [];
        if(this.currently_playing_type && this.playback_item) {
          if(this.playback_item.artists) {
            caption_item.push(this.playback_item.artists[0].name);
          }
          caption_item.push(this.playback_item.name);
        }
        value = caption_item.join(' - ');
        break;
      default:
        return label_id + ' not found';
        break;
    }
    this.text_labels[label_id] = value;
    debug('getTextLabelValue() Return', value);
    return value;
  }

  getImageUrl(device_id, image_id) {
		this.debug('getImageUrl()', device_id, image_id);
		return this.image_urls[image_id];
	}

  onButtonPressed(button_id, device_id) {
    console.log('onButtonPressed() "' + button_id + '"');
    try {
      let params_out = {};
      if(this.playback_device_id) params_out.device_id = this.playback_device_id;
      switch(button_id) {
        case 'refresh':
          this.updateComponents();
          break;
        case 'PLAY':
          api.play(params_out)
          .catch((error) => {
            debug('ERROR', error);
          })
          .then((response) => {
            this.getPlaybackState();
            this.getPlaybackContext();
          });
          break;
        case 'PAUSE':
        case 'STOP':
          api.pause(params_out)
          .catch((error) => {
            debug('ERROR', error);
          })
          .then((response) => {
            this.setPlaybackState(response.body);
          });
          break;
        case 'NEXT':
          api.skipToNext()
          .catch((error) => {
            debug('ERROR', error);
          })
          .then((response) => {
            this.getPlaybackState();
          });
          break;
        case 'PREVIOUS':
          api.skipToPrevious()
          .catch((error) => {
            debug('ERROR', error);
          })
          .then((response) => {
            this.getPlaybackState();
          });
          break;
      }
    } catch(error) {
      debug('ERROR', error);
    }
  }


  browseDirectory(device_id, directory_id, params_in) {
    debug('browseDirectory()', device_id, directory_id, params_in);
    var list = this.browser.browseDirectory(directory_id, params_in);
    return list;
  }

  listAction(device_id, directory_id, params) {
    debug('listAction()', device_id, directory_id, params);
    return new Promise((resolve, reject) => {
      try {
        if(params.actionIdentifier) {
          var argv = params.actionIdentifier.split('|');
          var context = argv[0];
          var method = argv[1];
          var args = argv.slice(2);
          var params_out = {};

          debug('CONTEXT', context, 'METHOD', method, 'ARGS', args.join(', '));
          debug('ARGS', args);

          switch(context) {
            case 'controller':
              switch(method) {
                case 'play':
                  if(this.playback_device_id) params_out.device_id = this.playback_device_id;
                  this.playback_context_uri = args[0];
                  config.set('playback_context_uri', this.playback_context_uri);
                  params_out.context_uri = this.playback_context_uri;
                  if(args[1]) {
                    params_out.offset = {uri: args[1]};
                  }
                  debug('PARAMS', params_out);
                  api.play(params_out)
                  .catch((error) => {
                    debug('ERROR', error);
                  })
                  .then((response) => {
                    debug('RESPONSE', response);
                    this.getPlaybackState();
                    this.getPlaybackContext();
                  });
                  break;
                case 'selectDevice':
                  this.setPlaybackDevice(args[0]);
                  break;
              }
              break;
            default:
              reject('Method ' + context + '.' + method + ' not found');
          }
        }
      } catch(error) {
        debug('ERROR', error);
      }
    });
  }


  setNotificationCallbacks(updateCallback, optionalCallbacks, device_id) {
    debug('setNotificationCallbacks()', device_id);
    if(device_id) {
      this._component_update_callbacks[device_id] = updateCallback;
    }
  }

  sendComponentUpdate(component_id, component_value) {
    debug('sendComponentUpdate()', component_id, component_value);
    if(this._component_update_callbacks) {
      for(let [device_id, callback] of Object.entries(this._component_update_callbacks)) {
        debug('Sending', component_id, '=', component_value, 'to', device_id);
        callback({
          uniqueDeviceId: 'default',
          component: component_id,
          value: component_value
        }).catch((error) => {
          debug('NOTIFICATION_FAILED', error.message);
        }).then((result) => {
          return result;
        });
      }
    }
  }




};

var controller = new SpotifyController();

module.exports = controller;
