var db          = require( '../../bookshelf/config' ),
    Promise     = require( 'bluebird' );
                  require( '../../bookshelf/models/step' );
                  require( '../../bookshelf/models/user' );
                  require( '../../bookshelf/models/stepuser' );

module.exports = function ( app, router ) {
  router.post( '/events/:eventid/step/:stepid/mark', function ( req, res, next ) {
    var eventid = req.params.eventid;
    var stepid = req.params.stepid;

    Promise.join( db.model( 'Event' ).fetchEvent( eventid ), db.model( 'Step' ).fetchStepbyId( stepid ),
      function ( event, step ) {
        if ( !event ) { res.sendStatus( 400 ); return Promise.reject( new Error( "invalid event id specified" ) ); }
        else if ( !step ) { res.sendStatus( 400 ); return Promise.reject( new Error( "invalid step id specified" ) ); }
        else {
          return step.related( 'done' ).where( { step_id: stepid, user_id: req.user.get( 'id' ) } ).fetch();
        }
    })
    .then( function ( step_user ) {
      var done = false;
      if ( step_user ) { done = step_user.pivot.get( 'done' ); }
      else {
        done = true;

        return db.model( 'StepUser' ).newStepUser( { step_id: stepid, user_id: req.user.get( 'id' ), done: true } ).save();
      }

      res.json( { id: stepid, done: done } );
    });
  });
};