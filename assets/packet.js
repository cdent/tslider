/*
 * Load up all the slides, display them in order.
 */

$(function() {
var bag = '/bags/' + tiddlyweb.status.space.name + '_public/tiddlers',
	currentSlide = '',
	slides = new SlideMap();
	source = $('#slide-template').html(),
	slideTemplate = Handlebars.compile(source),
$(document).on('slideUpdate', displaySlide);
slides.load(bag + '/TSliders');

function displaySlide() {
	var nSlide = slides._map[slides.xIndex][slides.yIndex];
	console.log('ns', nSlide, 'cs', currentSlide);

	if (nSlide === currentSlide) {
		// we're done
		return;
	}
	currentSlide = nSlide;
	$.ajax({
		url: bag + '/' + encodeURIComponent(nSlide) + '?render=1',
		dataType: 'json',
		success: nextSlide
	});
}

function nextSlide(data) {
	var html = slideTemplate({
		title: data.title,
		content: data.render ? data.render : data.text
	});
	$('body').append(html);
	slides.next();
}
});

