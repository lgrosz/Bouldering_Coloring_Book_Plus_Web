document.addEventListener('DOMContentLoaded', event => {
  // load firebase app
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
    document.getElementById('load-firebase').innerHTML = 'Firebase load was unsuccessful, see console';
  }
  initRouteBrowser();
  init();
});

function init() {
  wall = new ViewerState(document.getElementById('route-canvas'));
  wall.draw();
}

function ViewerState(canvas) {
  // setup canvas dimensions
  this.div = document.getElementById('wall-div');
  this.canvas = canvas;
  //we will find this out once we draw or we can hardcode it
  this.scale = null;
  this.holds = [];
  this.ctx = canvas.getContext('2d');

  // image storage
  // {"path": image}
  this.images = {};

  // have to be able to access the object in eventListeners
  // when I have them that is
  myState = this;
}

ViewerState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

ViewerState.prototype.draw = function() {
  let ctx = this.ctx;
  this.clear();

  // background
  if ('../assets/wall_images/all.png' in myState.images) {
    image = this.images['../assets/wall_images/all.png'];
    ctx.drawImage(image, 0, 0, myState.width, myState.height);
  }
  else {
    const wallImage = new Image();
    wallImage.src = '../assets/wall_images/all.png';
    wallImage.onload = function() {
      myState.canvas.height = myState.div.clientHeight;
      newHeight = myState.canvas.clientHeight;
      myState.scale = newHeight / wallImage.height;
      newWidth = myState.scale * wallImage.width;
      myState.canvas.width = newWidth;
      myState.width = newWidth;
      myState.height = newHeight;
      ctx.drawImage(wallImage, 0, 0, newWidth, newHeight);
      myState.images['../assets/wall_images/all.png'] = wallImage;
    }
  }
}

ViewerState.prototype.drawRoute = function(routeDocumentId) {
  const db = firebase.firestore();
  let myState = this;
  routeDoc = db.collection('routes').doc(routeDocumentId);
  if (routeDoc != null) {
    this.draw();
    routeDoc.get()
      .then(function(doc) {
        routeData = doc.data();
        for (let i = 0; i < routeData.holds.length; i++) {
          let holdData = routeData.holds[i];
          loadImage(holdData.model)
            .then(image => {
              drawHold(myState.ctx, myState.scale, holdData, image);
            })
            .catch(err => {
              console.error(err);
            });
        }
      })
      .catch(function(error) {
        console.log('Error getting document:', error);
      });
  }
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

function drawHold(ctx, scale, holdData, image) {
  let {x, y, r, sx, sy, c} = holdData;
  x = x * scale;
  y = y * scale;
  let w = sx * image.width
  let h = sy * image.height
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

function toggleRouteBrowser() {
  let browserDiv = document.getElementById('route-browser')
  if (browserDiv.classList.contains('hidden')){
    console.log('unhiding');
    browserDiv.classList.remove('hidden');
  }
  else {
    console.log('hiding');
    browserDiv.classList.add('hidden');
  }
}
