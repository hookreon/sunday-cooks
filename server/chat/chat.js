var db            = require( '../bookshelf/config' ),
    cookieParser  = require( 'cookie-parser' );
                    require( '../bookshelf/models/chatmessage' );
                    require( '../bookshelf/collections/chatmessages' );
                    require( '../bookshelf/models/event' );
                    require( '../bookshelf/models/user' );

module.exports = function( app, io, passport, sessionStore ) {

  io.sockets.on( 'connection', function ( socket ) {
    var userObj = socket.client.request.user,
        eventId;

    if ( userObj !== undefined ) {
      // emit user's first and last names from individual
      socket.emit( 'user name', { first_name: userObj.get( 'first_name' ), last_name: userObj.get( 'last_name' ) } );
      process.verb( userObj.get( 'first_name' ), 'has joined the chatroom.' );
    } else { process.verb( 'A user has joined the chatroom.' ); }

    // new chat event
    socket.on( 'event id', function( id ) {
      eventId = id;
      socket.join( id );
      db.model( 'Event' ).fetchEventbyId( id )
      .then( function ( event ) {
        return event.related( 'chatMessages' ).fetch();
      })
      .then( function ( messages ) {
        messages.forEach( function ( message ) {
          var messageObj = message.toJSON();

          db.model( 'User' ).fetchUserbyId( message.get( 'user_id' ) )
          .then( function( user ) {
            messageObj.name = user.get( 'first_name' ) + ' ' + user.get( 'last_name' );
            socket.emit( 'new chat', messageObj );
          });
        });
      });
    });

    socket.on( 'new chat', function( chat ) {
      if ( userObj ) {
        process.verb( 'New chat received from client:', { user: userObj.get( 'first_name' ), text: chat } );
        var messageObj;
        db.model( 'ChatMessage' ).newMessage( chat, eventId, userObj )
        .then( function ( message ) {
          messageObj = message.toJSON();
          return db.model( 'User' ).fetchUserbyId( messageObj.user_id );
        })
        .then( function ( user ) {
          messageObj.name = user.get( 'first_name' ) + ' ' + user.get( 'last_name' );
          io.to( eventId ).emit( 'new chat', messageObj );
        });
      } else {
        process.verb( "Unauthorized user tried to send a message." );
      }
    });

    socket.emit( 'event id?');
    // disconnect event
    socket.on('disconnect', function () {
      var firstName = userObj && userObj.get( 'first_name' ) || "A user";
      process.verb( firstName, 'has left the chatroom' );
    });

  });

  // io middleware
  io.use( function ( socket, next ) {
    cookieParser ( process.env.session_secret )( socket.request, {}, function ( err ) {
      var sessionId = socket.request.signedCookies[ process.env.session_key ];

      sessionStore.get( sessionId, function ( err, session ) {
        socket.request.session = session;
        passport.initialize()( socket.request, {}, function () {
          passport.session()( socket.request, {}, function () {
            next ( null, true );
          });
        });
      });
    });
  });

};
