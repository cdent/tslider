
// XXX: need screen divisor from static
(function() {

	"use strict";

	$(window).on('resize', cssCleanup);
	var source = $('#stylesheet-template').html(),
		styleSheetTemplate = Handlebars.compile(source),
		screenDivisor = 8,
		root = this,
		Router,
		onLine = navigator.onLine,
		SlideView,
		SlideMap;

	/*
	 * A View (like but not the same a Backbone view) 
	 * representing a slide.
	 */
	SlideView = function(hostEl, slides, router) {
		this.el = hostEl;
		this.slides = slides;
		this.router = router;
		$(document).on("slideUpdate", this.moveSlide.bind(this));
		establishEvents(slides);
	};

	_.extend(SlideView.prototype, {

		/*
		 * Given our position in the map, load that slide,
		 * render upon success.
		 */
		moveSlide: function(ev, notes) {
			notes = notes || false;
			var title = this.slides._map[this.slides.xIndex][this.slides.yIndex];
			this.router.navigate(title);
			if (onLine) {
				$.ajax({
					url: this.slides.baseURL + '/' +
						encodeURIComponent(title) +
						'?render=1',
					dataType: 'json',
					success: this.renderSlide.bind(this, notes)
				});
			} else {
				var data = localStorage['tslider.' + title];
				if (data) {
					this.renderSlide(notes, JSON.parse(data));
				}
			}
		},

		/*
		 * If we are using the render data, we want to not have the
		 * containing <div> and remove the stupid <br>s that
		 * tiddlywiki horks in there.
		 *
		 * Anything after the first <hr> is ignored, allowing for
		 * notes.
		 */
		renderSlide: function(showNotes, data) {
			var render = data.render,
				foundHr = false,
				content;
			if (render) {
				render = $(render);
				content = render.contents().filter(function() {
					if (showNotes && foundHr) { return true; }
					if (foundHr) { return false; }
					if ($(this).is('br')) { return false; }
					if ($(this).is('hr')) {
						foundHr = true;
						return false;
					}
					if (showNotes) {
						return false;
					} else {
						return true;
					}
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
			cssCleanup(showNotes);
			if (onLine) {
				localStorage['tslider.' + data.title] = JSON.stringify(data);
			}
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
		this.baseURL = '';
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
		trigger: function(notes) {
			$("body").trigger('slideUpdate', [notes]);
		},

		/*
		 * Load TSliders as a datasource listing slides.
		 * On success parseSlides.
		 */
		load: function(url) {
			this.baseURL = url.replace(/\/[^\/]*$/, '');
			if (onLine) {
				$.ajax({
					url: url,
					dataType: 'json',
					success: this.parseSlides.bind(this)
				});
			} else {
				// XXX assumes slides slide is TSliders, even when not
				var data = localStorage['tslider.TSliders'];
				if (data) {
					this.parseSlides(JSON.parse(data));
				}
			}
		},

		/*
		 * Read data to extract slide information and
		 * set the map. `this` is a bound SlideMap.
		 *
		 * If a Router has been established then Backbone.history
		 * will be available.
		 */
		parseSlides: function (data) {
			this.parse(data.text);
			if (Backbone.history) {
				var historyStart = Backbone.history.start({
					root: window.location.pathname
				});

				if (!historyStart) {
					this.reset();
				}
			} else {
				this.reset();
			}
			if (onLine) {
				localStorage['tslider.TSliders'] = JSON.stringify(data);
			}

		},

		/*
		 * Find the slide in the map and then navigate to it.
		 * This will cause the model to trigger its view.
		 */
		displaySlide: function(router, slide) {
			slide = decodeURIComponent(slide);
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
	function establishEvents(slides) {
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
				cssCleanup();
				break;

			case 72: // 'h'
				toggleHelp();
				break;

			case 78: // 'n'
				slides.trigger(true);
				break;

			case 68: // 'd'
				slides.trigger(false);
				break;

			default:
				return;
			}
			e.preventDefault();
		});
	}

	// set up click on helppage
	$('#helppage').on('click', function() {
		$(this).removeClass('on');
	});

	/*
	 * Turn the help on.
	 */
	function toggleHelp() {
		$('#helppage').toggleClass('on');
	}

	/*
	 * Reset font sizes based on window size.
	 * Reset list position based on the presence of
	 * an img (in the slide).
	 */
	function cssCleanup(showNotes) {
		showNotes = showNotes || false;
		var height = $(window).height(),
			ulWidth,
			sheet,
			styleSheetInput,
			left = 50,
			divisor = 2,
			listWidth = 0,
			fourDiv = 1.875 * (showNotes ? 2 : 1);

		$('#slide').css('font-size', height / 18.75);
		ulWidth = $('#slide > dl, #slide > ol, #slide > ul').first().width();
		$('#slide').css('font-size', '');

		if ($('#slide img')[0]) {
			divisor = 4;
			listWidth = 50;
			left = 25;
		}

		styleSheetInput = styleSheetTemplate({
			height1: height / screenDivisor,
			height2: height / (screenDivisor * 1.5),
			height3: height / (screenDivisor * 1.75),
			height4: height / (screenDivisor * fourDiv),
			halfWidth: (ulWidth / divisor * -1),
			listWidth: listWidth,
			left: left
		});

		$('#stylesheet').remove();
		sheet = $('<style>').attr({
			id: 'stylesheet',
			type: 'text/css'
		});

		sheet.html(styleSheetInput);
		$('body').append(sheet);
	}

	/*
	 * For debugging, export slides to global.
	 */
	root.SlideMap = SlideMap;
	root.Router = Router;
	root.SlideView = SlideView;

}).call(this);
