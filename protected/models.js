/**
 * Define models
 *
 * @param Chilly
 * @param config
 * @param helpers
 */
module.exports = function(Chilly, config, helpers) {
    'use strict';

    /**
     * Define game
     */
    var Game = Object.create({}, {
        id: {
            value: null,
            writable: true
        },
        init: {
            value: function(id) {
                this.id = id;
            }
        }
    });

    /**
     * Export the models
     */
    return {
        Game: Game
    };
};