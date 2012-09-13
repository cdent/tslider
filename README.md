
# tslider - The T is Silent

A tsapp for doing presentations. Architecture as follows:

* SPA loads up necessary CSS and JavaScript
* Loads up a tiddler which lists the slides, vertical is main slides,
  horizontal is sub slides, as follows:

First
Second, Second.a, Second.b
Third
Fourth, Fourth.a, Fourth.b

* Uses history pushes to change location and indicate current slide.
* Arrows left and right traverse the main slides, up and down the
  subs. Space goes "next", whatever that might be.
* When going to the next slide, css transform in a various ways.
* If there is a list, we can enter a slide in bullet-mode, which shows
  an item at a time (haven't worked out how this would work).
* Slides can be HTML or something that is rendered to HTML, they are
  retrieved as JSON, render is used if present.
* Slide notes go in the same tiddler, anything below <hr> is notes
  (assuming this selects okay).
* Whole thing runs under tsapp or off tiddlyspace, so network is not
  required, but can be used.
* Otherwise unstyled images are floated and scaled appropriately.
* media queries used to set appropriate font sizes and margins.
  
