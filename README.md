beanstalkc
==========
[node-beanstalk-client](https://github.com/benlund/node-beanstalk-client) was a nice beanstalkd client for node.js but left unmaintained with bugs. Further it was written in coffee script, effectively limiting the contributions.

I took the coffee generated js, refactored into a readable code, added utf8 support, unit tests and fixed critical bugs.

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

