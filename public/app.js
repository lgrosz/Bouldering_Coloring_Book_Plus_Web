document.addEventListener("DOMContentLoaded", event => {
    
    // load firebase app
    try {
        const app = firebase.app();
        document.getElementById('load-firebase').innerHTML = "Firebase was loaded.";
    } catch (e) {
        console.error(e)
        document.getElementById('load-firebase').innerHTML = "Firebase load was unsuccessful, see console";
    }

    // do stuff with route browser
    route_browser();

});

// Display routes function
function route_browser(){

    route_browser_div = document.getElementById("route-browser");

    const db = firebase.firestore();
    const routes_collection = db.collection("routes");
    const myroute = routes_collection.doc("The Cheat");
    
    myroute.get()
        .then(doc => {
            const data = doc.data();
            console.log(data.name);
            console.log(data.grade);
            console.log(data.setter);
        })
}
