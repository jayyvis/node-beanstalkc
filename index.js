
var net = require('net');


var Client = module.exports = {
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
			//successfully connected. remove the error listener.
			stream.removeAllListeners('error');
			
			return callback(null, new Connection(stream));
		});
		
		stream.on('error', function(err) {
			return callback(err);
		});
	}
};


/**
 * Connection
 */
function Connection(stream) {
	this.stream = stream;
	this.data = '';
	this.handlers = [];
	
	var self = this;
	
	self.stream.on('data', function(data) {
		self.data += data;
		
		while(self.data.length && self._tryToRespond());
	});
	
	//register error listeners on stream
	self.stream.on('error', function(err) {
		self._last_error = err;
	});
	self.stream.on('close', function(had_error) {
		var err = had_error ? self._last_error : new Error('connection closed');
		
		//relay the error to all pending callback's inside handlers
		self.handlers.forEach(function(handler) {
			handler[1](err);
		});
		
		self.handlers = [];
	});
};

Connection.prototype._tryToRespond = function() {
	var handler = this.handlers[0];
	
	var response = handler[0];
	var callback = handler[1];
	
	response.parse(this.data);
	
	if (response.complete) {
		this.data = this.data.substr(response.consumed_data_length);
		this.handlers.shift();
		
		if (response.success) {
			callback.apply(null, [false].concat(response.args));
		} else {
			callback.call(null, response.args[0]);
		}
	}
	
	return response.complete;
};

Connection.prototype.send = function(args) {
	var packet = args.join(' ') + '\r\n';
	this.stream.write(packet);
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
		var args = Array.prototype.slice.call(arguments);
		args.unshift(command_name);

		var callback = args.pop();

		//add a response handler for this command 
		var handler = [new Response(expected_response), callback];
		this.handlers.push(handler);
		
		if (sends_data) {
			//first send header with length of data in bytes. then send data.
			var data = args.pop();
			args.push(Buffer.byteLength(data, 'utf8'));
			this.send(args);
			this.send([data])
		} else {
			this.send(args);
		}
	};
};



/**
 * Response handler
 */
function Response(success_code) {
	this.success_code = success_code;
};

Response.prototype.reset = function() {
	this.complete = false;
	this.success = false;
	this.args = undefined;
	this.header = undefined;
	this.body = undefined;
	this.consumed_data_length = 0;
};

Response.prototype.CODES_REQUIRING_BODY = {
	'RESERVED' : true
};

Response.prototype.parse = function(data) {
	this.reset();
	
	var i = data.indexOf('\r\n');
	
	if (i < 0) {
		return; //response is not yet complete
	}

	this.header = data.substr(0, i);
	this.args = this.header.split(' ');
	
	var code = this.args[0];
	
	if (code === this.success_code) {
		this.args.shift();
		//don't include the code in the success args, but do in the err args
		this.success = true;
	}
	
	if ((this.CODES_REQUIRING_BODY[code])) {
		this.complete = this.parseBody(data.substr(i + 2)) ? true: false;
	} else {
		this.complete = true;
	}
	
	if (this.complete) {
		this.consumed_data_length = this.header.length + 2;
		
		if (this.body) {
			this.consumed_data_length += this.body.length + 2;
		}
	}
};

Response.prototype.parseBody = function(data) {
	var last_arg = this.args[this.args.length - 1];

	var expected_bodylength_inbytes = parseInt(last_arg, 10);
	var available_data_inbytes = Buffer.byteLength(data, 'utf8')
	
	if (available_data_inbytes >= (expected_bodylength_inbytes + 2)) {
		this.body = (new Buffer(data)).toString('utf8', 0, expected_bodylength_inbytes);

		//response args : remove the length and add the data 
		this.args.pop();
		this.args.push(this.body);
		
		return true;
	}
};



