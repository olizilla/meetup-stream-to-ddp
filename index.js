var hyperquest = require('hyperquest')
var split = require('split')
var through = require('through')
var DDPClient = require('ddp')

var ddpclient = new DDPClient({
  host: process.argv[2] || "localhost",
  port: 3000,
  /* optional: */
  auto_reconnect: true,
  auto_reconnect_timer: 500,
  use_ejson: true,  // default is false
  use_ssl: false, //connect to SSL server,
  use_ssl_strict: true, //Set to false if you have root ca trouble.
  maintain_collections: true //Set to false to maintain your own collections.
})


ddpclient.connect(function(error) {
  console.log('connected!');

  if (error) {
    console.log('DDP connection error!');
    return;
  }

  // ddpclient.on('message', function(msg) {
  //   console.log("ddp message: " + msg);
  // });

  ddpclient.subscribe('groups', [], function() {
    followEventStream(ddpclient.collections.groups)
  });
})

function followEventStream(groups) {

  hyperquest.get('http://stream.meetup.com/2/open_events', {})
  .pipe(split())
  .pipe(through(function write(data) {
    try {
        var event = JSON.parse(data.toString())
        //event.mtime,
        console.log(event.group.urlname, event.name, event.status)

        if (event.status !== 'deleted') return
        if (!event.group || !event.group.urlname) return

        if (!Object.keys(groups)
              .map(function (key){ return groups[key] })
              .some(function (g) { return g.urlname == event.group.urlname })) return

        // we have a winner
        deleteEvent(event)

    } catch (e) {
      // alas...
      console.error(e)
    }
  },
  function end () {
    this.queue(null)
  }))
}

function deleteEvent(event) {
  if(!event || !event.id) return
  ddpclient.call('deleteEvent', [event.id], function(err, result) {
    if(err) return console.error(err)
    console.log('deleted event', event.group.urlname, event.name)
  });
}
