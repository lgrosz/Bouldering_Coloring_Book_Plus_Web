document.addEventListener('DOMContentLoaded', event => {
  // load firebase app
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
  }

  init();
});


function init() {
  wall = new WallState(document.getElementById('route-canvas'));
}

function WallState(canvas) {
  // setup canvas dimensions
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.scale = this.height / window.innerHeight;
  this.ctx = canvas.getContext('2d');

  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // keep track of the state of the canvas
  this.valid = false; //if false, canvas needs to redraw
  this.holds = []; // keeps hold data
  this.dragging = false; // true when user is dragging
  this.selection = null; // the selected hold
  this.dragoffx = 0; // drag offsets
  this.dragoffy = 0;

  // `this` will mean the canvas, not WallState. But we will use WallState
  // for redrawing things, so here is a reference to the WallState object.
  myState = this;

  // remove text selection double click behavior
  canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // for setting state variables for mouse down
  canvas.addEventListener('mousedown', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var holds = myState.holds;
    var l = holds.length;
    for (var i = l-1; i >= 0; i--) {
      if (holds[i].contains(mx, my)) {
        console.log('here');
        var mySel = holds[i];
        // Keep track of where in the object we clicked
        // so we can move it smoothly (see mousemove)
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.dragging = true;
        myState.selection = mySel;
        myState.valid = false;
        return;
      }
    }
  });

  // for setting state variables for mouse moving
  canvas.addEventListener('mousemove', function(e) {
    if (myState.dragging) {
      var mouse = myState.getMouse(e);
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;   
      myState.valid = false;
    }
  }, true);

  //no longer dragging
  canvas.addEventListener('mouseup', function(e) {
    myState.dragging = false;
  }, true);

  // double click for adding holds
  canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
    myState.addHold(new Hold(mouse.x, mouse.y, 0, 1));
  }, true);
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.selectionWidth = 2;  
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
}

WallState.prototype.addHold = function(hold) {
  this.holds.push(hold);
  //temp
  holds = this.holds;
  //
  this.valid = false;
}

WallState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

WallState.prototype.draw = function() {
  // if our state is invalid, redraw
  if (!this.valid) {
    var ctx = this.ctx;
    var holds = this.holds;
    this.clear();
    
    // background
    const wallImage = new Image();
    wallImage.src = '../assets/wall_images/all.png';
    wallImage.onload = function() {
      ctx.drawImage(wallImage, 0, 0, myState.width, myState.height);
    }
    
    // draw all holds
    var l = holds.length;
    for (var i = 0; i < l; i++) {
      var hold = holds[i];
      holds[i].draw(ctx);
    }
    
    // draw selection border
    //if (this.selection != null) {
    //  ctx.strokeStyle = this.selectionColor;
    //  ctx.lineWidth = this.selectionWidth;
    //  var mySel = this.selection;
    //  ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
    //}
    
    // foreground
    
    this.valid = true;
  }
}

WallState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

function Hold(x, y, r, s) {
  // TODO creator position, not aboslute position, saving this will lose
  //      data!!!! (but is it significant)
  this.x = x; // x position
  this.y = y; // y position
  this.r = r; // rotation
  this.s = s; // scale
  this.model = '../assets/holds/sample-hold.png'
}

// Draws this shape to a given context
Hold.prototype.draw = function(ctx) {
  //can do something like {x,y,r,s} = this
  var x = this.x;
  var y = this.y;
  var r = this.r;
  var s = this.s;
  const holdImage = new Image();
  holdImage.src = '../assets/holds/sample-hold.png'
  holdImage.onload = function() {
    var width = s * holdImage.width;
    var height = s * holdImage.height;
    x = x - width/2;
    y = y - height/2;
    ctx.drawImage(holdImage, x, y, width, height); 
  }
}

// Determine if a point is inside the shape's bounds
// TODO THIS!
Hold.prototype.contains = function(mx, my) {
  var hold = this;
  console.log(hold);
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}
