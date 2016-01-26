var Stream = require('stream')
var splicer = require('stream-splicer')

function Parser() {
}

function getHeight() {
  return Stream.Transform({
    objectMode: true,
    transform: function (person, enc, next) {
      person.height = 100 + Math.ceil(Math.random() * 150)
      next(null, person)
    },
  })
}

function getWeight() {
  return Stream.Transform({
    objectMode: true,
    transform: function (person, enc, next) {
      person.weight = person.height * 0.4 + 10 * Math.ceil(Math.random())
      next(null, person)
    },
  })
}

