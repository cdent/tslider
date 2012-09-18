
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
* Slides can be HTML or something that is rendered to HTML, they are
  retrieved as JSON, render is used if present.
* Slide notes go in the same tiddler, anything below &lt;hr&gt; is notes
  (assuming this selects okay).
