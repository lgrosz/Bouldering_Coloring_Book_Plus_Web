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
    myState.addHold(new Hold(mouse.x, mouse.y, 0, 1));
  }, true);

  //event listeners for keypresses
  canvas.addEventListener('keydown', e => {
    if (myState.selection != null) {
      switch(e.code) {
        case 'KeyK':
          this.deleteHold();
          break;
        case 'KeyW':
          this.moveUpHold();
          break;
        case 'KeyA':
          this.moveLeftHold();
          break;
        case 'KeyS':
          this.moveDownHold();
          break;
        case 'KeyD':
          this.moveRightHold();
          break;
        case 'KeyQ':
          this.rotateLeftHold();
          break;
        case 'KeyE':
          this.rotateRightHold();
          break;
        case 'KeyZ':
          this.scaleHold(e);
          break;
        case 'KeyX':
          this.xScaleHold(e);
          break;
        case 'KeyC':
          this.yScaleHold(e);
          break;
        case 'KeyR':
          this.resetHold();
          break;
        default:
          break;
      }
      myState.valid = false;
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

WallState.prototype.deleteHold = function() {
  let holds = myState.holds;
  let l = holds.length;
  for (let i = 0; i < l; i++) {
    if (holds[i] == myState.selection) {
      myState.holds.splice(i, 1);
      myState.selection = null;
      return;
    }
  }
}

WallState.prototype.moveUpHold = function() {
  myState.selection.y -= 10;
  return;
}

WallState.prototype.moveDownHold = function() {
  myState.selection.y += 10;
  return;
}

WallState.prototype.moveLeftHold = function() {
  myState.selection.x -= 10;
  return;
}

WallState.prototype.moveRightHold = function() {
  myState.selection.x += 10;
  return;
}

WallState.prototype.rotateLeftHold = function() {
  myState.selection.r -= 15;
  return;
}

WallState.prototype.rotateRightHold = function() {
  myState.selection.r += 15;
  return;
}

WallState.prototype.scaleHold = function(e) {
  myState.xScaleHold(e);
  myState.yScaleHold(e);
  return;
}

WallState.prototype.xScaleHold = function(e) {
  myState.selection.xs += e.getModifierState('Control') ? -0.1 : 0.1;
  return;
}

WallState.prototype.yScaleHold = function(e) {
  myState.selection.ys += e.getModifierState('Control') ? -0.1 : 0.1;
  return;
}

WallState.prototype.resetHold = function() {
  myState.selection.xs = 1;
  myState.selection.ys = 1;
  myState.selection.r = 1;
  return;
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
    // this is kind of just a visual thing right now...
    // the actual selecting has nothing to do with this stroke
    if (this.selection != null) {
      let {x, y, w, h, r, xs, ys} = this.selection;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r * Math.PI / 180);
      ctx.strokeRect(-w/2*xs, -h/2*ys, w*xs, h*ys);
      ctx.restore();
    }
    
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
  myHold.xs = s; // scale
  myHold.ys = s; // scale
  myHold.r = r; // rotation

  // the width and height depend on the image
  const holdImage = new Image();
  holdImage.src = this.model;
  holdImage.onload = function() {
    myHold.w = myHold.xs * holdImage.width
    myHold.h = myHold.ys * holdImage.height
    myHold.images[myHold.model] = holdImage;
  }
}

// Draws this shape to a given context
Hold.prototype.draw = function(ctx) {
  //can do something like {x,y,r,s} = this
  let {x, y, r, w, h, xs, ys} = this;
  if (this.model in this.images) {
    image = this.images[this.model];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r * Math.PI / 180);
    ctx.drawImage(image, -w/2*xs, -h/2*ys, w*xs, h*ys);
    ctx.restore();
  }
  else {
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
