document.addEventListener('DOMContentLoaded', event => {
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
  }

  loadImportantAssets()
    .then(assetsObject => {
      //GLOBAL (ugly but it'll do for now)
      assets = assetsObject
      init();
    });
});

function loadImportantAssets() {
  //TODO move this somewhere else
  editMenuModelSelect = document.getElementById('ehsm-path');
  imagesPromise = new Promise(function(resolve, reject) {
    imagesObject = {};
    pathArray = [];
    imagesPromiseArray = [];
    // get all hold image paths from firestore 
    const db = firebase.firestore();
    db.collection('asset-paths')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          // create promise array for images
          // create a parallel path array
          let holdData = doc.data();
          let path = holdData.path;
          //TODO move this somewhere else
          if (path.includes('holds')) {
            let option = document.createElement('option');
            option.text = path;
            editMenuModelSelect.add(option);
          }
          imagesPromiseArray.push(loadImage(path));
          pathArray.push(path);
        });
        Promise.all(imagesPromiseArray)
          .then(imagesArray => {
            // when all images resolve, map the two parallel
            // arrays together
            pathArray.forEach(function(key, index) {
              imagesObject[key] = imagesArray[index];
            });
            resolve(imagesObject);
          });
      });
  });
  return imagesPromise;
}


function init(imagesObject) {
  wall = new CreatorState(document.getElementById('route-canvas'));
}

function CreatorState(canvas) {
  // setup canvas dimensions
  this.div = document.getElementById('wall-div');
  this.canvas = canvas;
  //we will find this out once we draw, or we can hardcode it...
  this.scale = null; 
  this.ctx = canvas.getContext('2d');

  // image storage
  // {"path": image}
  this.backgroundImage = assets['walls/sdsmt/all.png'];

  // keep track of the state of the canvas
  this.valid = false; //if false, canvas needs to redraw
  this.holds = []; // keeps hold data
  this.dragging = false; // true when user is dragging
  this.selection = null; // the selected hold
  this.dragoffx = 0; // drag offsets
  this.dragoffy = 0;

  // in event listeners, `this` means the canvas, so we'll need some other
  // variable to access the CreatorState object.
  myState = this;

  // remove text selection double click behavior
  canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // for setting state letiables for mouse down
  canvas.addEventListener('mousedown', function(e) {
    let editHoldButton = document.getElementById('edit-hold-button');
    let mouse = myState.getMouse(e);
    let mx = mouse.x;
    let my = mouse.y;
    let holds = myState.holds;
    let l = holds.length;
    for (let i = l-1; i >= 0; i--) {
      if (holds[i].contains(mx, my, myState.scale)) {
        let mySel = holds[i];
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.selection = mySel;
        myState.dragging = true;
        myState.valid = false;
        editHoldButton.classList.remove('hidden');
        return;
      }
      myState.selection = null;
      editHoldButton.classList.add('hidden');
      toggleHoldEdit(forceOff=true);
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

CreatorState.prototype.addHold = function(hold) {
  this.holds.push(hold);
  this.valid = false;
}

CreatorState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CreatorState.prototype.deleteHold = function() {
  let holds = myState.holds;
  let l = holds.length;
  for (let i = 0; i < l; i++) {
    if (holds[i] == myState.selection) {
      myState.holds.splice(i, 1);
      myState.selection = null;
      let editHoldButton = document.getElementById('edit-hold-button');
      editHoldButton.classList.add('hidden');
      toggleHoldEdit(forceOff=true);
      return;
    }
  }
}

CreatorState.prototype.moveUpHold = function() {
  myState.selection.y -= 10;
  return;
}

CreatorState.prototype.moveDownHold = function() {
  myState.selection.y += 10;
  return;
}

CreatorState.prototype.moveLeftHold = function() {
  myState.selection.x -= 10;
  return;
}

CreatorState.prototype.moveRightHold = function() {
  myState.selection.x += 10;
  return;
}

CreatorState.prototype.rotateLeftHold = function() {
  myState.selection.r -= 15;
  return;
}

CreatorState.prototype.rotateRightHold = function() {
  myState.selection.r += 15;
  return;
}

CreatorState.prototype.scaleHold = function(e) {
  myState.xScaleHold(e);
  myState.yScaleHold(e);
  return;
}

CreatorState.prototype.xScaleHold = function(e) {
  myState.selection.sx += e.getModifierState('Control') ? -0.1 : 0.1;
  return;
}

CreatorState.prototype.yScaleHold = function(e) {
  myState.selection.sy += e.getModifierState('Control') ? -0.1 : 0.1;
  return;
}

CreatorState.prototype.resetHold = function() {
  myState.selection.sx = 1;
  myState.selection.sy = 1;
  myState.selection.r = 1;
  return;
}

CreatorState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CreatorState.prototype.drawBackground = function() {
  let ctx = this.ctx;

  this.canvas.height = this.div.clientHeight;
  this.height = this.canvas.clientHeight;
  this.scale = this.height / this.backgroundImage.height;
  this.width = this.scale * this.backgroundImage.width;
  this.canvas.width = this.width;
  ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
}

CreatorState.prototype.resetWall = function() {
  this.clear();
  this.drawBackground();
}

CreatorState.prototype.draw = function() {
  // if our state is invalid, redraw
  if (!this.valid) {
    let ctx = this.ctx;
    let holds = this.holds;
    
    this.resetWall();
    
    // draw all holds
    let l = holds.length;
    for (let i = 0; i < l; i++) {
      let hold = holds[i];
      holds[i].draw(ctx, myState.scale);
    }
    
    // do selection specific modifications
    if (this.selection != null) {
      fixupEditMenu(this.selection);
      let {x, y, w, h, r, sx, sy} = this.selection;
      let scale = this.scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r * Math.PI / 180);
      ctx.strokeRect(-w/2*sx*scale, -h/2*sy*scale, w*sx*scale, h*sy*scale);
      ctx.restore();
    }
    this.valid = true;
  }
}

CreatorState.prototype.getMouse = function(e) {
    let rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
}

function Hold(x, y, r, s) {
  // get the model associated with this hold
  this.model = 'holds/sample-hold.png'

  //closure
  myHold = this;

  // positional info is stored plainly
  this.x = x; // x pos
  this.y = y; // y pos
  this.sx = s; // scale
  this.sy = s; // scale
  this.r = r; // rotation
  this.c = '000000' // color
}

// Draws this shape to a given context
Hold.prototype.draw = function(ctx, scale) {
  let {x, y, r, sx, sy, c} = this;
  let image = assets[this.model];

  // the width and height depend on the image and scale
  let w = image.width;
  let h = image.height;
  this.w = w;
  this.h = h;

  //so we don't taint the canvas
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r * Math.PI / 180);
  ctx.drawImage(image, -w/2*sx*scale, -h/2*sy*scale, w*sx*scale, h*sy*scale);
  ctx.beginPath();
  ctx.ellipse(0, 0, w/8*sx*scale, h/8*sy*scale, 0, 0, 2*Math.PI);
  ctx.fillStyle = '#' + c;
  ctx.fill();
  //recolor
  //let red = parseInt(c.substring(0, 2), 16);
  //let blue = parseInt(c.substring(2, 4), 16);
  //let green = parseInt(c.substring(4, 6), 16);
  // not working because of some cors permissions... How do I do this when I
  // get images from firebase storage?!
  //let myImageData = tempctx.getImageData(0, 0, 50, 50);
      //recolor pixel
  //ctx.putImageData(myImageData, 0, 0);
  ctx.restore();
}

// Determine if a point is inside the shape's bounds
Hold.prototype.contains = function(mx, my, scale) {
  // TODO this should change based on rotation of the hold
  inXBounds = (mx > this.x - this.w/2*scale) && (mx < this.x + this.w/2*scale)
  inYBounds = (my > this.y - this.h/2*scale) && (my < this.y + this.h/2*scale)
  return (inXBounds && inYBounds);
}

function toggleHoldEdit(forceOff=false) {
  let editHoldsubmenu = document.getElementById('editholdsubmenu');
  if (!forceOff && editHoldsubmenu.classList.contains('hidden')) {
    editHoldsubmenu.classList.remove('hidden');
  }
  else {
    editHoldsubmenu.classList.add('hidden');
  }
}

function fixupEditMenu(selection) {
  document.getElementById('ehsm-x').value = selection.x;
  document.getElementById('ehsm-y').value = selection.y;
  document.getElementById('ehsm-r').value = selection.r;
  document.getElementById('ehsm-sx').value = selection.sx;
  document.getElementById('ehsm-sy').value = selection.sy;
  document.getElementById('ehsm-color').value = selection.c;
  document.getElementById('ehsm-path').value = selection.model;
}

function applyHoldChanges() {
  myState.selection.x = parseInt(document.getElementById('ehsm-x').value);
  myState.selection.y = parseInt(document.getElementById('ehsm-y').value);
  myState.selection.r = parseInt(document.getElementById('ehsm-r').value);
  myState.selection.sx = parseFloat(document.getElementById('ehsm-sx').value);
  myState.selection.sy = parseFloat(document.getElementById('ehsm-sy').value);
  myState.selection.model = document.getElementById('ehsm-path').value;
  myState.selection.c = document.getElementById('ehsm-color').value;
  //check if all of these are valid first
  myState.valid = false;
}

function toggleSaveSubmenu(forceOff=false) {
  let saveSubmenu = document.getElementById('saveroutesubmenu');
  if (!forceOff && saveSubmenu.classList.contains('hidden')) {
    saveSubmenu.classList.remove('hidden');
  }
  else {
    saveSubmenu.classList.add('hidden');
  }
}

function saveRouteToFirestore() {
  //retrieve name, grade, and setter fields
  let name = document.getElementById('save-name').value;
  let grade = document.getElementById('save-grade').value;
  let setter = document.getElementById('save-setter').value;
  //if any are empty, throw error to screen
  //create data to save
  let route = {};
  let holds = [];
  for (let i = 0; i < myState.holds.length; i++) {
    let holdState = myState.holds[i];
    let hold = {};
    hold['x'] = holdState.x / myState.scale;
    hold['y'] = holdState.y / myState.scale;
    hold['r'] = holdState.r;
    hold['c'] = holdState.c;
    hold['sx'] = holdState.sx;
    hold['sy'] = holdState.sy;
    hold['model'] = holdState.model;
    holds.push(hold);
  }
  route['name'] = name;
  route['grade'] = grade;
  route['setter'] = setter;
  route['holds'] = holds
  //if route already exists, throw error to screen
  //else save route to fs
  const db = firebase.firestore();
  db.collection('routes').add(route)
    .then(function() {
      console.log('Document successfully written!');
    })
    .catch(function() {
      console.log('Error writing document.')
    });
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", err => reject(err));
    // get image from firebase storage
    const storage = firebase.storage();
    const storageRef = storage.ref().child(path);
    storageRef.getDownloadURL().then( url => {
      img.src = url;
    });
  });
}
