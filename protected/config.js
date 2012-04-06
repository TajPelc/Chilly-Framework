/**
 * Chilly Config
 */
module.exports = {
    /**
     * Core config
     */
    core: {
        httpStaticCache: 24*60*60*1000, // cache static files for one day
        port: 3000, // run server on port 3000
        debug: true, // enable debug mode
        sessionSecret: 'VxbfIsdxxuxvl2NqWh01', // choose a random string
        clientTimeout: 10*60*1000, // if no requests were made in the last 10 minutes, consider the client dropped
        garbageCollectorInterval: 60*60*1000 // remove inactive clients every hour
    },
    /**
     * Game config
     */
    game: {
    }
};