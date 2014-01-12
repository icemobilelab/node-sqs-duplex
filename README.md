# sqs-stream

An opinionated duplex stream interface on top of Amazon's simple queuing service (SQS).  Writing to this stream writes a new message to the queue, and reading from this stream pops a message off the queue.  I'll elaborate in code on how these things behave exactly.


__sqs-stream__ doesn't depend on `npm install aws-sdk` in a `package.json` type of way, but rather in a _dependency injection_ type of way.  You have to pass an instance of `new AWS.SQS()` into this module so it has a reference of which amazon instance you'd like to use.

## examples

### creating
```js
//require whichever version of aws-skd you're using
var AWS = require('aws-sdk')

//pass an instance of the SQS api client into
//the sqs-stream module to create a factory function
//which returns new streams associated to queues
var sqs = require('sqs-stream')(new AWS.SQS())

//use the factory function to create a new
//duplex stream for a given queue name
var stream = sqs('my-queue-name')
```

### writing

```js
var AWS = require('aws-sdk')
var sqs = require('sqs')(new AWS.SQS())

var stream = sqs('my-queue')

stream.write('some message')  //write a message to the queue
                              //if the write fails, stream will emit an error


stream.write('some other message', function(err) {
  //wrote a message to the queue and called the callback
  //when the message has been written.  If the write fails
  //the callback will be called with an error argument
})
```

### reading

# TODO - not complete - edit
