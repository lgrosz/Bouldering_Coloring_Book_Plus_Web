document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  try {
    const app = firebase.app();
    console.log('Firebase was loaded');
  } catch (e) {
    console.error(e)
  }

  loadCenterImage();
}

async function loadCenterImage() {
  let path = await getFirebaseStorageUrl('walls/sdsmt/all.png');
  let imgEl = await loadImage(path);
  imgEl.classList.add('fitwidth');
  let centerImgDiv = document.getElementById('center-div');
  centerImgDiv.appendChild(imgEl);
}
