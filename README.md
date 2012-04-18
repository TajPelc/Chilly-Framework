# Chilly Framework #
## About ##

**[Chilly Framework](http://www.chillyframework.com/)** is a HTML5 game development platform running on [Node.js](http://nodejs.org/) using [Connect](http://www.senchalabs.org/connect/) middleware.

It was built in response to our needs while developing a HTML5 game called TankCraft.

It acts as multiplayer server which also serves static files and uses Ajax requests to transfer data between the front end and the back end. The main feature is syncing player actions or broadcasting data across multiple clients using Chilly update channels.

Behind the hood requests and long-polling are handled by Chilly. We provide an interface to use these features easily.

The back end logic of a game can be built using Chilly Framework methods and if needed, additional Node.js modules like MySQL support, can be added easily using [NPM modules](http://search.npmjs.org/).

Chilly front end script takes care of ajax requests and broadcasting updates. And triggers updates whenever a client receives data. Developers are free to use whatever suits them to build the game. We used the [CraftyJS](http://craftyjs.com/) library for graphics and animations, jQuery for the UI and SoundManager for the sound.

## Installation ##

* Download and [install Node.js](https://github.com/joyent/node/wiki/Installation)  on your platform of choice.
* Download Chilly Framework, using for instance `git clone https://github.com/TajPelc/Chilly-Framework.git` or by [downloading a zip](https://github.com/TajPelc/Chilly-Framework/zipball/master).
* You are ready to go, start the server with `node server.js` from the folder where you extracted the files.

## Structure ##
This is a basic structure for a Chilly Framework project. It's separated to a back (protected) and a front end (public).

```
framework
  chilly-0.2.js     // Chilly Framework back end script
node_modules        // additional Node.js modules
protected           // back end files
  actions.js        // define your actions
  config.js         // server and game config
  helpers.js        // define custom helper functions
  models.js         // define your models
public              // static content served by the web server
  js
    libraries
      chilly-0.2.js // Chilly Framework front end script
  css
  img
server.js           // starts the server
```

## How to use it ##


###Front end###
______________________________________________

Start by creating an index.html file in `/public/index.html`, then run the server with `node server.js`. Navigate to `http://localhost:3000/` and you should see the contents of the file.

Include the Chilly Framework front end library with `<script src="/js/libraries/chilly-0.2.js" />`. Create your own JavaScript file, for example game.js and include it.

To start Chilly Framework call `Chilly.init();`, it should be called only after the windows has loaded. This triggers an `init` event.

To start listening for updates on all defined channels (add the default called update), call `Chilly.connect()`.

To bind events use:

```javascript
Chilly.bind('init', function(e) { ... /* load assets, sprites, sounds, etc */ });
```

To trigger custom events use:

```javascript
Chilly.trigger('eventName', customData);
```

To issue request to the back-end use:

```javascript
Chilly.request('actionName', {
  data: { // optional
    custom1: 'a',
    custom2: 'b'
  },
  success: function(data) {
     ... // do stuff
  },
  error: function(data) { // optional
     ... // display errors
  }
});
```

Define code for every action that is transmitted over the update channel using:

```javascript
Chilly.onUpdate('gameOver', function(data) {
   ... // display the score
});
```

Listen to additional channels created on the back end using:

```javascript
Chilly.listen('chat', function(data){
  ... // display broadcasted message
});
```


###Back end###
______________________________________________

Open `actions.js` and define additional update channels with:

```javascript
Chilly.createChannel('channelName');
```

Open `actions.js` and define responses to requests send from the front end by `Chilly.request` with:

```javascript
Chilly.action('login', {
    user: function(request) { // if user is already logged in
        ... // respond with an error
        request.respond.error('Already logged in.');
    },
    anonymous: function(request) { // (optional)
	    ... // log the user in
        request.respond.ok('You are now logged in.');
    }
});
```

Open `models.js` and extend Game.js and define your own models that will be used by the game.

## Additional help ##
Check the source code comments for both chilly-0.2.js files for more information. Visit [chillyframework.com](http://chillyframework.com/).

## License ##
Copyright 2012, Taj Pelc

Dual licensed under the MIT or GPL Version 2 licenses.
[http://chillyframework.org/license/](http://chillyframework.org/license/)
