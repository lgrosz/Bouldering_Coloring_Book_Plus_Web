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
  initRouteViewer();
});

function initRouteViewer() {
  clearWall(false);
}

function initRouteBrowser() {

  routeBrowserDiv = document.getElementById('route-browser');

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
        var browser = document.getElementById('route-browser');
        button.onclick = function () {
          // reload browser
          holdCollection = db.collection('routes').doc(doc.id).collection('holds');
          clearWall();
          drawRoute(holdCollection);
        }
        browser.appendChild(button);
      });
    })
    .catch(function(error) {
      console.log('Error getting documents: ', error);
    });
}

function clearWall(clearWall=true) {
  canvas = document.getElementById('route-canvas');
  ctx = canvas.getContext('2d');

  if (clearWall == true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const wallImage = new Image();
  wallImage.src = '../assets/wall_images/all.png';
  wallImage.onload = function() {
    // canvas needs to be the same dimensions
    getViewerScale(function(scale){
      height = scale * wallImage.height;
      width = scale * wallImage.width;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(wallImage, 0, 0, width, height);
    });
  }
}

function drawRoute(holdCollection) {
  if (holdCollection != null) {
    holdCollection.get()
      .then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          holdData = doc.data();
          drawHold(holdData);
        });
      });
  }
}

function drawHold(holdData, holdImage) {
  //recolor
  getViewerScale(function(scale) {
    // scale, place, rotate
    holdImage = new Image();
    holdImage.src = holdData.model;
    holdImage.onload = function() {
      x = scale * holdData.x;
      y = scale * holdData.y;
      s = holdData.scale;
      r = holdData.r;
      //move to center, rotate, and draw (at center)
      drawImage(holdImage, x, y, s, r);
    }
  });
}
// no need to use save and restore between calls as it sets the transform rather 
// than multiply it like ctx.rotate ctx.translate ctx.scale and ctx.transform
// Also combining the scale and origin into the one call makes it quicker
// x,y position of image center
// scale scale of image
// rotation in radians.
// Thanks to Blindman67 on stackoverflow for this blazingly fast implementation
function drawImage(image, x, y, scale, rotation){
    ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
    ctx.rotate(rotation);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
}  

function getViewerScale(callback) {
  const wallImage = new Image();
  wallImage.src = '../assets/wall_images/all.png'
  wallImage.onload = function() {
    scale = 0.75 * window.innerHeight / wallImage.height;
    callback(scale);
  }
}
