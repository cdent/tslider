
// XXX: need screen divisor from static
(function() {

	"use strict";

	$(window).on('resize', cssCleanup);
	var source = $('#stylesheet-template').html(),
		styleSheetTemplate = Handlebars.compile(source),
		screenDivisor = 10,
		ulWidth,
		root = this,
		Router,
		SlideView,
		SlideMap,
		router,
		view,
		slides;

	/*
	 * A View (like but not the same a Backbone view) 
	 * representing a slide.
	 */
	SlideView = function(hostEl, slides, router) {
		this.el = hostEl;
		this.slides = slides;
		this.router = router;
		$(document).on("slideUpdate", this.moveSlide.bind(this));
	};

	_.extend(SlideView.prototype, {

		/*
		 * Given our position in the map, load that slide,
		 * render upon success.
		 */
		moveSlide: function() {
			var title = this.slides._map[this.slides.xIndex][this.slides.yIndex];
			this.router.navigate(title);
			$.ajax({
				url: '/bags/tslider_public/tiddlers/' +
					encodeURIComponent(title) +
					'?render=1',
				dataType: 'json',
				success: this.renderSlide.bind(this)
			});

		},

		/*
		 * If we are using the render data, we want to not have the
		 * containing <div> and remove the stupid <br>s that
		 * tiddlywiki horks in there.
		 *
		 * Anything after the first <hr> is ignored, allowing for
		 * notes.
		 */
		renderSlide: function(data) {
			var render = data.render,
				content,
				info,
				notes;
			console.log(render);
			if (render) {
				var foundHr = false;
				render = $(render);
				content = render.children().filter(function() {
					console.log('cthis', this);
					if (foundHr) { return false }
					if ($(this).is('br')) { return false }
					if ($(this).is('hr')) {
						foundHr = true;
						return false;
					}
					return true;
				});
			} else {
				content = data.text;
			}

			$('h1').first().html(data.title);
			$('title').html(data.title);
			this.el.empty().html(content);
			$('#counter').html((this.slides.xIndex + 1) + '.' +
				(this.slides.yIndex + 1) +
				'/' + this.slides._map.length + '.' +
				this.slides._map[this.slides.xIndex].length);
			cssCleanup(true);
		}

	});

	/*
	 * A model for the map of a slide. A 2d array of
	 * tiddler titles.
	 */
	SlideMap = function() {
		this.xIndex = 0;
		this.yIndex = 0;
		this._map = [['']];
	};

	_.extend(SlideMap.prototype, {

		/*
		 * Read a data source into the 2d array.
		 */
		parse: function(input) {
			var dataLines = input.trim().split(/\n+/),
				x = 0,
				that = this;
			_.each(dataLines, function(line) {
				that._map[x] = [];
				var dataItems = line.trim().split(/\s*,\s*/),
					y = 0;
				_.each(dataItems, function(item) {
					that._map[x][y] = item;
					y += 1;
				});
				x += 1;
			});
		},

		/*
		 * Announce that the current slide has changed.
		 */
		trigger: function() {
			$("body").trigger('slideUpdate');
		},

		/*
		 * Load TSliders as a datasource listing slides.
		 * On success parseSlides.
		 */
		load: function(url) {
			$.ajax({
				url: url,
				dataType: 'json',
				success: this.parseSlides.bind(this)
			});
		},

		/*
		 * Read data to extract slide information and
		 * set the map. `this` is a bound SlideMap.
		 */
		parseSlides: function (data) {
			this.parse(data.text);
			var historyStart = Backbone.history.start({
				root: window.location.pathname
			});

			if (!historyStart) {
				this.reset();
			}
		},

		/*
		 * Find the slide in the map and then navigate to it.
		 * This will cause the model to trigger its view.
		 */
		displaySlide: function(router, slide) {
			this.find(slide);
			router.navigate(slide);
		},

		/*
		 * Take the map back to the first slide.
		 */
		reset: function() {
			this.yIndex = this.xIndex = 0;
			this.trigger();
		},

		/*
		 * Find a slide in the map, by title.
		 * If not found, reset().
		 */
		find: function(title) {
			var x = 0,
				y = 0,
				hit = false;
			_.every(this._map, function(xBit, xIndex) {
				var index = xBit.indexOf(title);
				x = xIndex;
				if (index !== -1) {
					y = index;
					hit = true;
					return false;
				}
				return true;
			});

			if (hit) {
				this.xIndex = x;
				this.yIndex = y;
				this.trigger();
			} else {
				this.reset();
			}
		},

		/*
		 * XXX: There is likely math that can be done
		 * here to greatly simplify and reduce the amount
		 * of code here, but...I don't have that brain with
		 * me right now. Presumably you'd flatten the two
		 * dimensional array to a sparse 1d list and use 
		 * modulo math to traverse around.
		 *
		 * For now it's written out longhand, for visibility.
		 */
		nextX: function() {
			var xLimit = this._map.length,
				next = this.xIndex + 1;

			if (next < xLimit) {
				this.xIndex = next;
			}
			this.yIndex = 0;
			this.trigger();
		},

		prevX: function() {
			var prev = this.xIndex - 1;
			if (prev >= 0) {
				this.xIndex = prev;
			}
			this.yIndex = 0;
			this.trigger();
		},

		nextY: function() {
			var yLimit = this._map[this.xIndex].length,
				next = this.yIndex + 1;

			if (next < yLimit) {
				this.yIndex = next;
			}
			this.trigger();
		},

		prevY: function() {
			var prev = this.yIndex - 1;

			if (prev >= 0) {
				this.yIndex = prev;
			}
			this.trigger();
		},

		next: function() {
			var xLimit = this._map.length,
				yLimit = this._map[this.xIndex].length;

			if (this.yIndex + 1 < yLimit) {
				return this.nextY();
			}

			if (this.xIndex + 1 < xLimit) {
				return this.nextX();
			}
			this.trigger();
		}

	});

	/*
	 * Backbone router keeping track of what slide we are
	 * on, by title. Enables bookmarking.
	 */
	Router = Backbone.Router.extend({
		routes: {
			':slide': 'show'
		}
	});

	/*
	 * Keydown events for navigation.
	 */
	$(document).keydown(function(e) {
		switch(e.which) {
		case 37: // left
			slides.prevX();
			break;

		case 38: // up
			slides.prevY();
			break;

		case 39: // right
			slides.nextX();
			break;

		case 40: // down
			slides.nextY();
			break;

		case 32: // space
			slides.next();
			break;

		case 82: // 'r'
			slides.reset();
			break;

		case 67: // 'c'
			cssCleanup(true);
			break;

		default:
			return;
		}
		e.preventDefault();
	});

	/*
	 * Reset font sizes based on window size.
	 * Reset list position based on the prensence of
	 * an img (in the slide).
	 */
	function cssCleanup(replace) {
		replace = replace || false;
		var height = $(window).height(),
			sheet,
			styleSheetInput,
			left = 50,
			divisor = 2,
			listWidth = 100;

		$('#slide').css('font-size', height / 18.75);
		if (!ulWidth) {
			replace = false;
			ulWidth = $('#slide > dl, #slide > ol, #slide > ul').first().width();
		}

		if ($('#slide > dl ~ img, #slide > ul ~ img, #slide > ol ~ img')[0]) {
			divisor = 4;
			listWidth = 50;
			left = 25;
		}

		styleSheetInput = styleSheetTemplate({
			height1: height / screenDivisor,
			height2: height / screenDivisor * 1.5,
			height3: height / screenDivisor * 1.75,
			height4: height / screenDivisor * 1.875,
			halfWidth: (ulWidth / divisor * -1),
			listWidth: listWidth,
			left: left
		});

		if (replace) {
			sheet = $('#stylesheet');
			sheet.remove();
		} else {
			sheet = $('<style>').attr({
				id: 'stylesheet',
				type: 'text/css'
			});
		}

		sheet.html(styleSheetInput);
		$('body').append(sheet);
	}

	/*
	 * GO!
	 * Load the slides and navigate to the first one.
	 */
	slides = new SlideMap();
	router = new Router();
	view = new SlideView($('#slide'), slides, router);
	router.on('route:show', slides.displaySlide.bind(slides, router));
	slides.load('/bags/tslider_public/tiddlers/TSliders');

	/*
	 * For debugging, export slides to global.
	 */
	root.slides = slides;

}).call(this);
