
(function() {

	"use strict";

	var root = this,
		Router,
		firstSlide = 'funkytown';

	Router = Backbone.Router.extend({

		routes: {
			':slide': 'show'
		}
	});

	function displaySlide(slide) {
		if (slide == 'tslider.html') {
			return this.navigate(firstSlide, {trigger: true});
		}
		console.log('slide', slide);
	}

	var router = new Router();
	router.on('route:show', displaySlide);

	Backbone.history.start({
		pushState: true,
		root: window.location.pathname + '/'
	});

}).call(this);
