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
function route_browser() {

    route_browser_div = document.getElementById("route-browser");

    const db = firebase.firestore();

    db.collection("routes")
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                // doc.data is never undefined for query snapshots
                route_data = doc.data();

                //make strings fit in the button
                //TODO Make this more robust - measure the strrngs on each
                //     line and see if that string will exceed the length
                //     of the button set in the stylesheet.
                MAX_CHAR = 16
                name_string = elipse_truncate(route_data.name, MAX_CHAR);
                setter_string = elipse_truncate(route_data.setter, MAX_CHAR);

                //setup button
                var button = document.createElement("button");
                button.innerHTML = name_string
                                   + " | V" + route_data.grade
                                   + "<br />" + setter_string;
                var browser = document.getElementById("route-browser");
                browser.appendChild(button);
                console.log(doc.id, " => ", route_data);
            });
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    
}

//
// HELPER FUNCTIONS
//

function elipse_truncate(string, length) {
    if (string.length > length) {
        string = string.substr(0, length-3) + "...";
    }
    return string
}
