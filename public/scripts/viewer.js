document.addEventListener('DOMContentLoaded', event => {
  // load firebase app
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
    document.getElementById('load-firebase').innerHTML = 'Firebase load was unsuccessful, see console';
  }
  init();
});

function init() {
  wall = new ViewerState(document.getElementById('route-canvas'));
  wall.drawBackground();
  initRouteBrowser();
  document.getElementById('routetitle').innerHTML = 'Select route in browser';
  document.getElementById('routesetter').innerHTML = '(to the left)';
}

function ViewerState(canvas) {
  // setup canvas dimensions
  this.div = document.getElementById('wall-div');
  this.canvas = canvas;
  //we will find this out once we draw or we can hardcode it
  this.scale = null;
  this.holds = [];
  this.ctx = canvas.getContext('2d');
  this.backgroundImage = null;

  // have to be able to access the object in eventListeners
  // when I have them that is
  myState = this;

}

ViewerState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

ViewerState.prototype.drawBackground = function() {
  let ctx = this.ctx;
  let myState = this;

  if (this.backgroundImage === null) {
    loadImage('walls/sdsmt/all.png')
      .then(image => {
        newHeight = myState.div.clientHeight - 200;
        myState.canvas.height = newHeight;
        myState.scale = newHeight / image.height;
        newWidth = myState.scale * image.width;
        myState.canvas.width = newWidth;
        myState.width = newWidth;
        myState.height = newHeight;
        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        myState.backgroundImage = image;
      })
      .catch(err => {
        console.error(err);
      });
  }
  else {
    ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
  }
}

ViewerState.prototype.resetWall = function() {
  this.clear();
  this.drawBackground();
}

ViewerState.prototype.drawRoute = function(routeDocumentId) {
  const db = firebase.firestore();
  let myState = this;
  routeDoc = db.collection('routes').doc(routeDocumentId);
  if (routeDoc != null) {
    this.resetWall();
    routeDoc.get()
      .then(function(doc) {
        routeData = doc.data();
        document.getElementById('routetitle').innerHTML = routeData.name + ' | V' + routeData.grade;
        document.getElementById('routesetter').innerHTML = routeData.setter;
        document.getElementById('routedesc').innerHTML = routeData.description;
        //best way to do this would be to resolve ALL promises for images
        //then clear the route, then draw the holds so there can't be
        //multiple routes up at the same time.
        //problem: how do I associate the promise array with specific
        //holds on the route?
        routeData.holds.forEach(holdData => {
          loadImage(holdData.model)
            .then(image => {
              myState.drawHold(holdData, image);
            })
            .catch(err => {
              console.error(err);
            });
        });
      })
      .catch(function(error) {
        console.log('Error getting document:', error);
      });
  }
}

ViewerState.prototype.drawHold = function(holdData, image) {
  let ctx = this.ctx;
  let scale = this.scale;
  let {x, y, r, sx, sy, c} = holdData;
  x = x * scale;
  y = y * scale;
  let w = image.width
  let h = image.height
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r * Math.PI / 180);
  ctx.drawImage(image, -w/2*sx*scale, -h/2*sy*scale, w*sx*scale, h*sy*scale);
  ctx.beginPath();
  ctx.ellipse(0, 0, w/8*sx*scale, h/8*sy*scale, 0, 0, 2*Math.PI);
  ctx.fillStyle = '#' + c;
  ctx.fill();
  ctx.restore();
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

/////////////////////////////////////
function initRouteBrowser() {

  let routeButtonGroup = document.getElementById('route-button-group');

  const db = firebase.firestore();

  db.collection('routes')
    .get()
    .then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        routeData = doc.data();
        nameString = routeData.name;
        setterString = routeData.setter;

        //setup button
        var button = document.createElement('button');
        button.classList.add('browser-button');
        button.innerHTML = nameString
                           + ' | V' + routeData.grade
                           + '<br />' + setterString;
        button.onclick = function () {
          myState.drawRoute(doc.id);
          console.log(doc.id);
        }
        routeButtonGroup.appendChild(button);
      });
    })
    .catch(function(error) {
      console.log('Error getting documents: ', error);
    });
}

function toggleMenu(menuId, forceOff=false) {
  let menuDiv = document.getElementById(menuId);
  if (forceOff) {
    menuDiv.classList.remove('open');
  }
  else {
    menuDiv.classList.toggle('open');
  }
  //close all submenus (not working becaues they're not actually children)
  if (!menuDiv.classList.contains('open')) {
    let children = menuDiv.children;
    for(let i = 0; i < children.length; i++) {
      let child = children[i];
      if (child.classList.contains('submenu')) {
        toggleMenu(child.id, true);
      }
    }
  }
}
