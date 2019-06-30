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
  let stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  let html = document.body.parentNode;
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

  // for setting state letiables for mouse down
  canvas.addEventListener('mousedown', function(e) {
    let mouse = myState.getMouse(e);
    let mx = mouse.x;
    let my = mouse.y;
    let holds = myState.holds;
    let l = holds.length;
    for (let i = l-1; i >= 0; i--) {
      if (holds[i].contains(mx, my)) {
        let mySel = holds[i];
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

  // for setting state letiables for mouse moving
  canvas.addEventListener('mousemove', function(e) {
    if (myState.dragging) {
      let mouse = myState.getMouse(e);
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
    let mouse = myState.getMouse(e);
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
  this.valid = false;
}

WallState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

WallState.prototype.draw = function() {
  // if our state is invalid, redraw
  if (!this.valid) {
    let ctx = this.ctx;
    let holds = this.holds;
    this.clear();
    
    // background
    const wallImage = new Image();
    wallImage.src = '../assets/wall_images/all.png';
    wallImage.onload = function() {
      ctx.drawImage(wallImage, 0, 0, myState.width, myState.height);
    }
    
    // draw all holds
    let l = holds.length;
    for (let i = 0; i < l; i++) {
      let hold = holds[i];
      holds[i].draw(ctx);
    }
    
    // draw selection border
    //if (this.selection != null) {
    //  ctx.strokeStyle = this.selectionColor;
    //  ctx.lineWidth = this.selectionWidth;
    //  let mySel = this.selection;
    //  ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
    //}
    
    // foreground
    
    this.valid = true;
  }
}

WallState.prototype.getMouse = function(e) {
    let rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
}

function Hold(x, y, r, s) {
  // TODO creator position, not aboslute position, saving this will lose
  //      data!!!! (but is it significant)
  this.model = '../assets/holds/sample-hold.png'
  hold = this;
  // let's get the dimensions once
  const holdImage = new Image();
  holdImage.src = this.model;
  holdImage.onload = function() {
    hold.s = s; // scale
    hold.r = r; // rotation
    hold.w = hold.s * holdImage.width
    hold.h = hold.s * holdImage.height
    hold.x = x - hold.w / 2; // x position
    hold.y = y - hold.h / 2; // y position
  }
}

// Draws this shape to a given context
Hold.prototype.draw = function(ctx) {
  //can do something like {x,y,r,s} = this
  let x = this.x;
  let y = this.y;
  let r = this.r;
  let w = this.w;
  let h = this.h;
  let s = this.s;
  const holdImage = new Image();
  holdImage.src = '../assets/holds/sample-hold.png'
  holdImage.onload = function() {
    ctx.drawImage(holdImage, x, y, w, h); 
  }
}

// Determine if a point is inside the shape's bounds
// TODO THIS!
Hold.prototype.contains = function(mx, my) {
  let hold = this;
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}
