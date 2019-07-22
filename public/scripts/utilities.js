// Project specific helpers

// Load assets from firebase
async function loadAssets() {
  let imagePathToElMap = {};
  // get all hold image paths from firestore 
  const db = firebase.firestore();
  await db.collection('asset-paths')
    .get()
    .then(async(querySnapshot) => {
      let imagePaths = [];
      // fill array of asset paths
      querySnapshot.forEach(doc => {
        let holdData = doc.data();
        let path = holdData.path;
        imagePaths.push(path);
      });
      const imageUrls = await Promise.all(imagePaths.map(path => getFirebaseStorageUrl(path)));
      const imageEls = await Promise.all(imageUrls.map(url => loadImage(url)));
      // map paths to image elements
      imagePaths.forEach(function(key, index) {
        imagePathToElMap[key] = imageEls[index];
      });
    });
  return imagePathToElMap;
}

// toggle or force off a menu
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


// Abstract utilities

// Get the download url for a file in firebase storage
async function getFirebaseStorageUrl(path) {
  const storage = firebase.storage();
  const storageRef = storage.ref().child(path);
  let url = await storageRef.getDownloadURL();
  return url;
}

// load an image from a source
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", err => reject(err));
    img.src = src;
  });
}

// get paramter object from url
function getUrlParams() {
    var params = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        params[key] = value;
    });
    return params;
}
