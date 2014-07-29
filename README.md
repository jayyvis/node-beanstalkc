Easy to use beanstalkd client library for node.js
=================================================

[node-beanstalk-client](https://github.com/benlund/node-beanstalk-client) was a nice beanstalkd client but was written in coffescript and left unmaintained with bugs.

I was using this library for quite sometime and turned it as beanstalkc,
	- simple api to use
	- actively maintained
	- and its javascript

###Installation

```
npm install beanstalkc
```

###Example

```
var beanstalkc = require('beanstalkc');

beanstalkc.connect('127.0.0.1:11300', function(err, conn) {
  var job_data = {"name": "beanstalkc"};
  
  conn.put(0, 0, 1, JSON.stringify(job_data), function(err, job_id) {
    console.log('put job: ' + job_id);

    conn.reserve(function(err, job_id, job_json) {
      console.log('got job: ' + job_id);
      console.log('got job data: ' + job_json);
      console.log('module name is ' + JSON.parse(job_json).name);
      
      conn.destroy(job_id, function(err) {
		console.log('destroyed job');
      });
    });

  });
});
```

