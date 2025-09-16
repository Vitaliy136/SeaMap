<script setup>
  import { ref, onMounted } from 'vue';
  import Map2d from '../assets/tiles.js';

  const canvasRef = ref(null);

  let isDragging = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;

  const centerTileCoord = {
    zoom: 12,
    lat: 46.48907688396013,
    lon: 30.759419910040847
  };

  const currentCoord = {
    lat: centerTileCoord.lat,
    lon: centerTileCoord.lon
  };

  const map2d = new Map2d();

  map2d.setCenterTileCoord(centerTileCoord.lat, centerTileCoord.lon, centerTileCoord.zoom);
  map2d.setStartPointCoords(centerTileCoord.lat, centerTileCoord.lon, 10);
  map2d.setTrackPaint(true);

  async function init() {
    await map2d.paint();
  }

  function onMountedInit() {
    const canvas = canvasRef.value;
    if(canvas) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
    map2d.init(canvasRef.value);
    init();
  }

  onMounted(() => onMountedInit());

  function onZoomIn() {
    map2d.onZoomIn();
  }

  function onZoomOut() {
    map2d.onZoomOut();
  }

  function onUp() {
    map2d.onUp();
  }

  function onDown() {
    map2d.onDown();
  }

  function onLeft() {
    map2d.onLeft();
  }

  function onRight() {
    map2d.onRight();
  }

  function startDrag(event) {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function onDrag(event) {
    if (!isDragging) return;

    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    startX = event.clientX;
    startY = event.clientY;

    map2d.onMove(offsetX, offsetY);
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
    offsetX = 0;
    offsetY = 0;
  }
</script>

<template>
  <div class="container">
    <div class="left-panel" ref="mapContainer" @mousedown="startDrag">
      <canvas ref="canvasRef">Map</canvas>
    </div>   
    <div class="right-panel">
      <Button icon="pi pi-search-plus" aria-label="Filter" severity="info" size="large" raised @click="onZoomIn"/>
      <Button icon="pi pi-search-minus" aria-label="Filter" severity="info" size="large" raised @click="onZoomOut"/>
      <Button icon="pi pi-arrow-up" aria-label="Filter" severity="info" size="large" raised @click="onUp"/>
      <Button icon="pi pi-arrow-down" aria-label="Filter" severity="info" size="large" raised @click="onDown"/>
      <Button icon="pi pi-arrow-left" aria-label="Filter" severity="info" size="large" raised @click="onLeft"/>
      <Button icon="pi pi-arrow-right" aria-label="Filter" severity="info" size="large" raised @click="onRight"/>
    </div>
  </div>
</template>

<style scoped>
  .container {
    display: flex;
    height: 100vh;
  }

  .left-panel {
    width: 90%;
    padding: 20px;
    box-sizing: border-box;
  }

  .right-panel {
    width: 10%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px; /* Расстояние между кнопками */
    box-sizing: border-box;
  }

  .right-panel button {
    width: 80%; /* Ширина кнопок относительно правой панели */
    padding: 10px;
  }

  canvas {
    display: block;
    width: 100%; /* Remove additional width adjustment */
    height: 100%; /* Remove additional height adjustment */
    box-sizing: border-box;
  }
</style>
