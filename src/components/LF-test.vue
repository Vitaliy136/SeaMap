<script setup>
  import { ref, onMounted } from "vue";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";


  const mapContainer = ref(null);


  function onMountedInit() {
    if (!mapContainer.value) return;

    const map = L.map(mapContainer.value).setView([50, 10], 5);

    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const localTiles = L.tileLayer('http://localhost:8080/{z}/{x}/{y}.png', {
      tms: true,
      opacity: 0.5,
      attribution: "",
      minZoom: 7,
      maxZoom: 14,
      bounds: [[48.087782, 18.845], [29.199, 42.806756]]
    }).addTo(map);

    const seamapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenSeaMap contributors'
    }).addTo(map);

    const seamarkOverlay = L.tileLayer.wms("http://ows.openseamap.org/seamark/wms", {
      layers: "seamark",
      format: "image/png",
      transparent: true,
      attribution: "&copy; OpenSeaMap contributors"
    }).addTo(map);

    map.fitBounds([[48.087782, 18.845], [29.199, 42.806756]]);

    const baseMaps = {
      "OpenStreetMap": osmLayer
    };

    const overlayMaps = {
      "Local Tiles": localTiles,
      "OpenSeaMap": seamapLayer,
      "Seamarks": seamarkOverlay
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // === Добавляем поддержку выделения прямоугольника ===

    let startLatLng = null;
    let rectangle = null;

    function onMouseDown(e) {
      startLatLng = e.latlng;
      if (rectangle) {
        map.removeLayer(rectangle);
        rectangle = null;
      }
      map.on("mousemove", onMouseMove);
      map.once("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      const bounds = L.latLngBounds(startLatLng, e.latlng);
      if (rectangle) {
        rectangle.setBounds(bounds);
      } else {
        rectangle = L.rectangle(bounds, {
          color: "#3388ff",
          weight: 2,
          fillOpacity: 0.2,
        }).addTo(map);
      }
    }

    function onMouseUp(e) {
      map.off("mousemove", onMouseMove);
      const bounds = rectangle.getBounds();
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();

      console.log("🧭 Координаты прямоугольника:");
      console.log("↖ Верхний левый угол:", nw.lat, nw.lng);
      console.log("↘ Нижний правый угол:", se.lat, se.lng);

      // Пример: вывести alert
      alert(`Выделенная область:\n↖ NW: ${nw.lat.toFixed(6)}, ${nw.lng.toFixed(6)}\n↘ SE: ${se.lat.toFixed(6)}, ${se.lng.toFixed(6)}`);
    }

    map.on("mousedown", onMouseDown);
  }

  onMounted(() => onMountedInit());
</script>

<template>
  <div ref="mapContainer" style="width: 100vw; height: 100vh;"></div>
</template>

<style scoped>
</style>
