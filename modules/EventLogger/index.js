/*** EventLogger Z-Way Home Automation module ************************************

Version: 1.0.0

-------------------------------------------------------------------------------
Author: Arne de Bree (arne@de-bree.nl)
Description: Log events to csv

******************************************************************************/

// Automation Module constructor

function EventLogger (id, controller) {
    EventLogger.super_.call(this, id, controller);

    this._meters = {};
    this._pollTimer = null;
}

// Module inheritance and setup

_module = EventLogger;

inherits(EventLogger, AutomationModule);

// Module methods

EventLogger.prototype.init = function (config) {
    EventLogger.super_.prototype.init.call(this, config);

    var self = this;
    this.controller.onAny(function () {
        var newArgs = get_values(arguments);
        newArgs.unshift(this.event);
        self.logEvent.apply(self, newArgs);
    });

    self._startPolling();

    // Go over the already registered devices looking for meters
    //
    Object.keys( this.controller.devices ).forEach( function( id ) {
        console.log( "evaluating", id );

        var device = self.controller.devices[ id ];

        if ( device.zCommandClassId === 0x32 && device.zSubTreeKey === 2 ) {
            self._meters[ id ] = true;
        }
    } );
};

EventLogger.prototype.logEvent = function () {
    var self = this;
    var now = new Date();
    var timestamp = Math.round(now.getTime() / 1000);

    var args = get_values(arguments);
    var eventId = args.shift();

    var line = [];

    line.push( timestamp );
    line.push( eventId );
    line = line.concat( args );

    system( 'echo "' + line.join( "," ) + '" >> /var/log/zway_events.csv' );

    // New meter device added? Add it to the the list of devices we poll
    //
    if ( eventId === "core.deviceRegistered" ) {
        var device = self.controller.devices[ args[ 0 ] ];

        if ( device.zCommandClassId === 0x32 && device.zSubTreeKey === 2 ) {
            self._meters[ args[ 0 ] ] = true;
        }
    }
};

EventLogger.prototype._startPolling = function() {

    var self = this;

    function _poll() {
        Object.keys( self._meters ).forEach( function( id ) {
            var device = self.controller.devices[ id ];

            zway.devices[ device.zDeviceId ].instances[ device.zInstanceId ].commandClasses[ device.zCommandClassId ].Get( 2 );
        } );
    }

    this._pollTimer = setInterval( _poll, 2000 );
};
