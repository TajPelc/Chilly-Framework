/*
 * Chilly Framework v0.2.1: JavaScript Library
 * http://chillyframework.com/
 *
 * Chilly front end
 *
 * Copyright 2012, Taj Pelc
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://chillyframework.org/license
 */
(function( window, undefined ) {
    'use strict';

    /**
     * Chilly framework front-end core
     */
    window.Chilly = (function() {
        var channels = {}, // game channels
            actions = {}, // actions
            handlers = {}; // event handlers

        return {
            /**
             * Has a disconnect occurred?
             */
            disconnected: false,

            /**
             * Create a XMLHttpRequest to the Chilly Framework backend
             * Accepts the action name, (optional) object with the following params:
             * - obj.data => JSON object of key, value pairs with data that will be sent
             * - obj.success (optional) => method executed on success, data param passed to it
             * - obj.error (optional) => method executed on failure, data param passed
             * - obj.url (optional) => URL for the request (defaults to root '/action')
             * @param action
             * @param obj
             */
            request: function(action, obj) {
                obj = obj || {};
                var oXHR, response, url = '/action', that = this, data = {
                    request: action,
                    data: obj.data
                };
                if(obj.url) {
                    url = obj.url;
                }
                if (window.XMLHttpRequest) {
                    oXHR = new XMLHttpRequest();
                } else if (window.ActiveXObject) {
                    oXHR = new ActiveXObject('Microsoft.XMLHTTP'); // IE legacy support
                }
                oXHR.open('POST', url, true);
                oXHR.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                oXHR.onreadystatechange = function(e) {
                    if(oXHR.readyState === 4) {
                        if(oXHR.status === 200) {
                            response = JSON.parse(oXHR.responseText);
                            if(!response.status === undefined) {
                                that.debug.log('Invalid response to request, no status returned.');
                                return;
                            }
                            if(response.status === 'OK') {
                                if(obj.success && typeof obj.success === 'function') {
                                    obj.success(response);
                                }
                                return;
                            }
                            else {
                                if(obj.error && typeof obj.error === 'function') {
                                    obj.error(response);
                                }
                                return;
                            }
                        }
                        if(oXHR.status === 0) {
                            // only trigger the disconnect once
                            if(!that.disconnected) {
                                that.trigger('disconnect');
                                that.disconnected = true;
                            }
                        }
                        that.debug.log('Request to ' + url + ' failed: ' + oXHR.statusText);
                    }
                };
                oXHR.send(JSON.stringify(data));
            },

            /**
             * Used to extend Chilly framework with custom methods and attributes.
             * The methods and attributes are appended to the Chilly object.
             * @param obj
             */
            extend: function (obj) {
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
            },

            /**
             * Bind an event to chilly framework
             *
             * @param event
             * @param fnc
             */
            bind: function(event, fnc) {
                if(handlers[event]) {
                    throw {
                        name: 'HandlerOverrideException',
                        message: 'Cannot override an existing event handlers!'
                    };
                }
                handlers[event] = fnc;
            },

            /**
             * Trigger an event
             *
             * @param event
             * @param data
             */
            trigger: function(event, data) {
                Chilly.debug.log(event);
                if(typeof handlers[event] === 'function') {
                    handlers[event].call(this, data);
                }
            },

            /**
             * Define what happens when an update action is broadcast over the update channel
             *
             * Example:
             * Chilly.onUpdate('move', function(data) {
             *     ... // move tank
             * });
             *
             * @param action
             * @param methods
             */
            onUpdate: function(action, methods) {
                if(actions[action]) {
                    throw {
                        name: 'ActionOverrideException',
                        message: 'Cannot override an existing action!'
                    };
                }
                actions[action] = methods;
            },

            /**
             * Get an action
             * @param name
             */
            getAction: function(name) {
                return actions[name] || false;
            },

            /**
             * Listen to a channels
             *
             * Creates a recursive long-polling request, on success triggers a function and passes the data
             * If connection is lost, the user is prompted to refresh the page
             *
             * Example:
             * Chilly.listen('chat', function(data) {
             *     ... // display the message in the chat log (will trigger every time an update is received)
             * });
             *
             * @param channel
             * @param fnc
             */
            listen: function(channel, fnc) {
                var that = this;
                channels[channel] = (function(data) {
                    return function() {
                        that.request(channel, {
                            success: function(rv) {
                                data.call(that, rv.data);
                                channels[channel](); // reconnect
                            }
                        });
                    };
                })(fnc);
            },

            /**
             * Start long polling for updates
             */
            connect: function() {
                setTimeout(function() {
                    for(var name in channels) {
                        if(channels.hasOwnProperty(name)){
                            channels[name]();
                        }
                    }
                }, 500);
            },

            /**
             * Initialize the Chilly framework
             */
            init: function() {
                this.trigger('init');
            },

            /**
             * Debug methods
             */
            debug: {
                mode: false,
                alert: function(message) {
                    if(this.mode) {
                        alert(message);
                    }
                },
                log: function(message) {
                    if(this.mode) {
                        console.log(message);
                    }
                }
            }
        };
    })();

    /**
     * Synchronizes the game between clients through the update channel
     */
    Chilly.listen('update', function(data) {
        this.trigger('update', data);

        // check if an action handler is defined
        if(!Chilly.getAction(data.action)) {
            throw {
                name: 'UpdateActionException',
                message: 'Update action not defined'
            }
        }

        // call the defined action for this update
        Chilly.getAction(data.action).call(this, data);
    });
})(window);