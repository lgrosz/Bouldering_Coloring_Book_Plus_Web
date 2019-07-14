document.addEventListener('DOMContentLoaded', event => {
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
  }

  console.log('hi');
  loadImage('walls/sdsmt/all.png')
    .then( img => {
      console.log('hihi');
      let centerDiv = document.getElementById('center-div');
      img.classList.add('fitwidth');
      centerDiv.appendChild(img);
    });
});

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', err => reject(err));
    // get image from firebase storage
    const storage = firebase.storage();
    const storageRef = storage.ref().child(path);
    storageRef.getDownloadURL().then( url => {
      img.src = url;
    });
  });
}
