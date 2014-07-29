
var net = require('net');
var slice = Array.prototype.slice;


var Client = {
	DEFAULT_ADDR : '127.0.0.1',
	DEFAULT_PORT : 11300,
	LOWEST_PRIORITY : 4294967295,
	
	connect : function(server, callback) {
		var server_tokens, host, port;
		
		if (server) {
			server_tokens = server.split(':');
			host = server_tokens[0];
			port = server_tokens[1];
		}
		
		//use defaults for address/port if not specified
		host || (host = Client.DEFAULT_ADDR);
		port || (port = Client.DEFAULT_PORT);

		//establish tcp connection
		var stream = net.createConnection(port, host);
		
		stream.on('connect', function() {
			return callback(null, new Connection(stream));
		});
		
		stream.on('error', function(err) {
			return callback(err);
		});
		
		return stream.on('close', function(has_error) {
		});
	}
};


/**
 * Connection
 */
function Connection(stream) {
	this.stream = stream;
	this.buffer = '';
	this.handlers = [];
	
	var self = this;
	self.stream.on('data', function(data) {
		self.buffer += data;
		self._tryToRespond();
	});
};

Connection.prototype._tryToRespond = function() {
	var handler = this.handlers[0];
	
	var response_handler = handler[0];
	var callback = handler[1];
	
	response_handler.handle(this.buffer);
	
	if (response_handler.complete) {
		this.buffer = '';
		this.handlers.shift();
		
		if (response_handler.success) {
			callback.apply(null, [false].concat(response_handler.args));
		} else {
			callback.call(null, response_handler.args[0]);
		}
	} else {
		response_handler.reset();
	}
};

Connection.prototype.send = function() {
	var args = slice.call(arguments);
	this.stream.write(args.join(' ') + "\r\n");
};

Connection.prototype.end = function() {
	this.stream.end();
};

//submitting jobs
Connection.prototype.use = makeCommandMethod('use', 'USING');
Connection.prototype.put = makeCommandMethod('put', 'INSERTED', true);
//handling jobs
Connection.prototype.watch = makeCommandMethod('watch', 'WATCHING');
Connection.prototype.ignore = makeCommandMethod('ignore', 'WATCHING');
Connection.prototype.reserve = makeCommandMethod('reserve', 'RESERVED');
Connection.prototype.reserve_with_timeout = makeCommandMethod('reserve-with-timeout', 'RESERVED');
Connection.prototype.destroy = makeCommandMethod('delete', 'DELETED');
Connection.prototype.release = makeCommandMethod('release', 'RELEASED');
Connection.prototype.bury = makeCommandMethod('bury', 'BURIED');
Connection.prototype.touch = makeCommandMethod('touch', 'TOUCHED');
//other stuff
Connection.prototype.peek = makeCommandMethod('peek', 'FOUND');
Connection.prototype.peek_ready = makeCommandMethod('peek-ready', 'FOUND');
Connection.prototype.peek_delayed = makeCommandMethod('peek-delayed', 'FOUND');
Connection.prototype.peek_buried = makeCommandMethod('peek-buried', 'FOUND');
Connection.prototype.kick = makeCommandMethod('kick', 'KICKED');
Connection.prototype.stats_job = makeCommandMethod('stats-job', 'OK');
Connection.prototype.stats_tube = makeCommandMethod('stats-tube', 'OK');
Connection.prototype.stats = makeCommandMethod('stats', 'OK');


function makeCommandMethod(command_name, expected_response, sends_data) {
	return function() {
		var callback = arguments[arguments.length - 1];
		var args = slice.call(arguments, 0, arguments.length - 1);
		
		args.unshift(command_name);
		
		var data;
		
		if (sends_data) {
			data = args.pop();
			args.push(data.length);
		}
		
		this.send.apply(this, args);
		
		if (data) {
			this.send(data)
		}
		
		var handler = [new ResponseHandler(expected_response), callback];
		
		return this.handlers.push(handler);
	};
};



/**
 * Response handler
 */
function ResponseHandler(success_code) {
	this.success_code = success_code;
};

ResponseHandler.prototype.reset = function() {
	this.complete = false;
	this.success = false;
	this.args = undefined;
	this.header = undefined;
	this.body = undefined;
};

ResponseHandler.prototype.CODES_REQUIRING_BODY = {
	'RESERVED' : true
};

ResponseHandler.prototype.handle = function(data) {
	var i = data.indexOf("\r\n");
	
	if (i < 0) {
		return; //response is not yet complete
	}

	this.header = data.substr(0, i);
	this.body = data.substr(i + 2);
	this.args = this.header.split(' ');
	
	var code = this.args[0];
	
	if (code === this.success_code) {
		this.args.shift();
		//don't include the code in the success args, but do in the err args
		this.success = true;
	}
	
	if ((this.CODES_REQUIRING_BODY[code])) {
		this.parseBody();
	} else {
		this.complete = true;
	}
};

ResponseHandler.prototype.parseBody = function() {
	if (! hasValue(this.body)) {
		return;
	}
	
	var last_arg = this.args[this.args.length - 1];
	
	var	body_length = parseInt(last_arg, 10);
		
	if (this.body.length === (body_length + 2)) {
		this.args.pop();
		//removed the length and add the data
		this.args.push(this.body.substr(0, this.body.length - 2));
		this.complete = true;
	}
};

/**
 * helpers
 */
function hasValue(v) {
	return (typeof v !== 'undefined' && v !== null);
}


/**
 * exports
 */
exports.Client = Client;

