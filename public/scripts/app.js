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
  drawRoute(null);
});

function initRouteBrowser() {

  routeBrowserDiv = document.getElementById('route-browser');

  const db = firebase.firestore();

  db.collection('routes')
    .get()
    .then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        // doc.data is never undefined for query snapshots
        // doc a query document snapshot, and is "shallow"
        routeData = doc.data();
        MAX_CHAR = 16
        nameString = elipseTruncate(routeData.name, MAX_CHAR);
        setterString = elipseTruncate(routeData.setter, MAX_CHAR);

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
          drawRoute(holdCollection);
        }
        browser.appendChild(button);
      });
    })
    .catch(function(error) {
      console.log('Error getting documents: ', error);
    });

}

// Setup canvas function
function initRouteViewer() {
  routeViewerDiv = document.getElementById('route-viewer');
  canvas = document.getElementById('route-canvas');
  ctx = canvas.getContext('2d');

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
      height = scale * holdImage.height;
      width = scale * holdImage.width;
      x = scale * holdData.x;
      y = scale * holdData.y;
      ctx.drawImage(holdImage, x, y, width, height);
    }
  });
}

function getViewerScale(callback) {
  const wallImage = new Image();
  wallImage.src = '../assets/wall_images/all.png'
  wallImage.onload = function() {
    scale = 0.75 * window.innerHeight / wallImage.height;
    callback(scale);
  }
}

// fuction updateBrowser(currentRoute)
// put current route on top, grayed out


//
// HELPER FUNCTIONS
//

function elipseTruncate(string, length) {
  if (string.length > length) {
    string = string.substr(0, length-3) + '...';
  }
  return string
}
