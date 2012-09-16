
(function() {

	"use strict";

	$(window).on('resize', cssCleanup);
	var source = $('#stylesheet-template').html(),
		styleSheetTemplate = Handlebars.compile(source),
		ulWidth;

	var SlideView = function(hostEl, slides, router) {
		this.el = hostEl;
		this.slides = slides;
		this.router = router;
		$(document).on("slideUpdate", this.moveSlide.bind(this));
	};

	_.extend(SlideView.prototype, {

		moveSlide: function() {
			var title = this.slides._map[this.slides.xIndex][this.slides.yIndex];
			this.router.navigate(title);
			$.ajax({
				url: '/bags/tslider_public/tiddlers/' + encodeURIComponent(title) +
					'?render=1',
				dataType: 'json',
				success: this.renderSlide.bind(this)
			});

		},

		renderSlide: function(data) {
			$('h1').first().html(data.title);
			$('title').html(data.title);
			this.el.empty().html(data.render ? data.render : data.text);
			$('#counter').html((this.slides.xIndex + 1) + '.' +
				(this.slides.yIndex + 1) +
				'/' + this.slides._map.length + '.' +
				this.slides._map[this.slides.xIndex].length);
			cssCleanup(true);
		}

	});

	var SlideMap = function() {
		this.xIndex = 0;
		this.yIndex = 0;
		this._map = [['']];
	};

	_.extend(SlideMap.prototype, {

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

		trigger: function() {
			$("body").trigger('slideUpdate');
		},

		reset: function() {
			this.yIndex = this.xIndex = 0;
			this.trigger();
		},

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

	var root = this,
		Router;

	Router = Backbone.Router.extend({
		routes: {
			':slide': 'show'
		}
	});

	function displaySlide(router, slide) {
		console.log('slide is', slide, 'EOF');
		this.find(slide);
		router.navigate(slide);
	}

	var slides = new SlideMap();
	// replace with getting the right tiddler
	slides.parse("hello,fat,slow,moody\ngoodbye,monkey\nfart,chance,luck");
	var router = new Router();
	var view = new SlideView($('#slide'), slides, router);
	var boundDisplay = displaySlide.bind(slides, router);

	router.on('route:show', boundDisplay);

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

			default: return;
		}
		e.preventDefault();
	});

	/*
	 * Reset font sizes based on window size.
	 * Reset list position based on the prensence of
	 * an img (in the slide).
	 */
	function cssCleanup(replace) {
		var replace = replace || false,
			height = $(window).height(),
			width = $(window).width(),
			sheet,
			styleSheetInput,
			left = 50,
			divisor = 2,
			listWidth = 100;

		$('#slide li').css('font-size', height/18.75);
		if (!ulWidth) {
			replace = false;
			ulWidth = $('#slide ul').width();
		}
		console.log('ulWidth', ulWidth);

		if ($('#slide ul ~ img')[0]) {
			console.log('found img');
			divisor = 4;
			listWidth = 50;
			left = 25;
		}

		styleSheetInput = styleSheetTemplate({
			height1: height/10,
			height2: height/15,
			height3: height/17.5,
			height4: height/18.75,
			halfWidth: (ulWidth/divisor * - 1),
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


	var historyStart = Backbone.history.start({
		root: window.location.pathname
	});

	if (!historyStart) {
		slides.reset();
	}

	root.slides = slides;

}).call(this);
