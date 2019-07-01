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

  // image storage
  // {"path": image}
  this.images = new Object();

  // keep track of the state of the canvas
  this.valid = false; //if false, canvas needs to redraw
  this.holds = []; // keeps hold data
  this.dragging = false; // true when user is dragging
  this.selection = null; // the selected hold
  this.dragoffx = 0; // drag offsets
  this.dragoffy = 0;

  // in event listeners, `this` means the canvas, so we'll need some other
  // variable to access the WallState object.
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
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.selection = mySel;
        myState.dragging = true;
        myState.valid = false;
        return;
      }
      myState.selection = null;
      myState.valid = false;
    }
  });

  // for setting state variables for mouse moving
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
    myState.addHold(new Hold(mouse.x, mouse.y, 45, 1));
  }, true);

  //event listeners for keypresses
  canvas.addEventListener('keydown', e => {
    if (e.code == 'KeyD') {
      if (myState.selection != null) {
        let holds = myState.holds;
        let l = holds.length;
        for (let i = l-1; i >= 0; i--) {
          myState.holds.splice(i, 1);
          myState.selection = null;
          myState.valid = false;
          return;
        }
      }
    }
  });
  
  // refreshing
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
    if ('../assets/wall_images/all.png' in myState.images) {
      image = myState.images['../assets/wall_images/all.png'];
      ctx.drawImage(image, 0, 0, myState.width, myState.height);
    }
    else {
      const wallImage = new Image();
      wallImage.src = '../assets/wall_images/all.png';
      wallImage.onload = function() {
        ctx.drawImage(wallImage, 0, 0, myState.width, myState.height);
      myState.images['../assets/wall_images/all.png'] = wallImage;
      }
    }
    
    // draw all holds
    let l = holds.length;
    for (let i = 0; i < l; i++) {
      let hold = holds[i];
      holds[i].draw(ctx);
    }
    
    // draw selection border
    if (this.selection != null) {
      let mySel = this.selection;
      // visual widths and height depend on the rotation
      // TODO but not like this...
      // vis_w = mySel.w * Math.cos(mySel.r * Math.PI / 180)
      // vis_h = mySel.h * Math.sin(mySel.r * Math.PI / 180)
      // ctx.strokeRect(mySel.x-vis_w/2,mySel.y-vis_h/2,vis_w,vis_h);
      ctx.strokeRect(mySel.x-mySel.w/2, mySel.y-mySel.h/2, mySel.w, mySel.h);
    }
    
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
  this.images = new Object();

  //closure
  myHold = this;

  // positional info
  myHold.x = x; // x pos
  myHold.y = y; // y pos
  myHold.s = s; // scale
  myHold.r = r; // rotation

  // the width and height depend on the image
  const holdImage = new Image();
  holdImage.src = this.model;
  holdImage.onload = function() {
    myHold.w = myHold.s * holdImage.width
    myHold.h = myHold.s * holdImage.height
    myHold.images[myHold.model] = holdImage;
  }
}

// Draws this shape to a given context
Hold.prototype.draw = function(ctx) {
  //can do something like {x,y,r,s} = this
  let {x, y, r, w, h, s} = this;
  if (this.model in this.images) {
    image = this.images[this.model];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r * Math.PI / 180);
    //ctx.drawImage(image, x-w/2 ,y-h/2, w, h);
    ctx.drawImage(image, -w/2, -h/2, w, h);
    ctx.restore();
  }
  else {
    //const holdImage = new Image();
    //holdImage.src = '../assets/holds/sample-hold.png'
    //holdImage.onload = function() {
    //  ctx.drawImage(holdImage, x-w/2 ,y-h/2, w, h);
    //  this.images[this.model] = holdImage;
    console.log('Image wasn\'t ready to be drawn');
    wall.valid = false;
  }
}

// Determine if a point is inside the shape's bounds
Hold.prototype.contains = function(mx, my) {
  // TODO this should change based on rotation of the hold
  inXBounds = (mx > this.x - this.w/2) && (mx < this.x + this.w/2)
  inYBounds = (my > this.y - this.h/2) && (my < this.y + this.h/2)
  return (inXBounds && inYBounds);
}
