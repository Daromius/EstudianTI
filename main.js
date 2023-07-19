$(document).ready(function(){
  // Coordinates to center the map. Could let the user choose when creating a room & persist when sharing a link (via GET params)
  const lat = -36.742424410590026;
  const lon =  -72.46805777156217;

  // Initialize the Leaflet map
  var map = L.map('mapDiv', {
    renderer: L.canvas({ tolerance: 10 })
  }).setView([lat, lon], 13);
  L.PM.setOptIn(true);
  var db = firebase.database();
  var enteringdata = false;
  var session = 0;
  var drawing = false;
  var erasing = false;
  var markerson = false;
  var objects = [];
  var currentid = 0;
  var userlocation = "";
  var lati = "";
  var longi = "";
  var room = "";
  var verif = "no";
  var hacer = "no";
  wa = "no";
  we = "no";
  wo = "no";

  // Get URL params
  var params = new URLSearchParams(window.location.search);

  // Check if URL has the file GET parameter, use it to set the room. Could rewrite URL to be more fancy
  if (params.has('file')) {
    room = params.get('file');
    $("#share-url").val(window.location.href);
  }

  // Oddly enough Firebase auth doesn't initialize right on startup. It needs a slight delay?
  window.setTimeout(function(){
    if (checkAuth() && params.has('file')) {
      checkData();
    } else {
      if (checkAuth() && !params.has('file')) {
        // Prompt the user to create a map
        window.location.replace(window.location.href+"?file=mapa");
      }
    }
  }, 500)

  function initMap() {
    // Makimum bounds for zooming and panning
    map.setMaxBounds([[84.67351256610522, -174.0234375], [-58.995311187950925, 223.2421875]]);

    // Set the tile layer. Could use Mapbox, OpenStreetMap, etc.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 7,
      zoomControl: false,
      noWrap: true
    }).addTo(map);
map.locate({setView: true, maxZoom: 20});
    // Hide the default zoom control. I want a custom one!
    map.removeControl(map.zoomControl);

    // No idea why but Leaflet seems to place default markers on startup...
    $("img[src='https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png']").remove();
  }

  // Show live location
  function liveLocation() {
    if (navigator.geolocation) {
      // Get initial location
      navigator.geolocation.getCurrentPosition(function(position){
        var icon = L.icon({
          iconUrl: 'assets/liveLocation.svg',
          iconSize:     [24, 24],
          iconAnchor:   [12, 12],
        });
        // Create a marker to show the user location
        userlocation = L.marker([position.coords.latitude, position.coords.longitude], {icon:icon, pane: "overlayPane"});
        userlocation.addTo(map);
      });
    }
  }




  function rutamark(){

    
if (hacer == "no") {
  routingControl = L.Routing.control({
    waypoints: [
      null
    ],
    language: 'es', // here's the magic
    draggableWaypoints: false,
    addWaypoints: false,
    fitSelectedRoutes: false,
    createMarker: function() { return null; }
}).addTo(map);
}

    

routingControl.setWaypoints([
  L.latLng(userlocation.getLatLng()),
  L.latLng(lati, longi),
]);

hacer = "si"
  }
  
function editmark(marker){
}

  function targetLiveLocation() {


    // Check if user has geolocation enabled
    if (navigator.geolocation) {
      if (userlocation != "") {
        // If current location is already set, fly there
        navigator.geolocation.getCurrentPosition(function(position){
          userlocation.setLatLng([position.coords.latitude, position.coords.longitude]);

          // Flies to the location (more fancy)
          map.flyTo(userlocation.getLatLng(), 18)
        });
      } else {
        // If the location is unknown, set it and fly there
        liveLocation();
        targetLiveLocation();
      }
    }
  }

  // Tooltips for UI elements
  function showTooltip() {
    if ($(this).attr("id") == "cursor-tool") {
      $(this).append('<div id="tooltip">Mover</div>');
    } else if ($(this).attr("id") == "marker-tool") {
      $(this).append('<div id="tooltip">Marcador</div>');
    } 
  }
  function hideTooltip() {
    $(this).find("#tooltip").remove();
  }

  // Reset tools (when switching tools)
  function resetTools() {
    drawing = false;
    erasing = false;
    markerson = false;
    lineon = false;
    map.pm.disableDraw();
    map.pm.disableGlobalRemovalMode();
    map.pm.disableGlobalDragMode();
  }

  // Enable cursor tool (default)
  function cursorTool() {
    resetTools();
    map.dragging.enable();
    $(".tool-active").removeClass("tool-active");
    $("#cursor-tool").addClass("tool-active");
  }




  // Enable marker tool
  function markerTool() {
    var user = checkAuth();
    if (user != "patata") {resetTools();
    
      markerson = true;
      $(".tool-active").removeClass("tool-active");
      $("#marker-tool").addClass("tool-active");
      showAnnotations();} else {
        resetTools()}
    
  }


  


 
  // Sanitizing input strings
  function sanitize(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return string.replace(reg, (match)=>(map[match]));
  }

  // Perform a search query. No autocomplete due to API rules :(
  function search() {
    $.get('https://nominatim.openstreetmap.org/search?q='+sanitize($("#search-box input").val())+'&format=json', function(data) {
      // Navigate to the first result of the search query
      map.panTo(new L.LatLng(data[0].lat, data[0].lon));
    })
  }

  // Save marker/line/area data
  function saveForm(e) {
   if (document.getElementById("shape-tipo").value == "Seleccione un tipo" || document.getElementById("shape-desc").value == "" || document.getElementById("shape-name").value == "" )
    {alert('Complete todos los campos y/o seleccione tipo.')} 
    else 
     {
      var user = checkAuth();
      if (checkAuth() != false) {
        enteringdata = false;
        var inst = objects.filter(function(result){
          return result.id === currentid && result.user === user.uid;
        })[0];
  
        // Get input values for the name and description and sanitize them
        inst.name = sanitize($("#shape-name").val());
        inst.desc = sanitize($("#shape-desc").val());
        inst.tipo = sanitize($("#shape-tipo").val());
        inst.completed = true;
     
        // Remove existing popup (for inputting data)
        inst.trigger.unbindTooltip();
        if (inst.type == "marker") {
          // Create a popup showing info about the marker
          inst.trigger.bindTooltip('<h1>'+inst.name+'</h1><h2>'+inst.desc+'</h2><div class="shape-data"><h3><img src="assets/marker-small-icon.svg">'+inst.tipo+'</h3></div><div class="arrow-down"></div>', {permanent: false, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow", offset: L.point({x: 0, y: -35})});
          db.ref("rooms/"+room+"/objects/"+currentid).update({
            name: inst.name,
            desc: inst.desc,
            tipo: inst.tipo,
            borrar: "no",
            completed: true
            
          })
        }
  
        // Render the shape in the sidebar list and focus it
        renderObjectLayer(inst);
        $(".annotation-item[data-id='"+inst.id+"']").find(".annotation-name span").addClass("annotation-focus");
  
        // Automatically open the new popup with data about the shape
        window.setTimeout(function(){
          inst.trigger.openTooltip();
        }, 200)
      }
    }
    
  }





  // Don't save marker/line/area data (doesn't delete them, just reverts to defaults)
  function cancelForm() {
    var user = checkAuth();
    if (checkAuth() != false) {
      enteringdata = false;
      var inst = objects.filter(function(result){
        return result.id === currentid && result.user === user.uid;
      })[0];

      // Delete existing popup (for inputting data)
      inst.trigger.unbindTooltip();
      inst.completed = true;
      if (inst.type == "marker") {
        // Create a popup showing info about the marker
        db.ref("rooms/"+room+"/objects/"+currentid).remove()
      }

      // Render shape in the sidebar list and focus it
      renderObjectLayer(inst);
      $(".annotation-item[data-id='"+inst.id+"']").find(".annotation-name span").addClass("annotation-focus");

      // Automatically open the new popup with data about the shape
      window.setTimeout(function(){
        inst.trigger.openTooltip();
      }, 200)
    }
  }        

 
  // Create a new marker
  function createmarker1(lat, lng, user) {
    
    if (markerson) {
      // Go back to cursor tool after creating a marker
      cursorTool();
      // Set custom marker icon
      var marker_icon = L.divIcon({
        html: '<svg width="30" height="30" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M23 44.0833C23 44.0833 40.25 32.5833 40.25 19.1666C40.25 14.5916 38.4326 10.204 35.1976 6.96903C31.9626 3.73403 27.575 1.91663 23 1.91663C18.425 1.91663 14.0374 3.73403 10.8024 6.96903C7.56741 10.204 5.75 14.5916 5.75 19.1666C5.75 32.5833 23 44.0833 23 44.0833ZM28.75 19.1666C28.75 22.3423 26.1756 24.9166 23 24.9166C19.8244 24.9166 17.25 22.3423 17.25 19.1666C17.25 15.991 19.8244 13.4166 23 13.4166C26.1756 13.4166 28.75 15.991 28.75 19.1666Z" fill="#080808"/>/svg>',
        iconSize:     [30, 30], // size of the icon
        iconAnchor:   [15, 30], // point of the icon which will correspond to marker's location
        shadowAnchor: [4, 62],  // the same for the shadow
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
      });
      var marker = L.marker([lat, lng], {icon:marker_icon, direction:"top", interactive:true, pane:"overlayPane"});

      // Create a popup to set the name and description of the marker
      marker.bindTooltip('<label for="shape-name">Nombre</label><input id="shape-name" name="shape-name" /><label for="shape-type">Tipo</label><select id="shape-tipo" name="shape-tipo"><option>Seleccione un tipo</option><option value="Utiles">Utiles</option><option value ="Sodexo">Sodexo</option><option value ="Paradero">Paradero</option></select><label for="shape-desc">Descripcion</label><textarea id="shape-desc" name="description"></textarea><br><div id="buttons"><button class="cancel-button">Cancelar</button><button class="save-button">Guardar</button></div><div class="arrow-down"></div>', {permanent: true, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow create-form", offset: L.point({x: 0, y: -35})});
      marker.addTo(map);
      marker.openTooltip();
  currentid = db.ref("rooms/"+room+"/objects").push().key;
          var key = currentid;
          db.ref("rooms/"+room+"/objects/"+currentid).set({
            tipo: "",
            lat: lat,
            lng: lng,
            user: user.uid,
            type: "marker",
            m_type: "none",
            session: session,
            name: "Marker",
            desc: "",
            verif: verif,
            borrar: "si"
            
          })
 
        
      
      objects.push({id:currentid, user:user.uid, tipo:"", name:"Marker", m_type:"none",  desc:"", tipo:"", lat:lat, lng:lng, verif:verif, marker:marker, trigger:marker, session:session, completed:true, type:"marker"});
        
      // Detect when the tooltip is closed
      marker.on('tooltipclose', function(e){
        if (enteringdata) {
          // If closing the tooltip but the name and description haven't been set yet, revert to defaults
          cancelForm();
        } else {
          // De-select object from sidebar
          $(".annotation-item[data-id="+key+"]").find(".annotation-name span").removeClass("annotation-focus");
        }
      });

      // Detect when the marker is clicked
      marker.on('click', function(e){
        if (!erasing) {
          // Open tooltip when the marker is clicked
          marker.openTooltip();
        } else {
          // If erasing, delete the marker
          marker.remove();
          db.ref("rooms/"+room+"/objects/"+inst.id).remove();
          objects = $.grep(objects, function(e){
               return e.id != key;
          });
        }
      })
    }
  }

  // Map events
  map.addEventListener('mousedown', (event) => {
    var user = checkAuth();
    if (checkAuth() != false) {
      mousedown = true;
      // Get mouse coordinates and save them locally
      let lat = Math.round(event.latlng.lat * 100000) / 100000;
      let lng = Math.round(event.latlng.lng * 100000) / 100000;
      cursorcoords = [lat,lng];
      if (drawing) {
        // If the pencil tool is enabled, start drawing
        startDrawing(lat,lng,user);
      }
    }
  });
  map.addEventListener('click', (event) => {
    var user = checkAuth();
    if (checkAuth() != false) {
      // Get mouse coordinates and save them locally
      let lat = Math.round(event.latlng.lat * 100000) / 100000;
      let lng = Math.round(event.latlng.lng * 100000)  / 100000;
      cursorcoords = [lat,lng];
      // Create a marker if the marker tool is enabled
      createmarker1(lat,lng,user);
      if (drawing) {
        // If the pencil tool is enabled, start drawing
        startDrawing(lat,lng,user);
      }
    }
  });
  map.addEventListener('mouseup', (event) => {
    mousedown = false;
  })


  map.addEventListener('movestart', (event) => {
    dragging = true;
  });
  map.addEventListener('moveend', (event) => {
    dragging = false;
  });

  // Server code
  function checkAuth() {
      var user = firebase.auth().currentUser;
      if (user == null) {
          return "patata";
      } else {
          return user;
      }
  }
  

  // Sign in
  function signIn() {

    var provider = new firebase.auth.GoogleAuthProvider();

    // Make sure the session persists after closing the window so the user doesn't have to log in every time
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      // Sign in using Google
      firebase.auth().signInWithPopup(provider).then((result) => {
      


          // Get data from database
          checkData();
          location.reload();  
        
      });
    });
  }



  // Log out
  function logOut() {
    firebase.auth().signOut().then(function() {
      console.log('Sesion cerrada')
      location.reload();
    });
  }

  // Create a map
  function createMap() {
    var user = checkAuth();
    if (checkAuth() != false) {
      var key = db.ref('rooms').push().key;
      db.ref("rooms/"+key+"/details").set({
        name: "Estudianti",
      });
      window.location.replace(window.location.href+"?file=mapa");
    }
  }

  // Collapse/expand objects in the sidebar
  function toggleLayer(e) {
    e.preventDefault();
    e.stopPropagation();
    if ($(this).hasClass("arrow-open")) {
      $(this).removeClass("arrow-open");
      $(this).parent().parent().find(".annotation-details").addClass("annotation-closed");
    } else {
      $(this).addClass("arrow-open");
      $(this).parent().parent().find(".annotation-details").removeClass("annotation-closed");
    }
  }

  // Highlight an object in the sidebar
  function focusLayer() {
    showAnnotations();
    if (!$(this).find(".annotation-name span").hasClass("annotation-focus")) {
      const id = $(this).attr("data-id");
      const inst = objects.find(x => x.id === id);
       lati = inst.lat
       longi = inst.lng
      // De-select any previously selected objects
      $(".annotation-focus").removeClass("annotation-focus");

      // Close any opened tooltips
      map.eachLayer(function(layer){
        if (layer.options.pane != "markerPane") {
          layer.closeTooltip();
        }
      });

      // Make layer name bold to show that it has been selected
      $(this).find(".annotation-name span").addClass("annotation-focus");

      // Pan to the annotation and trigger the associated popup
      if (inst.type == "marker") {
        map.panTo(inst.marker.getLatLng());
        $(inst.marker.getTooltip()._container).removeClass('tooltip-off');
        inst.marker.openTooltip();
      }
    }
  }


  function filtermark() {
    if (wa == "si"){
      map.addLayer(utiles)
      wa = "no"
      
    }
    
else if (wa == "no"){
  map.removeLayer(utiles)

  wa = "si"
}

    
  }
  function filtermark2() {
    if (we == "si"){
      map.addLayer(sodexo)
      we = "no"
      
    }
    
else if (we == "no"){
  map.removeLayer(sodexo)

  we = "si"
}
  }
  function filtermark3() {
    if (wo == "si"){
      map.addLayer(paradero)
      wo = "no"
      
    }
    
else if (wo == "no"){
  map.removeLayer(paradero)

  wo = "si"
}
  }

  // Render object in the sidebar
  function renderObjectLayer(object) {
    // Check that the object isn't already rendered in the list
    var user = checkAuth();
      if (user.uid == "6imDRKIl9oc2qHxwvTirQrJC1yd2") {
        if (object.verif == "si") {
          if ($(".annotation-item[data-id='"+object.id+"']").length == 0) {
          
            if (object.tipo  == "Utiles") {
              const icon = '<img width="30" height="30" src="assets/utilsside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            }
            else if (object.tipo == "Sodexo") {
              const icon = '<img width="30" height="30" src="assets/restaurantside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            } else if (object.tipo == "Paradero") {
              const icon = '<img width="30" height="30" src="assets/busside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            }
          } else {
            // If the object already exists, update existing data
            const layer = $(".annotation-item[data-id='"+object.id+"']");
            if (object.type == "marker") {
              layer.find(".annotation-name span").html(object.name);
              layer.find(".annotation-description").html(object.desc);
              layer.find(".annotation-data").html('<div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div>');
            }
          }
        } else {
          if ($(".annotation-item[data-id='"+object.id+"']").length == 0) {
          if (object.tipo  == "Utiles") {
            const icon = '<img width="30" height="30" src="assets/utilsside-no.png">';
            $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"> <img class="verify-mark" src="assets/zoomin.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
          }
          else if (object.tipo == "Sodexo") {
            const icon = '<img width="30" height="30" src="assets/restaurantside-no.png">';
                        $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg">  <img class="verify-mark" src="assets/zoomin.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
          } else if (object.tipo == "Paradero") {
            const icon = '<img width="30" height="30" src="assets/busside-no.png">';
                        $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg">  <img class="verify-mark" src="assets/zoomin.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
          }
        } else {
          // If the object already exists, update existing data
          const layer = $(".annotation-item[data-id='"+object.id+"']");
          if (object.type == "marker") {
            layer.find(".annotation-name span").html(object.name);
            layer.find(".annotation-description").html(object.desc);
            layer.find(".annotation-data").html('<div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div>');
          }
        }
        }
        
      } else {
        
        if (object.verif == "si") {
          if ($(".annotation-item[data-id='"+object.id+"']").length == 0) {
          
            if (object.tipo  == "Utiles") {
              const icon = '<img width="30" height="30" src="assets/utilsside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            }
            else if (object.tipo == "Sodexo") {
              const icon = '<img width="30" height="30" src="assets/restaurantside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            } else if (object.tipo == "Paradero") {
              const icon = '<img width="30" height="30" src="assets/busside.png">';
              $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
            }
          } 
          else {
            // If the object already exists, update existing data
            const layer = $(".annotation-item[data-id='"+object.id+"']");
            if (object.type == "marker") {
              layer.find(".annotation-name span").html(object.name);
              layer.find(".annotation-description").html(object.desc);
              layer.find(".annotation-data").html('<div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div>');
            }
          }
        } else if (object.user == user.uid && object.verif == "no") {
          const icon = '<svg class="annotation-icon" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="23" height="23" rx="5" fill="#000000"/><path d="M16.0252 11.2709C16.0252 14.8438 11.3002 17.9063 11.3002 17.9063C11.3002 17.9063 6.5752 14.8438 6.5752 11.2709C6.5752 10.0525 7.07301 8.8841 7.95912 8.0226C8.84522 7.16111 10.047 6.67712 11.3002 6.67712C12.5533 6.67712 13.7552 7.16111 14.6413 8.0226C15.5274 8.8841 16.0252 10.0525 16.0252 11.2709Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.2996 12.8021C12.1695 12.8021 12.8746 12.1166 12.8746 11.2709C12.8746 10.4252 12.1695 9.73962 11.2996 9.73962C10.4298 9.73962 9.72461 10.4252 9.72461 11.2709C9.72461 12.1166 10.4298 12.8021 11.2996 12.8021Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          $("#annotations-list").prepend('<div class="annotation-item" data-id="'+object.id+'"><div class="annotation-name"><img class="annotation-arrow" src="assets/arrow.svg">'+icon+'<span>'+object.name+'</span><img class="delete-layer" src="assets/delete.svg"></div><div class="annotation-details annotation-closed"><div class="annotation-description">'+object.desc+'</div><div class="annotation-data"><div class="annotation-data-field"><img src="assets/marker-small-icon.svg">'+object.lat.toFixed(5)+', '+object.lng.toFixed(5)+'</div></div></div></div>');
        } else {
        }
        
      }
    
  }

  

  // Delete an object from the sidebar
  function verify() {
    const id = $(this).parent().parent().attr("data-id");
    const inst = objects.find(x => x.id === id);
    db.ref('rooms/'+room+'/objects/'+inst.id).update({
      verif: "si"
    })
    alert('Marcador verificado.')
  }

  function deleteLayer(e) {
    e.preventDefault();
    e.stopPropagation();
    const id = $(this).parent().parent().attr("data-id");
    const inst = objects.find(x => x.id === id);
    $(".annotation-item[data-id='"+id+"']").remove();
    if (inst.type != "marker") {
      inst.trigger.remove();
      inst.line.remove();
      db.ref("rooms/"+room+"/objects/"+inst.id).remove();
      objects = $.grep(objects, function(e){
           return e.id != inst.id;
      });
    } else {
      inst.marker.remove();
      db.ref("rooms/"+room+"/objects/"+inst.id).remove();
      objects = $.grep(objects, function(e){
           return e.id != inst.id;
      });
    }
  }
  
  // Toggle annotation visibility
  function toggleAnnotations() {
    if (!$("#hide-annotations").hasClass("hidden-annotations")) {
      $(".leaflet-overlay-pane").css({"visibility": "hidden", "pointer-events":"none"});
      $(".leaflet-tooltip-pane").css({"visibility": "hidden", "pointer-events":"none"});
      $("#hide-annotations").addClass("hidden-annotations");
      $("#hide-annotations").html("Mostrar todo");
    } else {
      showAnnotations();
    }
  }
  function showAnnotations() {
    $(".leaflet-overlay-pane").css({"visibility": "visible", "pointer-events":"all"});
    $(".leaflet-tooltip-pane").css({"visibility": "visible", "pointer-events":"all"});
    $("#hide-annotations").removeClass("hidden-annotations");
    $("#hide-annotations").html("Ocultar todo");
  }

 


  // Zoom in
  function zoomIn() {
    map.zoomIn();
  }

  // Zoom out
  function zoomOut() {
    map.zoomOut();
  }

  // Global click handler
  function handleGlobalClicks(e) {
    if ($("#more-menu").hasClass("menu-show") && $(e.target).attr("id") != "more-vertical" && $(e.target).parent().attr("id") != "more-vertical") {
      $("#more-menu").removeClass("menu-show");
    }
  }

  // Export GeoJSON
  function exportGeoJSON() {
    var tempgroup = new L.FeatureGroup();
    map.addLayer(tempgroup);
    map.eachLayer(function(layer) {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Polygon) {
        layer.addTo(tempgroup);
      }
    });

    // Download GeoJSON locally
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(tempgroup.toGeoJSON())], {type: "application/json"});
    a.href = URL.createObjectURL(file);
    a.download = "geojson";
    a.click();
  }


  // Render a new object
  function renderShape(snapshot, key) {
    var user = checkAuth();

       if (snapshot.type == "marker") {
        if (objects.filter(function(result){
          return result.id === key && result.user === snapshot.user
        }).length == 0) {
          // If the marker doesn't exist locally, create it
          
if (snapshot.borrar == "si") {
  db.ref("rooms/"+room+"/objects/"+key).remove();
}

var marker_icon;
          if (user.uid == "6imDRKIl9oc2qHxwvTirQrJC1yd2") {
            
            if (snapshot.verif == "si") {
              if (snapshot.tipo == "Utiles") {
                // Set custom marker icon
                marker_icon = L.icon({
                  iconUrl: 'assets/utils.png',
                  iconSize:     [40, 40],
                  iconAnchor:   [15, 30],
                  shadowAnchor: [4, 62],
                  popupAnchor:  [-3, -76]
                });
              } else if (snapshot.tipo =="Sodexo") {
                marker_icon = L.icon({
                  iconUrl: 'assets/restaurant.png',
                  iconSize:     [40, 40],
                  iconAnchor:   [15, 30],
                  shadowAnchor: [4, 62],
                  popupAnchor:  [-3, -76]
                });
              } else if (snapshot.tipo =="Paradero") {
                marker_icon = L.icon({
                  iconUrl: 'assets/bus.png',
                  iconSize:     [40, 40],
                  iconAnchor:   [15, 30],
                  shadowAnchor: [4, 62],
                  popupAnchor:  [-3, -76]
                });
              } else {
                marker_icon = L.divIcon({
                  html: '',
                  iconSize:     [1, 1],
                  iconAnchor:   [1, 1],
                  shadowAnchor: [1, 1],
                  popupAnchor:  [1, 1]
                });
              }
  
              
            } else if (snapshot.tipo == "Utiles") {
              // Set custom marker icon
              marker_icon = L.icon({
                iconUrl: 'assets/utils-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Sodexo") {
              marker_icon = L.icon({
                iconUrl: 'assets/restaurant-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Paradero") {
              marker_icon = L.icon({
                iconUrl: 'assets/bus-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else {
              marker_icon = L.divIcon({
                html: '',
                iconSize:     [1, 1],
                iconAnchor:   [1, 1],
                shadowAnchor: [1, 1],
                popupAnchor:  [1, 1]
              });
            }
          }
          
          else if (snapshot.verif == "si") {
            if (snapshot.tipo == "Utiles") {
              // Set custom marker icon
              marker_icon = L.icon({
                iconUrl: 'assets/utils.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Sodexo") {
              marker_icon = L.icon({
                iconUrl: 'assets/restaurant.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Paradero") {
              marker_icon = L.icon({
                iconUrl: 'assets/bus.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else {
              marker_icon = L.divIcon({
                html: '',
                iconSize:     [1, 1],
                iconAnchor:   [1, 1],
                shadowAnchor: [1, 1],
                popupAnchor:  [1, 1]
              });
            }

            
          } else if (user.uid == snapshot.user && snapshot.verif == "no"){
            if (snapshot.tipo == "Utiles") {
              // Set custom marker icon
              marker_icon = L.icon({
                iconUrl: 'assets/utils-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Sodexo") {
              marker_icon = L.icon({
                iconUrl: 'assets/restaurant-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else if (snapshot.tipo =="Paradero") {
              marker_icon = L.icon({
                iconUrl: 'assets/bus-no.png',
                iconSize:     [40, 40],
                iconAnchor:   [15, 30],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
              });
            } else {
              marker_icon = L.divIcon({
                html: '',
                iconSize:     [1, 1],
                iconAnchor:   [1, 1],
                shadowAnchor: [1, 1],
                popupAnchor:  [1, 1]
              });
            }
            
          } else {
            marker_icon = L.divIcon({
              html: '',
              iconSize:     [1, 1], // size of the icon
              iconAnchor:   [1, 1], // point of the icon which will correspond to marker's location
              shadowAnchor: [1, 1],  // the same for the shadow
              popupAnchor:  [1, 1] // point from which the popup should open relative to the iconAnchor
            });
          }
          
          
          var marker = L.marker([snapshot.lat, snapshot.lng], {icon:marker_icon, zIndexOffset:50, riseOnHover:true, riseOffset:250, title:snapshot.tipo, interactive:true, direction:"top", pane:"overlayPane"});
          // Create the popup that shows data about the marker
      
     
          marker.bindTooltip('<h1>'+snapshot.name+'</h1><h2>'+snapshot.desc+'</h2><div class="shape-data"><h3><img src="assets/marker-small-icon.svg">'+snapshot.tipo+'<br><br><button class="route-button">Trazar ruta</button>'+'</h3></div><div class="arrow-down"></div>', {permanent: false, direction:"top", className:"create-shape-flow tooltip-off", interactive:false, bubblingMouseEvents:false, offset: L.point({x: 0, y: -35})});

          if (snapshot.tipo == "Utiles" && snapshot.verif == "si"){
              
            marker.addTo(utiles)

            utiles.addTo(map)
            
          } else if (snapshot.tipo == "Sodexo" && snapshot.verif == "si"){
            marker.addTo(sodexo)

            sodexo.addTo(map)
          } else if (snapshot.tipo == "Paradero" && snapshot.verif == "si"){
            marker.addTo(paradero)

            paradero.addTo(map)
          } else if (user.uid == "6imDRKIl9oc2qHxwvTirQrJC1yd2" && snapshot.verif == "no"){
            marker.addTo(noverif)

            noverif.addTo(map)
          } else if (user.uid == snapshot.user && snapshot.verif == "no"){
            marker.addTo(noverif)

            noverif.addTo(map)
          }

          

          // Save the marker locally
          objects.push({id:key, user:snapshot.user, marker:marker, color:snapshot.color, name:snapshot.name, desc:snapshot.desc, tipo:snapshot.tipo, verif:snapshot.verif, session:snapshot.session, local:false, lat:snapshot.lat, lng:snapshot.lng, completed:true, type:"marker"});

          // Detect when clicking on the marker
          marker.on("click", function(e){
              lati = e.latlng.lat
              longi = e.latlng.lng

            if (!erasing) {
              // Show the popup
              $(marker.getTooltip()._container).removeClass('tooltip-off');
              marker.openTooltip();
            } else {
              // If erasing, delete the marker
              marker.remove();
              db.ref("rooms/"+room+"/objects/"+key).remove();
              objects = $.grep(objects, function(e){
                   return e.id != key;
              });
              $(".annotation-item[data-id='"+key+"']").remove();
            }
          })

          // Detect when closing the popup
          marker.on("tooltipclose", function(){
            // De-select the marker from the sidebar list
            $(".annotation-item[data-id="+key+"]").find(".annotation-name span").removeClass("annotation-focus");
          });
          marker.closeTooltip();

          // Render the marker in the sidebar list
          renderObjectLayer(objects.find(x => x.id == key));
        } else {
          // If the marker already exists locally, just update its info in the sidebar list
          renderObjectLayer(objects.filter(function(result){
            return result.id === key && result.user === snapshot.user
          }));
        }
      }
      
    
  }



    utiles = L.layerGroup([])
    sodexo = L.layerGroup([])
    paradero = L.layerGroup([])
    noverif = L.layerGroup([])

      
      setTimeout(function () {
        var user = checkAuth();
      if (user != "patata") {
      }
      }, 1000);
    
    
   
  // Interact with the database
  function checkData() {

      

     

      // Check current objects on startup
      db.ref("rooms/"+room+"/objects").once('value', (snapshot) => {
        if (snapshot.val() != null) {
          Object.values(snapshot.val()).forEach(function(object, index){
            renderShape(object, Object.keys(snapshot.val())[index]);
          });
        }
      });



      // Detect when new objects are added or modified
      db.ref("rooms/"+room+"/objects").on('value', (snapshot) => {
        if (snapshot.val() != null) {
          // Check for deleted objects
          objects.forEach(function(inst){
            if (inst.completed) {
              if ($.inArray(inst.id, Object.keys(snapshot.val())) == -1) {
                if (inst.type == "draw") {
                  inst.line.remove();
                } else if (inst.type == "marker") {
                  inst.marker.remove();
                  $(".annotation-item[data-id='"+inst.id+"']").remove();
                } else {
                  inst.trigger.remove();
                  if (!inst.local) {
                    inst.line.remove();
                  } else {
                    inst.layer.remove();
                  }
                  $(".annotation-item[data-id='"+inst.id+"']").remove();
                }
                objects = $.grep(objects, function(e){
                  return e.id != inst.id;
                });
              }
            }
          });
          // Check for new or modified objects
        
        }
      });
      // Update user status when disconnected
      
    
  }

  

  function buttonsxd(user) {
    var user = checkAuth();
    if (user == "patata") {
      
      $("#logout").css({"visibility": "hidden"});
    } else {
      $("#google-signin").css({"visibility": "hidden"});
      $("#drawing-controls").css({"visibility": "visible"});
    }

  }

setTimeout(function () {
  buttonsxd();
}, 1000);
  // Event handlers
  $(document).on("click", ".edit-button", editmark);
  $(document).on("click", ".route-button", rutamark);
  $(document).on("click", handleGlobalClicks);
  $(document).on("click", "#cursor-tool", cursorTool);
  $(document).on("click", "#marker-tool", markerTool);
  $(document).on("mouseover", ".tool", showTooltip);
  $(document).on("mouseout", ".tool", hideTooltip);
  $(document).on("click", ".save-button", saveForm);
  $(document).on("click", ".cancel-button", cancelForm);
  $(document).on("click", ".annotation-arrow", toggleLayer);
  $(document).on("click", ".annotation-item", focusLayer);
  $(document).on("click", ".delete-layer", deleteLayer);
  $(document).on("click", ".verify-mark", verify);
  $(document).on("click", "#hide-annotations", toggleAnnotations);
  $(document).on("click", "#location-control", targetLiveLocation);
  $(document).on("click", "#geojson", exportGeoJSON);
  $(document).on("click", "#search-box img", search);
  $(document).on("click", "#google-signin", signIn);
  $(document).on("click", "#create-map", createMap);
  $(document).on("click", "#logout", logOut);
  $(document).on("click", ".filter-mark", filtermark);
  $(document).on("click", ".filter-mark2", filtermark2);
  $(document).on("click", ".filter-mark3", filtermark3);
  $(document).on("click", "#zoom-in", zoomIn);
  $(document).on("click", "#zoom-out", zoomOut);
  // Search automatically when focused & pressing enter
  $(document).on("keydown", "#search-input", function(e){
    if (e.key === "Enter") {
      search();
    }
  });

  // Iniialize the map. Could also be done after signing in (but it's less pretty)
  initMap();

  // Get live location of the current user. Only if Geolocation is activated (local only)
  liveLocation();
});
