/*
 * Chilly Framework v0.2.1: JavaScript Library
 * http://chillyframework.com/
 *
 * Chilly back end
 *
 * Copyright 2012, Taj Pelc
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://chillyframework.org/license
 */
var Chilly = module.exports = (function() {
    'use strict';

    // vars
    var Chilly, models, actions, config = require('../protected/config'), helpers = require('../protected/helpers'), handlers = {};

    /**
     * Chilly back end
     */
    Chilly = Object.create(null, {
        /**
         * Holds the game instances
         */
        Games: {
            value: {}
        },

        /**
         * Holds the clients
         */
        Clients: {
            value: {}
        },

        /**
         * Holds open connections listening to actions
         */
        Connections: {
            value: {}
        },

        /**
         * Message queue
         */
        MessageQueue: {
            value: {}
        },

        /**
         * Holds the actions
         */
        actions: {
            value: {}
        },

        /**
         * Init Chilly framework
         */
        init: {
            value: function() {
                return this;
            }
        },

        /**
         * Used to extend Chilly framework with custom methods and attributes.
         * The methods and attributes are appended to the Chilly object.
         * @param obj
         */
        extend: {
            value: function (obj) {
                var that = this, key;
                if (!obj) {
                    return that;
                }
                for (key in obj) {
                    if (that === obj[key]) {
                        continue;
                    }
                    that[key] = obj[key];
                }
                return that;
            }
        },

        /**
         * Bind an event to Chilly framework
         *
         * @param event
         * @param fnc
         */
        bind: {
            value: function(event, fnc) {
                if(handlers[event]) {
                    throw {
                        name: 'HandlerOverrideException',
                        message: 'Cannot override an existing event handlers!'
                    };
                }
                handlers[event] = fnc;
            }
        },

        /**
         * Trigger an event
         *
         * @param event
         * @param data
         */
        trigger: {
            value: function(event, data) {
                if(typeof handlers[event] === 'function') {
                    handlers[event].call(this, data);
                }
            }
        },

        /**
         * Chilly framework request interface is a collection of shortcuts wrapping native node request and response objects
         * @param ctx
         */
        request: {
            value: {
                init: function(ctx) {
                    var request = this;
                    this.req = ctx.req;
                    this.res = ctx.res;
                    this.username = 'anonymous';
                    this.action = request.req.body.request; // action that created this request

                    /**
                     * Respond to a request
                     */
                    this.respond = (function() {
                        return {
                            ok: function(data) {
                                this.end('OK', data);
                            },
                            error: function(data) {
                                this.end('error', data);
                            },
                            end: function(status, data) {
                                request.res.writeHead(200, {'Content-Type': 'application/json'});
                                request.res.end(JSON.stringify({status: status, data: data}));
                            }
                        }
                    })();

                    /**
                     * Checks if the user is logged in
                     */
                    this.isLoggedIn = function() {
                        return this.session.get('auth') === true;
                    };

                    /**
                     * Session management shortcuts
                     */
                    this.session = (function() {
                        return {
                            /**
                             * Get a session param
                             * @param key
                             */
                            get: function(key) {
                                if(request.req.session && request.req.session[key]) {
                                    return request.req.session[key];
                                }
                                return false;
                            },
                            /**
                             * Set a session param
                             * @param key
                             * @param data
                             */
                            set: function(key, data) {
                                if(request.req.session) {
                                    request.req.session[key] = data;
                                    return;
                                }
                                throw {
                                    name: 'ChillySessionException',
                                    message: 'Session does not exist'
                                }
                            }
                        }
                    })();


                    // data shortcut
                    if(request.req.body.data) {
                        this.data = request.req.body.data;
                    }

                    // if this is a new session, create a unique id
                    if(!this.session.get('clientId')) {
                        this.session.set('clientId', Chilly.generateClientId());
                        Chilly.addClient(this.session.get('clientId'));
                    } else {
                        Chilly.Clients[this.session.get('clientId')]['lastRequest'] = new Date();
                    }

                    // get game
                    this.getGame = function() {
                        return Chilly.getGame(this.session.get('gameId'));
                    };

                    // get game
                    this.getClientId = function() {
                        return this.session.get('clientId');
                    };

                    // override the default username
                    if(this.isLoggedIn()) {
                        this.username = this.session.get('username');
                    }

                    return this;
                }
            }
        },

        /**
         * Push a message to a list of clients through a channel
         * @param obj
         *
         * The object should contain an array of recipients, the channel through which the message is going to be pushed
         * and the data object, which can contain an arbitrary amount of data.
         *
         * Example usage:
         * Chilly.push({
         *    recipients: ['clientId1', 'clientId2', 'clientId3'],
         *    channel: 'chat',
         *    data: {
         *        player: 'player1',
         *        message: 'A dummy message.',
         *        datetime: new Date()
         *    }
         * });
         */
        push: {
            value: function(obj) {
                if(!Array.isArray(obj['recipients'])) {
                    throw {
                        name: 'ChillyRecipientsException',
                        message: 'Recipients is not an array'
                    }
                }
                obj['recipients'].forEach(function(clientId){
                    this.MessageQueue[clientId] = this.MessageQueue[clientId] || {};
                    this.MessageQueue[clientId][obj.channel] = this.MessageQueue[clientId][obj.channel] || [];
                    this.MessageQueue[clientId][obj.channel].push(obj.data);

                    // try to broadcast if the client is connected
                    if(this.getConnection(clientId, obj.channel)) {
                        this.sendMessage(clientId, obj.channel);
                    }
                }, this);
            }
        },

        /**
         * Get a message from a users message queue and remove it if successful
         * @param clientId
         * @param channel
         */
        getMessage: {
            value: function(clientId, channel) {
                if(this.MessageQueue[clientId] && this.MessageQueue[clientId][channel] && this.MessageQueue[clientId][channel].length > 0) {
                    return this.MessageQueue[clientId][channel].shift();
                }
                return false;
            }
        },

        /**
         * Send a message to a user
         *
         * @param clientId
         * @param channel
         */
        sendMessage: {
            value: function(clientId, channel) {
                var message = this.getMessage(clientId, channel),
                    listener = this.getConnection(clientId, channel);

                if(message && listener) {
                    listener.req.resume();
                    listener.respond.ok(message);
                    this.removeConnection(clientId, channel);
                    return true;
                }
                return false;
            }
        },

        /**
         * Add client
         * @param clientId
         */
        addClient: {
            value: function(clientId) {
                this.Clients[clientId] = {
                    id: clientId,
                    lastRequest: new Date()
                };
                this.Connections[clientId] = {};
            }
        },

        /**
         * Remove client
         * @param clientId
         */
        removeClient: {
            value: function(clientId) {
                delete this.Clients[clientId];
                delete this.Connections[clientId];
            }
        },

        /**
         * Garbage collector
         * - removes inactive clients and connections
         */
        garbageCollector: {
            value: function() {
                setInterval(function() {
                    Object.keys(Chilly.Clients).forEach(function(id) {
                        if(new Date().getTime() - this.Clients[id]['lastRequest'].getTime() > config.core.clientTimeout) {
                            this.removeClient(id);
                        }
                    }, Chilly);
                }, config.core.garbageCollectorInterval);
            }
        },

        /**
         * Freeze a connection and put it into the connections channel until some data is pushed through the channel
         *
         * @param clientId
         * @param channel
         * @param request
         */
        addConnection: {
            value: function(clientId, channel, request) {
                request.req.pause();
                this.Connections[clientId][channel] = request;
                this.sendMessage(clientId, channel);
            }
        },

        /**
         * Remove a frozen connection from the channel
         *
         * @param clientId
         * @param channel
         */
        removeConnection: {
            value: function(clientId, channel) {
                delete this.Connections[clientId][channel];
            }
        },

        /**
         * Get a frozen connection from the user's channel
         *
         * @param clientId
         * @param channel
         */
        getConnection: {
            value: function(clientId, channel) {
                return this.Connections[clientId][channel] || false;
            }
        },


        /**
         * Create a channel through which updates are going to be pushed. Any connection to the channel action
         * is going to be frozen until some data is to be pushed through that channel. You cannot define an action
         * and a channel with the same name.
         *
         * Example use:
         * Chilly.createChannel('chat');
         */
        createChannel: {
            value: function(channel) {
                Chilly.action(channel, {
                    user: function(request) {
                        if(request.session.get('gameId')) {
                            Chilly.addConnection(request.getClientId(), channel, request);
                        } else {
                            request.respond.error('You are not in a game.');
                        }
                    },
                    anonymous: function(request) {
                        request.respond.error('You must be logged in!');
                    }
                });
            }
        },

        /**
         * Define an action that responds to requests. Called from the front end by Chilly.request(),
         * handles the request and responds to it
         *
         * You can define a function that executes when the user is logged in and another one when
         * an user is anonymous. If you don't define the anonymous function, by default an error is returned
         * to non logged-in users telling them to log-in first.
         *
         * Example usage:
         * Chilly.action('buy', {
         *     user: function(request) { // optional
         *          // what to do when user is already logged in
         *          request.respond.error('You have to be logged.');
         *     },
         *     anonymous: function(request) { // optional (defaults to an error)
         *          // login user
         *          ...
         *          request.respond.ok('You have been logged-in');
         *     }
         * });
         *
         * @param name
         * @param obj
         */
        action: {
            value: function(name, obj) {
                if(this.actions[name]) {
                    throw {
                        name: 'ActionOverrideException',
                        message: 'Cannot override an existing (listen) action!'
                    };
                }
                this.actions[name] = obj;
            }
        },

        /**
         * Chilly framework request dispatcher parses the request, creates a request interface and calls a
         * defined action, passing it the request object. Define actions by using the Chilly.action method,
         * send requests from the front end using the Chilly.request method.
         *
         * Note: "this" context in the request dispatcher set not set to Chilly, but to the Server
         *
         * @param req
         * @param res
         * @param next
         */
        requestDispatcher: {
            value: function(req, res, next) {
                var request = Object.create(Chilly.request).init({
                    req: req,
                    res: res
                });

                // only allow POST
                if(req.method !== 'POST') {
                    next();
                    return;
                }

                // param missing
                if(!request.action) {
                    request.respond.error('Missing request parameter');
                    next();
                    return;
                }

                // try to trigger request
                if(Chilly.actions[request.action]) {
                    if(request.isLoggedIn()) {
                        if(Chilly.actions[request.action]['user']) {
                            Chilly.actions[request.action]['user'].call(Chilly, request);
                        }
                    } else {
                        if(Chilly.actions[request.action]['anonymous']) {
                            Chilly.actions[request.action]['anonymous'].call(Chilly, request);
                        } else {
                            request.respond.error('You must be logged in!');
                        }
                    }
                    return;
                }
                next();
            }
        },

        /**
         *  Generates a unique game id string
         *  A game provides a context for grouping users, but is completely arbitrarily defined in the models
         */
        generateGameId: {
            value: function() {
                return this.generateUniqueId(this.Games);
            }
        },

        /**
         *  Generates a unique client id
         *  A game provides a context for grouping users, but is completely arbitrarily defined in the models
         */
        generateClientId: {
            value: function() {
                return this.generateUniqueId(this.Clients);
            }
        },

        /**
         * Generates a unique id
         */
        generateUniqueId: {
            value: function(existing) {
                var key, length = 12;
                if(!Array.isArray(existing)) {
                    if(typeof existing === 'object') {
                        existing = Object.keys(existing);
                    } else {
                        existing = [];
                    }
                }
                do {
                    key = Math.random().toString(36).substring(18 - length);
                    key += new Array(length + 1 - key.length).join('0');
                } while(existing.indexOf(key) > -1);
                return key;
            }
        },

        /**
         * Creates a new game, call its init method and save it to the games object
         */
        createGame: {
            value: function() {
                var id = this.generateGameId();
                this.Games[id] = Object.create(models.Game);
                this.Games[id].init(id);
                return this.Games[id];
            }
        },

        /**
         * Returns a game from the games object if it exists
         */
        getGame: {
            value: function(id) {
                return this.Games[id] || false;
            }
        }
    });

    // include dependencies
    models = require('../protected/models')(Chilly, config, helpers);
    actions = require('../protected/actions')(Chilly, models, config, helpers);

    /**
     * Start cleaning up inactive connections
     */
    Chilly.garbageCollector();

    /**
     * Create the default update channel through which updates are synced between clients
     */
    Chilly.createChannel('update');

    // return Chilly
    return Chilly;
})();