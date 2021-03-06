var Traffic = Traffic || {};

(function(A, $, translator, views, models, mapWrapper) {

	A.app = {};

	A.app.instance = new Backbone.Marionette.Application();

	A.app.instance.addRegions({
		navbar: "#navbar",
		sidebarTabs: "#sidebar-tabs",
		sidebar: "#side-panel"
	});

  function updateTimezoneOffset(latlng) {
    var latlngStr = latlng.lat + "," + latlng.lng;
    var timestamp = parseInt(Date.now() / 1000);
    $.ajax({
      url: "https://maps.googleapis.com/maps/api/timezone/json?location=" + latlngStr + "&timestamp=" + timestamp,
    }).done(function(data) {
      if(data.rawOffset || data.rawOffset == 0) {
        A.app.instance.utcTimezoneOffset = parseInt(data.rawOffset / 3600);
      }
    }).fail(function() {
      console.log('Failed to request time zone offset');
      console.log(latlng);
    });
  }

	A.app.instance.addInitializer(function(options){
		this.user = new models.UserModel();
        this.route = new models.RouteModel();

		A.app.nav = new views.Nav();
		A.app.instance.navbar.show(A.app.nav);

		A.app.sidebarTabs = new views.SidebarTabs();
		A.app.instance.sidebarTabs.show(A.app.sidebarTabs);

		var mapWrapperObject = Object.create(mapWrapper);
		mapWrapperObject.init('map', {
			center: [10.3036741,123.8982952],
			 zoom: 13
		});
		
		A.app.map = mapWrapperObject.LMmap;

    A.app.map.on('load', function(e) {
      console.log('map loaded');
      updateTimezoneOffset(e.target.getCenter());
    });

    A.app.map.on('moveend', function(e) {
      console.log('map moved');
      updateTimezoneOffset(e.target.getCenter());
    });

	// Click Data in sidebar
	$('#routing').click();
    updateTimezoneOffset(A.app.map.getCenter());
  });

})(Traffic, jQuery, Traffic.translations, Traffic.views, Traffic.models, Traffic.MapWrapper);


// Override Backbone.sync to include user auth params into each API call
var overrideBackboneSync = function() {
	var _sync = Backbone.sync;
	Backbone.sync = function(method, model, options) {
		options = options || {};
		options.data = options.data || {};
		var user = Traffic.app.instance.user;
		if(user) {
			options.data.username = Traffic.app.instance.user.get('username');
		}

	  return _sync.call( this, method, model, options );
	}
};

var createHtmlCustomCell = function() {
	var HtmlCell = Backgrid.HtmlCell = Backgrid.Cell.extend({

    /** @property */
    className: "html-cell",
    
    initialize: function () {
        Backgrid.Cell.prototype.initialize.apply(this, arguments);
    },

    render: function () {
        this.$el.empty();
        var rawValue = this.model.get(this.column.get("name"));
        var formattedValue = this.formatter.fromRaw(rawValue, this.model);
        this.$el.append(formattedValue);
        this.delegateEvents();
        return this;
    }
	});
};

$(document).ready(function() {
	overrideBackboneSync();
	createHtmlCustomCell();
	if(Traffic.translations != undefined) {
		Traffic.translations.init();
	}
	Traffic.app.instance.start();

	Traffic.app.instance.vent.trigger('login:auto_auth');

    if(window.location.href.indexOf('route=') > -1){
        var routeId = window.location.href.substr(window.location.href.indexOf('route=') + 6);
        Traffic.app.instance.vent.trigger('saveroute:url', routeId);
    }
});
