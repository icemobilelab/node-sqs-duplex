var assert = require('assert')
var AWS = require('aws-sdk')
var aws = new AWS.SQS({region: 'eu-west-1'})
var sqs = require('../')(aws)

var create = function(name, cb) {
  var options = {
    QueueName: name
  }
  aws.createQueue(options, cb)
}

var queueTest = function() {
  before(function(done) {
    var name = this.name = 'test-' + Date.now()
    this.stream = sqs(name, {log: console.log.bind(console)})
    var self = this
    create(name, function(err, data) {
      self.queueUrl = data.QueueUrl
      done()
    })
  })

  after(function(done) {
    aws.deleteQueue({QueueUrl: this.queueUrl}, done)
  })
}

describe('writing', function() {
  queueTest()
  it('writes', function(done) {
    this.timeout(5000)
    this.stream.write('hello', done)
  })
})

describe('reading', function() {
  queueTest()
  it('reads', function(done) {
    var stream = this.stream
    stream.write('test', function() {
      stream.once('readable', function() {
        var msg = stream.read()
        assert(msg, 'should have returned a message')
        assert.equal(msg.data, 'test')
        stream.close()
        done()
      })
    })
  })
})

describe('reading after an error', function() {
  queueTest()
  it('reads after an error', function(done) {
    this.timeout(20000)
    var stream = this.stream

    var remember = stream.sqs.receiveMessage;

    stream.sqs.receiveMessage = function(options, cb) {
        cb({
            code: 'InternalError'
        });
    }

    stream.retryTimeout = 500;

    stream.write('test', function() {

      stream.on('retryable-error', function(err) {

        assert(err, 'should have returned an error')
        assert(err.code == 'InternalError', 'error code is wrong')
        stream.sqs.receiveMessage = remember;
      })

      stream.once('readable', function() {

        var msg = stream.read()
                console.log(msg)
        assert(msg, 'should have returned a message')
        assert(msg.data == 'test', 'message is wrong')
        stream.close()
        done()
      })
    })
  })
})

describe('reading empty', function() {
  queueTest()
  it('never returns anything', function(done) {
    this.timeout(20000)
    var self = this
    this.stream.once('readable', function() {
      self.stream.close()
      done()
    })
    setTimeout(function() {
      self.stream.write('test')
    }, 5000)
  })
})
