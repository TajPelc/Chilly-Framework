var connect = require('connect');
var config = require('./protected/config');
var Chilly = require('./framework/chilly-0.2');

/**
 * Creates the server
 */
connect()
    //.use(connect.logger({format: ':method :url'}))
    .use(connect.static(__dirname + '/public', { maxAge: config.core.httpStaticCache }))
    .use(connect.cookieParser())
    .use(connect.bodyParser())
    .use(connect.session({secret: config.core.sessionSecret}))
    .use('/action', Chilly.requestDispatcher)
    .listen(config.core.port);