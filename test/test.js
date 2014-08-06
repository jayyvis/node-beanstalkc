var assert = require('assert');
var beanstalkc = require('../index');

var connection;

var job_data = {
	"type" : "test"
};

locals = {};


describe('beanstalkc:', function() {
	before('connect()', function(done) {
		beanstalkc.connect('127.0.0.1:4242', function(err, conn) {
			assert(!err, 'err:'+err);
			assert(conn);
			connection = conn;
			done();
		});
	});
	
	describe('put()', function() {
		it('puts a job into the tube', function(done) {
			connection.put(0, 0, 1, JSON.stringify(job_data), function(err, job_id) {
				assert(!err, 'err:'+err);
				assert(job_id);
				done();
			});
		});
	});
	
	describe('reserve()', function() {
		it('gets a ready job from the tube', function(done) {
			connection.reserve(function(err, job_id, job_json) {
				assert(!err, 'err:'+err);
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
				assert(!err, 'err:'+err);
				done();
			});
		});
	});
	
	describe('utf8 jobs:', function() {
		it('puts utf8 string', function(done) {
			connection.put(0, 0, 1, 'latin À', function(err, job_id) {
				assert(!err, 'err:'+err);
				assert(job_id);
				done();
			});
		});
		
		it('gets utf8 string', function(done) {
			connection.reserve(function(err, job_id, job_string) {
				assert(!err, 'err:'+err);
				assert(job_id);
				assert.equal(job_string, 'latin À');
				
				connection.destroy(job_id, function(err) {
					assert(!err, 'err:'+err);
					done();
				});
			});
		});
	})
	
	describe('parallel jobs:', function() {
		it('puts 3 jobs parallely', function(done) {
			var count = 0;
			
			connection.put(0, 0, 1, 'job1', function(err, job_id) {
				assert(!err, 'err:'+err);
				assert(job_id);
				
				count += 1;
				if (count === 3) done();
			});
			
			connection.put(0, 0, 1, 'job2', function(err, job_id) {
				assert(!err, 'err:'+err);
				assert(job_id);
				
				count += 1;
				if (count === 3) done();
			});

			connection.put(0, 0, 1, 'job3', function(err, job_id) {
				assert(!err, 'err:'+err);
				assert(job_id);

				count += 1;
				if (count === 3) done();
			});
		});
	})
	
})


