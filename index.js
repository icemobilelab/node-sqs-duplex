var util = require('util')
var Duplex = require('stream').Duplex
var dogpile = require('dogpile')

var SqsStream = function(sqs, queue, options) {
  this.sqs = sqs
  this.popDelay = 1
  this.queue = queue
  this.log = (options||0).log || function() {}
  //default maxSleep is 15 seconds
  this.maxSleep = (options||0).maxSleep || (1000 * 60 * 15)
  var self = this
  this.queueUrl = dogpile(function(cb) {
    self.log('getting queue url for queue', queue)
    sqs.getQueueUrl({
      QueueName: queue
    }, cb)
  })
  Duplex.call(this, {
    objectMode: true,
    highWaterMark: (options||0).highWaterMark || 10
  })
}

util.inherits(SqsStream, Duplex)

SqsStream.prototype._write = function(msg, encoding, cb) {
  var self = this
  this.queueUrl(function(err, data) {
    if(err) { return self.emit('error', err) }
    var options = {
      QueueUrl: data.QueueUrl,
      MessageBody: typeof msg == 'string' ? msg : JSON.stringify(msg)
    }
    self.log('pushing message')
    self.sqs.sendMessage(options, cb)
  })
}

var Message = function(msg) {
  if(!(this instanceof Message)) return new Message(msg);
  this.message = msg
  this.data = msg.Body
}

SqsStream.prototype._pop = function(queueUrl) {
  if(this.popping || this.closed) return;
  this.popping = true
  var self = this
  var options = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10
  }
  self.log('popping message')

  self.sqs.receiveMessage(options, function(err, data) {
    if(err) { return self.emit('error', err) }

    //read from stream in loop
    if(!(data.Messages||0).length) {
      self.popDelay = Math.min(self.maxSleep, self.popDelay * 10)
      self.log('pop 0, sleeping for ' + self.popDelay)
      self.tid = setTimeout(function() {
        self.log('trying to re-read from empty queue')
        self.popping = false
        self._pop(queueUrl)
      }, self.popDelay)
      return
    }

    self.popping = false
    self.popDelay = 1
    self.log('pop', data.Messages.length)
    for(var i = 0; i < data.Messages.length; i++) {
      var msg = data.Messages[i]
      self.push(new Message(msg))
    }
  })
}

SqsStream.prototype._read = function(n) {
  //n is ignored in object mode
  var self = this
  this.queueUrl(function(err, data) {
    if(err) { return self.emit('error', err) }
    self._pop(data.QueueUrl)
  })
}

SqsStream.prototype.close = function() {
  this.closed = true
  if(this.tid) {
    this.log('clear pop timeout')
    clearTimeout(this.tid)
  }
}

module.exports = function(sqs) {
  return function(queueName, options) {
    return new SqsStream(sqs, queueName, options)
  }
}
