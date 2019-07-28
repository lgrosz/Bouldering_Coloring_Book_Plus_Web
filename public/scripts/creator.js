document.addEventListener('DOMContentLoaded', onload)

async function onload() {
  // initialize canvas state, globals
  assets = await loadAssets();
  myState = new CreatorState(document.getElementById('route-canvas'));

  // deal with url parameters
  let params = getUrlParams();
  if (params['id'] != undefined) {
    // sets route id TODO, should not do this internally - should return route id
    await loadRoute(params['id']);
    myState.valid = false;
    if (params['key'] != undefined) {
      let id = params['id'];
      let key = params['key'];
      myState.keyAccepted = await isMatchingKey(id, key);
    }
  }

  // do initial maintainence
  addCssEventListeners();
  addEditHoldEventListeners();
  addMetaDataEventListeners();
  updateSaveNotification();
  populateHoldBrowser();
  fixupMetaData();
}

async function isMatchingKey(id, key) {
  db = firebase.firestore();
  let routesRef = db.collection('routes');
  let keyAccepted = false;
  await routesRef.doc(id)
    .get()
    .then(doc => {
      if (doc.exists) {
        let route = doc.data();
        if (route.editKey == key) {
          keyAccepted = true;
        }
      }
      else {
        console.log('Could not find route id:', id);
      }
    });

  //returning
  if (keyAccepted) {
    console.log('Key matches');
    return true;
  }
  else {
    console.log('Key does not match, route will not be overwritten.');
    return false;
  }
}

// load route from routeid
async function loadRoute(id) {
  console.log('Loading route id:', id);
  db = firebase.firestore();
  let routesRef = db.collection('routes');
  let route = null;
  await routesRef.doc(id)
    .get()
    .then(doc => {
      if (doc.exists) {
        route = doc.data();
      }
      else {
        console.log('Could not find route id:', id);
      }
    });
  if (route != null) {
    myState.routeId = id;
    myState.route = route;
    myState.resetWall();
    console.log('Successfully loaded route.');
  }
}

function addCssEventListeners() {
  // ACCORDIONS
  let accordions = document.getElementsByClassName('accordion');

  for (acc of accordions) {
    acc.addEventListener("click", function() {
      this.classList.toggle("active");
      let panel = this.nextElementSibling;
      if (panel.style.maxHeight){
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      } 
    });
  }
}

function CreatorState(canvas) {
  // setup canvas dimensions
  this.div = document.getElementById('wall-div');
  this.canvas = canvas;

  // route specifics
  this.route = {
    'name': null,
    'description': null,
    'grade': 0,
    'setter': null,
    'holds': [],
    'editKey': null,
    'tags': [],
  };
  this.routeId = null;
  this.keyAccepted = false;

  // visual only
  this.scale = null; 
  this.ctx = canvas.getContext('2d');
  this.backgroundImage = assets['walls/sdsmt/all.png'];

  // keep track of the state of the canvas
  this.valid = false; //if false, canvas needs to redraw
  this.dragging = false; // true when user is dragging
  this.selection = null; // the selected hold
  this.dragoffx = 0; // drag offsets
  this.dragoffy = 0;

  // remove text selection double click behavior
  canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // for setting state letiables for mouse down
  canvas.addEventListener('mousedown', function(e) {
    let mouse = myState.getMouse(e);
    let scale = myState.scale;
    let mx = mouse.x / scale;
    let my = mouse.y / scale;
    let holds = myState.route.holds;
    let l = holds.length;
    for (let i = l-1; i >= 0; i--) {
      if (contains(holds[i], mx, my)) {
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
      let scale = myState.scale;
      let mx = mouse.x / scale;
      let my = mouse.y / scale;
      myState.selection.x = mx - myState.dragoffx;
      myState.selection.y = my - myState.dragoffy;   
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
    let scale = myState.scale;
    let hold = {
      'x': mouse.x / scale,
      'y': mouse.y / scale,
      'r': 0,
      'f': false,
      'sx': 1,
      'sy': 1,
      'c': '000000',
      'model': 'holds/sample-hold.png'
    };
    myState.addHold(hold);
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
  let myState = this;
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
}

CreatorState.prototype.addHold = function(hold) {
  this.route.holds.push(hold);
  this.valid = false;
}

CreatorState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CreatorState.prototype.deleteHold = function() {
  let holds = myState.route.holds;
  let l = holds.length;
  for (let i = 0; i < l; i++) {
    if (holds[i] == myState.selection) {
      myState.route.holds.splice(i, 1);
      myState.selection = null;
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
    let holds = this.route.holds;
    
    this.resetWall();
    
    // draw all holds
    let l = holds.length;
    for (let i = 0; i < l; i++) {
      let hold = holds[i];
      drawHold(ctx, hold);
    }
    
    // do selection specific modifications
    if (this.selection != null) {
      fixupEditMenu(this.selection);
      let {x, y, r, sx, sy, model} = this.selection;
      let image = assets[model]
      let scale = myState.scale;
      x = x * scale;
      y = y * scale;
      let w = image.width * scale;
      let h = image.height * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r * Math.PI / 180);
      ctx.strokeRect(-w/2*sx, -h/2*sy, w*sx, h*sy);
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

// Draws this shape to a given context
function drawHold(ctx, hold) {
  // get variables
  let {x, y, r, sx, sy, f, c, model} = hold;
  let image = assets[model];
  let scale = myState.scale;
  let w = image.width;
  let h = image.height;
  x = x * scale;
  y = y * scale;

  // draw the image in position
  ctx.save();
  ctx.translate(x ,y);
  ctx.rotate(r * Math.PI / 180);
  if (f) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, -w/2*sx*scale, -h/2*sy*scale, w*sx*scale, h*sy*scale);
  ctx.restore();
}

// Determine if a point is inside the shape's bounds
function contains(hold, mx, my) {
  let image = assets[hold.model];

  let halfWidth = image.width / 2;
  let leftBound = hold.x - halfWidth;
  let rightBound = hold.x + halfWidth;
  let inXBounds = (mx > leftBound) && (mx < rightBound);

  let halfHeight = image.height / 2;
  let topBound = hold.y - halfHeight;
  let bottomBound = hold.y + halfHeight;
  let inYBounds = (my > topBound) && (my < bottomBound);

  return (inXBounds && inYBounds);
}

function fixupEditMenu(selection) {
  document.getElementById('ehsm-x').value = parseInt(selection.x);
  document.getElementById('ehsm-y').value = parseInt(selection.y);
  document.getElementById('ehsm-r').value = parseInt(selection.r);
  document.getElementById('ehsm-f').checked = selection.f;
  document.getElementById('ehsm-sx').value = parseFloat(selection.sx);
  document.getElementById('ehsm-sy').value = parseFloat(selection.sy);
  document.getElementById('ehsm-color').value = selection.c;
  document.getElementById('ehsm-path').value = selection.model;
  updateHoldPreview();
}

function svRue() {
  console.log('Saving route...');
  let route = myState.route;
  // should do check here

  const db = firebase.firestore();
  db.collection('routes').add(route)
    .then(() => {
      console.log('Document successfully written!');
    })
    .catch(() => {
      console.log('Error writing document.')
    });
}

async function saveRoute() {
  console.log('Saving route...');
  let db = firebase.firestore();
  if (myState.routeId === null || !myState.keyAccepted) {
    saveRouteAs();
    return;
  }
  let route = myState.route;
  let routeRef = db.collection('routes').doc(myState.routeId);
  let docSnapshot = await routeRef.get()
  if (docSnapshot.exists) {
    if (confirm('Are you sure you want to overwrite current route version?')) {
      db.collection('routes').doc(routeRef.id).set(route);
      console.log('Successfully overwrote route.');
    }
    else {
      saveRouteAs();
    }
  }
  else {
    db.collection('routes').routeRef.set(route);
  }
}

async function saveRouteAs() {
  console.log('Saving route as...');
  let db = firebase.firestore();
  let route = myState.route;
  let promptText = 'To save your route, enter an edit key for later';
  let key = prompt(promptText, 'default');
  if (key === null) {
    console.log('Saving route cancelled');
    return;
  }
  route.editKey = key;
  try {
    let routeRef = await db.collection('routes').add(route);
    myState.routeId = routeRef.id;
    myState.keyAccepted = true;
    console.log('Successfully saved route.');
  }
  catch {
    console.log('Could not save route.');
  }
}

function updateHoldPreview() {
  let previewImagePath = document.getElementById('ehsm-path').value;
  let previewImageEl = assets[previewImagePath].cloneNode(true);
  previewImageEl.classList.add('preview');
  let previewImageDiv = document.getElementById('hold-preview');
  let lastPreviewImageEl = previewImageDiv.lastElementChild;
  if (lastPreviewImageEl != null) {
    previewImageDiv.removeChild(lastPreviewImageEl);
  }
  previewImageDiv.appendChild(previewImageEl);
}

//////////////
function openHoldType(evt, holdType) {
  // Declare all variables
  let i, tabcontent, tablinks;

  // Get all elements with class='tabcontent' and hide them
  tabcontent = document.getElementsByClassName('tabcontent');
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }

  // Get all elements with class='tablinks' and remove the class 'active'
  tablinks = document.getElementsByClassName('tablinks');
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }

  // Show the current tab, and add an 'active' class to the button that opened the tab
  document.getElementById(holdType).style.display = 'block';
  evt.currentTarget.className += ' active';
}
////////////////

function populateHoldBrowser() {
  //this is kind of hacky, especially with the string work
  //this should be changed later TODO
  //maybe not using assets for this and have a hold
  //collection in firebase in addition to the assets
  const entries = Object.entries(assets);
  editMenuModelSelect = document.getElementById('ehsm-path');
  for (const [path, img] of entries) {
    if (path.includes('holds')) {
      //add the option to the select element
      let option = document.createElement('option');
      option.text = path;
      editMenuModelSelect.add(option);
      //get typestring
      let idx1 = path.indexOf('/') + 1;
      let idx2 = path.lastIndexOf('/');
      let typestr = path.substr(idx1, idx2 - idx1);
      if (typestr.length > 0) {
        //add image to correct list
        let par = document.getElementById(typestr + 'list');
        let imgchild = par.appendChild(img);
        //on click the selection option should change and
        //the previous should be updated
        imgchild.addEventListener('click', function(){ 
          let selectionEl = editMenuModelSelect;
          selectionEl.value = path;
          updateHoldPreview();
          myState.selection.model = path;
          myState.valid = false;
        });
      }
    }
  }
}


function addTagFromMetaMenu() {
  let tag = document.getElementById('meta-add-tag').value.toLowerCase()
  let tags = myState.route.tags;
  if (tag != '') {
    if (tags.indexOf(tag) === -1) {
      myState.route.tags.push(tag);
      addTagToTagDisplay(tag);
    }
  }
}

function addTagToTagDisplay(tag) {
  let tagList = document.getElementById('taglist');
  let tagItem = document.createElement('li');
  tagItem.innerHTML = tag + ' | x' ;
  tagItem.setAttribute('data-tagString', tag);
  tagItem.addEventListener('click', function () {
    let tagString = this.getAttribute('data-tagString');
    indexToRemove = myState.tags.indexOf(tagString)
    myState.tags.splice(indexToRemove, 1);
    this.remove();
  });
  tagList.appendChild(tagItem);
}

function updateSaveNotification() {
  let div = document.getElementById('save-notification');
  let notification = 'Editing a new route';
  if (myState.routeId != null) {
    if (myState.keyAccepted) {
      notification = 'Overwriting route with id ' + myState.routeId
    }
  }
  div.innerHTML = notification;
}

function fixupMetaData() {
  let route = myState.route;
  document.getElementById('meta-name').value = route.name;
  document.getElementById('route-grade-display').innerHTML = route.grade;
  document.getElementById('meta-setter').value = route.setter;
  document.getElementById('meta-desc').value = route.description;
  for (tag of route.tags) {
    addTagToTagDisplay(tag);
  }
}

function addEditHoldEventListeners() {
  let xInput = document.getElementById('ehsm-x');
  xInput.oninput = function () {
    myState.selection.x = parseInt(xInput.value);
    myState.valid = false;
  }
  let yInput = document.getElementById('ehsm-y');
  yInput.oninput = function () {
    myState.selection.y = parseInt(yInput.value);
    myState.valid = false;
  }
  let rInput = document.getElementById('ehsm-r');
  rInput.oninput = function () {
    myState.selection.r = parseInt(rInput.value);
    myState.valid = false;
  }
  let fInput = document.getElementById('ehsm-f');
  fInput.onchange = function () {
    myState.selection.f = fInput.checked;
    myState.valid = false;
  }
  let sxInput = document.getElementById('ehsm-sx');
  sxInput.oninput = function () {
    myState.selection.sx = parseFloat(sxInput.value);
    myState.valid = false;
  }
  let syInput = document.getElementById('ehsm-sy');
  syInput.oninput = function () {
    myState.selection.sy = parseFloat(syInput.value);
    myState.valid = false;
  }
  let pathInput = document.getElementById('ehsm-path');
  pathInput.onchange = function () {
    myState.selection.model = pathInput.value;
    myState.valid = false;
  }
}

function addMetaDataEventListeners() {
  let nameInput = document.getElementById('meta-name');
  nameInput.oninput = function () {
    myState.route.name = nameInput.value;
  }
  let setterInput = document.getElementById('meta-setter');
  setterInput.oniput = function () {
    myState.route.setter = setterInput.value;
  }
  let descInput = document.getElementById('meta-desc');
  descInput.oninput = function () {
    myState.route.description = descInput.value;
  }
}

function increaseGrade() {
  let grade = myState.route.grade;
  if (grade < 16) {
    grade = ++myState.route.grade;
  }
  gradeDisplay = document.getElementById('route-grade-display');
  gradeDisplay.innerHTML = grade;
}

function decreaseGrade() {
  let grade = myState.route.grade;
  if (grade > 0) {
    grade = --myState.route.grade;
  }
  gradeDisplay = document.getElementById('route-grade-display');
  gradeDisplay.innerHTML = grade;
}
