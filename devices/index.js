'use strict';

const debug = require('debug')('neeo-driver-spotify:device');
const neeoapi = require('neeo-sdk');
const os = require('os');
const Netmask = require('netmask').Netmask;
//const http = require('http');

const config = require('../lib/Config');
const events = require('../lib/Events');
const controller = require('../lib/SpotifyController');




const device = neeoapi.buildDevice('Spotify')
  .setManufacturer('Spotify')
  .setType('MUSICPLAYER')
  .setDriverVersion(9)
  .addCapability('alwaysOn')
  .addAdditionalSearchToken('SDK')
  .addAdditionalSearchToken('Ppp')

  // Then we add the capabilities of the device
  .addButtonGroup('Volume')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')

  .addButton({ name: 'INPUT HDMI', label: 'INPUT HDMI' })

  // Then we wire the controller handler for these capabilities
  device.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId));

  device.addDirectory({ name: 'DIRECTORY_DEVICES', label: 'Devices' }, {
    getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_DEVICES', params),
    action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_DEVICES', params)
  });

  device.addDirectory({ name: 'DIRECTORY_ROOT', label: 'Spotify' }, {
    getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_ROOT', params),
    action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_ROOT', params)
  });


	device.addTextLabel({ name: 'LABEL_SPOTIFY_AUTHORIZED_STATUS', label: 'Authorization status', isLabelVisible: true }, (device_id) => controller.getTextLabel(device_id, 'LABEL_SPOTIFY_AUTHORIZED_STATUS') );
  device.addTextLabel({ name: 'LABEL_NOW_PLAYING_ITEM', label: 'Now Playing Item', isLabelVisible: false }, (device_id) => kodiDevice.getTextLabel(device_id, 'LABEL_NOW_PLAYING_ITEM') );
	device.addTextLabel({ name: 'LABEL_NOW_PLAYING_CONTEXT', label: 'Now Playing Context', isLabelVisible: false }, (device_id) => kodiDevice.getTextLabel(device_id, 'LABEL_NOW_PLAYING_CONTEXT') );

  device.addImageUrl({ name: 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE', label: 'Now Playing Thumbnail Large', size: 'large' }, (device_id) => kodiDevice.getImageUrl(device_id, 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE'));
	device.addImageUrl({ name: 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL', label: 'Now Playing Thumbnail Small', size: 'small' }, (device_id) => kodiDevice.getImageUrl(device_id, 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL'));


/*
  builder.addSlider({ name: 'SLIDER_VOLUME', label: 'Volume', range: [0, 100], unit: '%' }, { setter: (device_id, value) => kodiDevice.setSensorValue(device_id, 'SLIDER_VOLUME', value), getter: (device_id) => kodiDevice.getSensorValue(device_id, 'SLIDER_VOLUME') });
	builder.addSwitch({ name: 'SWITCH_MUTE', label: 'Mute' }, { setter: (device_id, value) => kodiDevice.setSensorValue(device_id, 'SWITCH_MUTE', value), getter: (device_id) => kodiDevice.getSensorValue(device_id, 'SWITCH_MUTE') });
	builder.addSwitch({ name: 'SWITCH_PLAYING', label: 'Playing' }, { setter: (device_id, value) => kodiDevice.setSensorValue(device_id, 'SWITCH_PLAYING', value), getter: (device_id) => kodiDevice.getSensorValue(device_id, 'SWITCH_PLAYING') });
	builder.addSwitch({ name: 'SWITCH_SHUFFLE', label: 'Shuffle' }, { setter: (device_id, value) => kodiDevice.setSensorValue(device_id, 'SWITCH_SHUFFLE', value), getter: (device_id) => kodiDevice.getSensorValue(device_id, 'SWITCH_SHUFFLE') });
	builder.addSwitch({ name: 'SWITCH_REPEAT', label: 'Repeat' }, { setter: (device_id, value) => kodiDevice.setSensorValue(device_id, 'SWITCH_REPEAT', value), getter: (device_id) => kodiDevice.getSensorValue(device_id, 'SWITCH_REPEAT') });

*/

device.registerSubscriptionFunction((updateCallback, optionalCallbacks) => controller.setNotificationCallbacks(updateCallback, optionalCallbacks, device.deviceidentifier) );
device.registerInitialiseFunction(() => controller.initialise(device.deviceidentifier));


neeoapi.discoverOneBrain(true).then((brain) => {
  // Determine which local NIC is in the same network as the brain
  let nics = os.networkInterfaces();
  for(const [name, nic] of Object.entries(nics)) {
    for(const address of nic) {
      if(address.family == 'IPv4') {
        let block = new Netmask(address.cidr);
        // FIXME: add a loop here to account for multiple brain IPs
        if(block.contains(brain.iparray[0])) {
          config.set('localhost.net', address);
          let port = config.get('localhost.http_port');
          let url = 'http://' + address.address + ':' + port;
          config.set('localhost.http_url', url);
          config.set('auth.redirect_url', url + '/authorize');
          events.emit('net_ready');
        }
      }
    }
  }
}).catch(error => {
    console.error('NEEO ERROR', error);
    process.exit(1);
});

module.exports = {
  devices: [
    device,
  ],
};
