<script setup>
  import { ref, onMounted } from "vue";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";


  const mapContainer = ref(null);
  let rectangle = null;
  let startLatLng = null;
  let isDrawing = false;
  const rectangleBoundsText = ref("");


  function onMountedInit() {
    if (!mapContainer.value) return;

    const map = L.map(mapContainer.value).setView([40.3, 23.7], 10);

    // OSM base layer
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Local tiles (custom) placed on top of OSM
    const localTiles = L.tileLayer('http://localhost:8082/{z}/{x}/{y}.png', {
        tms: true,
        opacity: 0.5,
        attribution: "",
        minZoom: 7,
        maxZoom: 14,
        bounds: [[48.087782, 18.845], [29.199, 42.806756]],
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=' // transparent 1x1 PNG
    }).addTo(map);

    // OpenSeaMap (hydrography) layer placed above local tiles
    const seamapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenSeaMap contributors'
    }).addTo(map);

    // A layer with navigational aids (seamarks) via WMS, on top of all layers
    const seamarkOverlay = L.tileLayer.wms("http://ows.openseamap.org/seamark/wms", {
      layers: "seamark",
      format: "image/png",
      transparent: true,
      attribution: "&copy; OpenSeaMap contributors"
    }).addTo(map);


    // Limiting the display area
    //map.fitBounds([[48.087782, 18.845], [29.199, 42.806756]]);

    // Adding layers to the map
    const baseMaps = {
      "OpenStreetMap": osmLayer
    };

    const overlayMaps = {
      "Local Tiles": localTiles,
      "OpenSeaMap": seamapLayer,
      "Seamarks": seamarkOverlay
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);


    let startLatLng = null;
    let rectangle = null;

  // Beginning of drawing
  map.on("mousedown", function (e) {
    if (!(e.originalEvent.ctrlKey && e.originalEvent.button === 0)) return;

    e.originalEvent.preventDefault();
    isDrawing = true;
    startLatLng = e.latlng;

    map.dragging.disable(); // disable map movement

    // If there is an old rectangle, delete it.
    if (rectangle) {
      map.removeLayer(rectangle);
      rectangle = null;
      rectangleBoundsText.value = "";
    }

    // Create an empty rectangle (will be updated)
    rectangle = L.rectangle([startLatLng, startLatLng], {
      color: "#ff0000",
      weight: 2,
      fillOpacity: 0.2,
    }).addTo(map);
  });

  // Updating the rectangle when the mouse moves
  map.on("mousemove", function (e) {
    if (!isDrawing || !rectangle) return;

    const currentLatLng = e.latlng;
    const bounds = L.latLngBounds(startLatLng, currentLatLng);
    rectangle.setBounds(bounds);
  });

  // Finishing the drawing
  map.on("mouseup", function (e) {
    if (!isDrawing) return;

    isDrawing = false;
    map.dragging.enable(); // Allow map movement again

    const bounds = rectangle.getBounds();
    const northWest = bounds.getNorthWest();
    const southEast = bounds.getSouthEast();

    rectangleBoundsText.value = `
      ↖ Верхний левый угол: [${northWest.lat.toFixed(6)}, ${northWest.lng.toFixed(6)}]
      ↘ Нижний правый угол: [${southEast.lat.toFixed(6)}, ${southEast.lng.toFixed(6)}]

      GeoJSON:
        ${JSON.stringify(rectangle.toGeoJSON(), null, 2)}
    `.trim();

    console.log("Rectangle created:", rectangleBoundsText.value);
  });

  // Deleting a rectangle by pressing Delete
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Del") {
      if (rectangle) {
        map.removeLayer(rectangle);
        rectangle = null;
        rectangleBoundsText.value = "";
      }
    }
  });

  }

  onMounted(() => onMountedInit());
</script>

<template>
  <div ref="mapContainer" style="width: 100vw; height: 100vh;"></div>
</template>

<style scoped>
</style>
