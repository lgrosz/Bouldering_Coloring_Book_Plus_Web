document.addEventListener('DOMContentLoaded', onload)

async function onload() {
  //initialize canvas state, globals
  tags = await loadTags();
  setupTagChecklist();

  assets = await loadAssets();
  myState = new ViewerState(document.getElementById('route-canvas'));

  // deal with url parameters
  let params = getUrlParams();
  if (params['id'] != undefined) {
    loadRoute(params['id']);
  }

  populateRouteBrowser();
  addCssEventListeners();
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

function ViewerState(canvas) {
  this.div = document.getElementById('wall-div');
  this.canvas = canvas;

  // route specifics
  this.route = null;
  this.routeId = null;

  // visual only
  this.scale = null;
  this.backgroundImage = assets['walls/sdsmt/all.png'];
  this.ctx = canvas.getContext('2d');

  // initialization
  this.drawBackground();
}

ViewerState.prototype.clear = function() {
  let canvas = this.canvas;
  this.ctx.clearRect(0, 0, canvas.width, canvas.height);
}

ViewerState.prototype.drawBackground = function() {
  let canvas = this.canvas;
  let ctx = this.ctx;
  let containerHeight = this.div.clientHeight;

  canvas.height = containerHeight;
  this.scale = canvas.height / this.backgroundImage.height;
  canvas.width = this.scale * this.backgroundImage.width;

  ctx.drawImage(this.backgroundImage, 0, 0, canvas.width, canvas.height);
}

ViewerState.prototype.resetWall = function() {
  this.clear();
  this.drawBackground();
  this.drawRoute();
}

ViewerState.prototype.drawRoute = function() {
  let route = this.route;
  let holds = route.holds;
  for (hold of holds) {
    this.drawHold(hold);
  }
  // meta data
  document.getElementById('routetitle').innerHTML = route.name + ' | V' + route.grade;
  document.getElementById('routesetter').innerHTML = route.setter;
  document.getElementById('routedesc').innerHTML = route.description;
}

ViewerState.prototype.drawHold = function(holdData) {
  let ctx = this.ctx;
  let scale = this.scale;
  let image = assets[holdData.model];
  let {x, y, r, f, sx, sy, c} = holdData;
  x = x * scale;
  y = y * scale;
  let w = image.width
  let h = image.height
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r * Math.PI / 180);
  if (f) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, -w/2*sx*scale, -h/2*sy*scale, w*sx*scale, h*sy*scale);
  //ctx.beginPath();
  //ctx.ellipse(0, 0, w/8*sx*scale, h/8*sy*scale, 0, 0, 2*Math.PI);
  //ctx.fillStyle = '#' + c;
  //ctx.fill();
  ctx.restore();
}

function populateRouteBrowser(filter=[], minGrade=0, maxGrade=16) {
  let routeButtonGroup = document.getElementById('route-button-group');

  const db = firebase.firestore();
  let query = db.collection('routes');

  console.log({filter, minGrade, maxGrade});
  for (tag of filter) {
    query = query.where('tags', 'array-contains', tag);
  }
  query = query.where('grade', '>=', minGrade);
  query = query.where('grade', '<=', maxGrade);
  query.get()
    .then(querySnapshot => {
      //remove all route buttons before populating it again
      while (routeButtonGroup.firstChild) {
        routeButtonGroup.removeChild(routeButtonGroup.firstChild);
      }
      querySnapshot.forEach(doc => {
        routeData = doc.data();
        routeButton = getRouteButton(routeData);
        routeButton.onclick = function () {
          loadRoute(doc.id);
        }
        routeButtonGroup.appendChild(routeButton);
      });
    })
    .catch(function(error) {
      console.log('Error getting documents: ', error);
    });
}

function editCurrentRoute() {
  let promptString = 'Enter the edit key for this route.';
  let key = prompt(promptString, 'key');
  console.log(key);
  if (key != null) {
    let parameters = '?id=' + myState.routeId + '&key=' + key;
    window.location.href = 'creator.html' + parameters;
  }
}

function getRouteButton(routeData) {
  nameString = routeData.name;
  setterString = routeData.setter;
  gradeString = 'V' + routeData.grade;

  //setup button
  let button = document.createElement('table');
  button.classList.add('route-button');
  let buttonRow1 = document.createElement('tr');
  let buttonRow2 = document.createElement('tr');
  let buttonName = document.createElement('td');
  //let buttonNameSpan = document.createElement('span');
  //buttonNameSpan.innerHTML = nameString;
  buttonName.classList.add('route-button-name');
  buttonName.innerHTML = nameString;
  //buttonName.appendChild(buttonNameSpan);
  let buttonSetter = document.createElement('td');
  buttonSetter.classList.add('route-button-setter');
  buttonSetter.innerHTML = setterString;
  let buttonGrade = document.createElement('td');
  buttonGrade.setAttribute('rowspan', '2');
  buttonGrade.classList.add('route-button-grade');
  buttonGrade.innerHTML = gradeString;
  buttonRow1.appendChild(buttonGrade);
  buttonRow1.appendChild(buttonName);
  buttonRow2.appendChild(buttonSetter);
  button.appendChild(buttonRow1);
  button.appendChild(buttonRow2);
  return button;
}

function setupTagChecklist() {
  let checklistDiv = document.getElementById('tag-checkbox-div');
  for (tagString of tags) {
    // setup span to contain the input and label
    let spanContainer = document.createElement('span');
    spanContainer.style.display = 'block'
    // setup input element
    let checkbox = document.createElement('input');
    checkbox.id = 'tag-' + tagString;
    checkbox.type = 'checkbox';
    checkbox.value = tagString;
    // label for that input element
    let checkboxLabel = document.createElement('label');
    checkboxLabel.for = 'tag-' + tagString;
    checkboxLabel.style.whiteSpace = 'nowrap';
    checkboxLabel.innerHTML = tagString;
    spanContainer.appendChild(checkbox);
    spanContainer.appendChild(checkboxLabel);
    checklistDiv.appendChild(spanContainer);
    // update route data when that input box changes
    checkbox.onchange = function () {
      let filter = getFilter();
      populateRouteBrowser(filter);
    }
  }
}

function getFilter() {
  let filter = [];
  let checklistDiv = document.getElementById('tag-checkbox-div');
  let spanArray = Array.from(checklistDiv.children);
  for (span of spanArray) {
    if (span.firstChild.checked) {
      filter.push(span.firstChild.value)
    }
  }
  //issue 1: array contains query requires index
  //issue 2: cannot chain array-contains queries
  return filter;
}

//FROM CREATOR PAGE
function addCssEventListeners() {
  // ACCORDIONS
  let accordions = document.getElementsByClassName('accordion');

  for (acc of accordions) {
    acc.addEventListener('click', function() {
      this.classList.toggle('active');
      let panel = this.nextElementSibling;
      if (panel.style.height){
        panel.style.height = null;
      } else {
        panel.style.height = panel.scrollHeight + 'px';
      } 
    });
  }
}
