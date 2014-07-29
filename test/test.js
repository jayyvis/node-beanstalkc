var assert = require('assert');

var client = require('../beanstalk_client').Client;
var connection;

var job_data = {
	"type" : "test"
};

locals = {};


describe('beanstalkc', function() {
	before('connect()', function(done) {
		client.connect('127.0.0.1:4242', function(err, conn) {
			assert(!err);
			connection = conn;
			done();
		});
	});
	
	describe('put()', function() {
		it('puts a job into the tube', function(done) {
			connection.put(0, 0, 1, JSON.stringify(job_data), function(err, job_id) {
				assert(!err);
				done();
			});
		});
	});
	
	describe('reserve()', function() {
		it('gets a ready job from the tube', function(done) {
			connection.reserve(function(err, job_id, job_json) {
				assert(!err);
				assert(job_id);
				assert.equal(job_json, JSON.stringify(job_data));

				locals.job_id = job_id;
				
				done();
			});
		});
	})
	
	describe('destroy()', function() {
		it('destroys given job from the tube', function(done) {
			connection.destroy(locals.job_id, function(err) {
				assert(!err);
				done();
			});
		});
	});
})

