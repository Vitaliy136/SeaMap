// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29

const Rz = 6378137;
const TILE_SIZE = 256;
const MAX_TILES_IN_MEMORY = 100;
const MAX_COORDS_IN_MEMORY = 1000;
const POLYGON_LINE_FORWARD_LEGTH = 30000;
const POLYGON_LINE_TRANSVERSE_LEGTH = 2000;

const FONT_PARAMS = {
  size: "10px",
  name: "Arial",
  fillStyle: "red",
};

const LABEL_PARAMS = {
  fillStyle: "red",
  radius: 2,
  lineWidth: 2,
  strokeStyle: "#0000ff",
};



class Tile {
  constructor(x, y, z, ctx, xPixel, yPixel) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.xPixel = xPixel;
    this.yPixel = yPixel;
    this.ctx = ctx;
    this.img = new Image();
    this.loaded = false;
    this.img.crossOrigin = "anonymous";
  }

  draw(xPixel, yPixel) {
    this.xPixel = xPixel;
    this.yPixel = yPixel;
    this.ctx.drawImage(this.img, this.xPixel, this.yPixel);
  }

  get(src) {
    this.img.src = src;
    this.img.onload = () => {
      this.draw(this.xPixel, this.yPixel);
      this.loaded = true;
    };
  }

  getSync(src) {
    return new Promise((resolve, reject) => {
      this.img.src = src;
      this.img.onload = () => {
        this.draw(this.xPixel, this.yPixel);
        this.loaded = true;
        resolve();
      };
      this.img.onerror = () => {
        reject();
      };
    });
  }
}


class SeaTile extends Tile {
  constructor(x, y, z, ctx, xPixel, yPixel) {
    super(x, y, z, ctx, xPixel, yPixel);
    this.seaMarkImg = new Image();
    this.seaDepthImg = new Image();
  }

  draw(xPixel, yPixel) {
    this.xPixel = xPixel;
    this.yPixel = yPixel;
    this.ctx.drawImage(this.img, this.xPixel, this.yPixel);
    this.ctx.drawImage(this.seaMarkImg, this.xPixel, this.yPixel);
    this.ctx.drawImage(this.seaDepthImg, this.xPixel, this.yPixel);
  }

  get(src, seaMarkSrc, seaDepthSrc) {
    this.img.src = src;
    this.img.onload = () => {
      this.seaMarkImg.src = seaMarkSrc;
      this.seaMarkImg.onload = () => {
        this.seaDepthSrc.src = seaDepthSrc;
        this.seaDepthSrc.onload = () => {
          this.draw(this.xPixel, this.yPixel);
          this.loaded = true;
        }
      };
    };
  }

  getSync(src, seaMarkSrc, seaDepthSrc) {
    return new Promise((resolve, reject) => {
      this.img.src = src;
      this.img.onload = () => {
        this.seaMarkImg.src = seaMarkSrc;
        this.seaMarkImg.onload = () => {
          this.seaDepthImg.src = seaDepthSrc;
          this.seaDepthImg.onload = () => {
            this.draw(this.xPixel, this.yPixel);
            this.loaded = true;
            resolve();
          }
        };
      };
      this.img.onerror = () => {
        reject();
      };
    });
  }
}


class Map2d {
  constructor() {
    this.canvasMap = {
      canvas_element: null,
      ctx: null
    };

    this.preloaded_map_path = null;
    this.source_tiles_url = "https://a.tile.openstreetmap.org";
    this.source_sea_mark_tiles_url = "https://tiles.openseamap.org/seamark";
    this.source_sea_depth_tiles_url = "https://tiles.openseamap.org/depth";

    this.centerTileCoord = { // tile in centre in geo coord
      zoom: 10,              // here also xTile, yTile - tile coords
      lat: 47.903391,        // px, py - coords in pixels for center tile
      lon: 34.951819
    };

    this.pointCenterCoord = { //center point of map in tile coords (with fractioal parts)
      x: 0,
      y: 0
    };

    this.currentCoord = {
      lat: this.centerTileCoord.lat,
      lon: this.centerTileCoord.lon,
      altitude: 0
    };

    this.mission = {
      startPoint: {
        lat: this.centerTileCoord.lat,
        lon: this.centerTileCoord.lon
      },
      azimuth: 0,
      polygonTileCoords: [],
      polygonCoords: [],
      isTrackPaint: false,
      isPolygonPaint: false,
      maxCoordsInMemory: MAX_COORDS_IN_MEMORY,
    };

    this.mapGeometry = {
      tile_length_mpx: 0,
      tile_length_m: 0,
      map_width_m: 0
    };

    this.labels = {
      points: []
    };

    this.map_tiles = new Map();
    this.track = [];
    this.timerId = 0;

    this.POLYGON_LINE_FORWARD_LEGTH = POLYGON_LINE_FORWARD_LEGTH;
    this.POLYGON_LINE_TRANSVERSE_LEGTH = POLYGON_LINE_TRANSVERSE_LEGTH;
  };

  init(canvas_element, cb) {
    const canvasMap = this.canvasMap;
    canvasMap.canvas_element = canvas_element;
    canvasMap.ctx = canvas_element.getContext("2d");
    canvasMap.ctx.fillRect(0, 0, canvasMap.width, canvasMap.height);
    canvasMap.cb = cb;
    this.calculateMapGeometry();
  }

  calculateMapGeometry() { //get map width in meters
    const zoom = this.centerTileCoord.zoom;
    const lat = this.centerTileCoord.lat;
    const tile_length_m = 2 * Math.PI * Rz * Math.cos(lat * Math.PI / 180) / (Math.pow(2, zoom));
    const tile_length_mpx = tile_length_m / TILE_SIZE;
    const map_width_m = tile_length_mpx * this.canvasMap.canvas_element.width; //or canvasMap.canvas_element.height (width = height)

    this.mapGeometry.tile_length_m = tile_length_m;
    this.mapGeometry.tile_length_mpx = tile_length_mpx;
    this.mapGeometry.map_width_m = map_width_m;

    return this.mapGeometry;
  }

  calculateTileGeometry() { //get map width in meters
    const zoom = this.centerTileCoord.zoom;
    const lat = this.centerTileCoord.lat;
    const tile_length_m = 2 * Math.PI * Rz * Math.cos(lat * Math.PI / 180) / (Math.pow(2, zoom));
    const tile_length_mpx = tile_length_m / TILE_SIZE;

    this.mapGeometry.tile_length_m = tile_length_m;
    this.mapGeometry.tile_length_mpx = tile_length_mpx;

    return this.mapGeometry;
  }


  async paintTiles(map, ctx) {
    const centerTileCoord = this.centerTileCoord;
    const numXTiles = Math.pow(2, centerTileCoord.zoom)
    const numYTiles = numXTiles;

    const xTiles = Math.floor((map.width / TILE_SIZE) + 2);
    const yTiles = Math.floor((map.height / TILE_SIZE) + 2);

    const pointCenterCoord = this.pointCenterCoord = this.latLonToTileCoord(centerTileCoord.lat, centerTileCoord.lon);
    centerTileCoord.xTile = Math.floor(pointCenterCoord.x);
    centerTileCoord.yTile = Math.floor(pointCenterCoord.y);

    centerTileCoord.px = Math.floor(Math.floor(xTiles / 2) * TILE_SIZE);
    centerTileCoord.py = Math.floor(Math.floor(yTiles / 2) * TILE_SIZE);


    for (let y = 0; y < yTiles; y++) {
      for (let x = 0; x < xTiles; x++) {
        const xTile = centerTileCoord.xTile + x - Math.floor(xTiles / 2);
        const yTile = centerTileCoord.yTile + y - Math.floor(yTiles / 2);
        if ((xTile > numXTiles) || (yTile > numYTiles) || (xTile < 0) || (yTile < 0))
          break;
        const tile = this.map_tiles.get(`x:${xTile},y:${yTile},z:${centerTileCoord.zoom}`);

        const px = (map.width / 2) - (pointCenterCoord.x - xTile) * TILE_SIZE;
        const py = (map.height / 2) - (pointCenterCoord.y - yTile) * TILE_SIZE;

        if (tile) {
          tile.draw(px, py);
        }
        else {
          const tile = new SeaTile(xTile, yTile, centerTileCoord.zoom, ctx, px, py);
          await tile.getSync(this.source_tiles_url + `/${centerTileCoord.zoom}/${xTile}/${yTile}.png`, this.source_sea_mark_tiles_url + `/${centerTileCoord.zoom}/${xTile}/${yTile}.png`, this.source_sea_depth_tiles_url + `/${centerTileCoord.zoom}/${xTile}/${yTile}.png`);
          this.clearMapTiles(xTiles, yTiles);
          this.map_tiles.set(`x:${xTile},y:${yTile},z:${centerTileCoord.zoom}`, tile);
        }
      }
    }
  }

  clearMapTiles(xTiles, yTiles) {
    const map_tiles = this.map_tiles;
    const centerTileCoord = this.centerTileCoord;

    if (map_tiles.size < MAX_TILES_IN_MEMORY)
      return;

    const keys = [];
    for (const [key, tile] of map_tiles.entries()) {
      if (tile.z !== centerTileCoord.zoom) {
        keys.push(key);
        continue;
      }
      if (((centerTileCoord.xTile + xTiles) < tile.x) || ((centerTileCoord.xTile - xTiles) > tile.x)) {
        if (((centerTileCoord.yTile + yTiles) < tile.y) || ((centerTileCoord.yTile - yTiles) > tile.y)) {
          keys.push(key);
        }
      }
    }

    for (let key of keys) {
      map_tiles.delete(key);
    }
  }

  async loadAndDrawImage(map, ctx) {
    const centerTileCoord = this.centerTileCoord;

    const pointCenterCoord = this.latLonToTileCoord(centerTileCoord.lat, centerTileCoord.lon);
    centerTileCoord.xTile = Math.floor(pointCenterCoord.x);
    centerTileCoord.yTile = Math.floor(pointCenterCoord.y);
``
    const tile = new SeaTile(0, 0, centerTileCoord.zoom, ctx, 0, 0);
    await tile.getSync(this.preloaded_map_path);
    map.width = tile.img.width;
    map.height = tile.img.height;

    const xTiles = (map.width / TILE_SIZE);
    const yTiles = (map.height / TILE_SIZE);

    centerTileCoord.px = Math.floor(Math.floor(xTiles / 2) * TILE_SIZE);
    centerTileCoord.py = Math.floor(Math.floor(yTiles / 2) * TILE_SIZE);
    this.calculateMapGeometry();

    tile.draw(0, 0);
  }

  //-------------------------------------------------------------------------------------------
  // Functions for convert coords
  latLonToTileCoord(lat, lon) {
    const n = Math.pow(2, this.centerTileCoord.zoom);
    const x = (n * ((lon + 180) / 360));

    const lat_rad = lat * Math.PI / 180;
    const y = ((1.0 - Math.log(Math.tan(lat_rad) + (1 / Math.cos(lat_rad))) / Math.PI) / 2.0 * n);

    return { x, y };
  }

  latLonToPixel(lat, lon) {
    const map = this.canvasMap.canvas_element;

    const tCoord = this.latLonToTileCoord(lat, lon);

    const px = (map.width / 2) - (this.pointCenterCoord.x - tCoord.x) * TILE_SIZE;
    const py = (map.height / 2) - (this.pointCenterCoord.y - tCoord.y) * TILE_SIZE;

    return { px, py };
  }

  tilesCoordToPixel(tCoord) {
    const map = this.canvasMap.canvas_element;

    const px = (map.width / 2) - (this.pointCenterCoord.x - tCoord.x) * TILE_SIZE;
    const py = (map.height / 2) - (this.pointCenterCoord.y - tCoord.y) * TILE_SIZE;

    return { px, py };
  }
  //-------------------------------------------------------------------------------------------

  paintTrack() {
    if (!this.mission.isTrackPaint)
      return;

    const track = this.track;

    if (track.length <= 1)
      return;

    for (let i = 0; i < track.length - 1; i++) {
      let coord = track[i];
      const p1 = this.latLonToPixel(coord.lat, coord.lon);

      coord = track[i + 1];
      const p2 = this.latLonToPixel(coord.lat, coord.lon);

      this.drawLine(p1.px, p1.py, 2, p2.px, p2.py);
    }
  }

  async paint() {
    const map = this.canvasMap.canvas_element;
    const ctx = this.canvasMap.ctx;

    if (this.preloaded_map_path)
      await this.loadAndDrawImage(map, ctx);
    else
      await this.paintTiles(map, ctx);

    this.paintPolygon();
    this.paintTrack();
    this.paintLabels();

    if (this.canvasMap.cb) {
      this.canvasMap.cb();
    }
  }

  //-------------------------------------------------------------------------------------------
  // Functions for canvas context draw
  drawPoint(x, y, r) {
    const ctx = this.canvasMap.ctx;
    let radius = LABEL_PARAMS.radius;

    if (r)
      radius = r;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = LABEL_PARAMS.fillStyle;
    ctx.fill();
    ctx.lineWidth = LABEL_PARAMS.lineWidth;
    ctx.strokeStyle = LABEL_PARAMS.strokeStyle;
    ctx.stroke();
  }

  drawText(x, y, text) {
    const ctx = this.canvasMap.ctx;
    ctx.font = FONT_PARAMS.size + " " + FONT_PARAMS.name;
    ctx.fillStyle = FONT_PARAMS.fillStyle;
    ctx.fillText(text, x, y);
  }

  drawLine(x1, y1, r, x2, y2) {
    const ctx = this.canvasMap.ctx;

    if (x1 === undefined || y1 === undefined || r === undefined)
      return;

    if (x2 === undefined || y2 === undefined)
      return;

    const radius = r;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.fillStyle = 'red';
    ctx.strokeStyle = '#0000ff';
    ctx.arc(x2, y2, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.stroke();
  }

  drawPolygon(points) {
    const ctx = this.canvasMap.ctx;

    if (!points.length)
      return;

    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#007755';
    ctx.moveTo(points[0].px, points[0].py);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].px, points[i].py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  drawRect(x, y, width, height) {
    const ctx = this.canvasMap.ctx;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.rect(x, y, width, height);
    ctx.stroke();
  }
  //-------------------------------------------------------------------------------------------

  //-------------------------------------------------------------------------------------------
  // Functions for Polygon logic
  paintPolygon() {
    const mission = this.mission;

    if (!mission.isPolygonPaint)
      return;

    const dx_m = this.POLYGON_LINE_TRANSVERSE_LEGTH;
    const dx_forward_m = this.POLYGON_LINE_FORWARD_LEGTH;

    const lat = mission.startPoint.lat;
    const lon = mission.startPoint.lon;
    const azimuth = mission.azimuth;

    mission.polygonTileCoords = [];
    mission.polygonCoords = [];
    let polygonPixelCoord = [];

    const mWCRatio = this.getMetersTileCoordResolution(lat);
    let dx = dx_m / mWCRatio;

    let p = this.latLonToPixel(lat, lon);
    this.drawPoint(p.px, p.py, 7);

    p = this.latLonToTileCoord(lat, lon);

    const pRotated = this.pointToRotatePpoint(p, azimuth);

    let pRotatedRight = { x: pRotated.x + dx, y: pRotated.y + dx };
    let pRotatedLeft = { x: pRotated.x - dx, y: pRotated.y + dx };

    let pRight = this.rotatedPointToPoint(pRotatedRight, azimuth);
    let pLeft = this.rotatedPointToPoint(pRotatedLeft, azimuth);

    mission.polygonTileCoords.push(pRight);
    mission.polygonTileCoords.push(pLeft);


    mission.polygonCoords.push(this.tileCoordToLatLon(pRight));
    mission.polygonCoords.push(this.tileCoordToLatLon(pLeft));


    pRight = this.tilesCoordToPixel(pRight);
    pLeft = this.tilesCoordToPixel(pLeft);

    polygonPixelCoord.push(pRight);
    polygonPixelCoord.push(pLeft);


    this.drawPoint(pRight.px, pRight.py);
    this.drawPoint(pLeft.px, pLeft.py);


    pRotatedRight.x += dx;
    pRotatedLeft.x -= dx;

    dx = dx_forward_m / mWCRatio;

    pRotatedRight.y -= dx;
    pRotatedLeft.y -= dx;


    pRight = this.rotatedPointToPoint(pRotatedRight, azimuth);
    pLeft = this.rotatedPointToPoint(pRotatedLeft, azimuth);

    mission.polygonTileCoords.push(pLeft);
    mission.polygonTileCoords.push(pRight);


    mission.polygonCoords.push(this.tileCoordToLatLon(pLeft));
    mission.polygonCoords.push(this.tileCoordToLatLon(pRight));

    pRight = this.tilesCoordToPixel(pRight);
    pLeft = this.tilesCoordToPixel(pLeft);

    polygonPixelCoord.push(pLeft);
    polygonPixelCoord.push(pRight);

    this.drawPoint(pRight.px, pRight.py);
    this.drawPoint(pLeft.px, pLeft.py);

    this.drawPolygon(polygonPixelCoord);
  }

  paintRectArea(dx_m) {
    const mission = this.mission;

    // if(!mission.isPolygonPaint)
    //   return;

    // dx_m = this.POLYGON_LINE_TRANSVERSE_LEGTH;
    // const dx_forward_m = this.POLYGON_LINE_FORWARD_LEGTH;

    const lat = mission.startPoint.lat;
    const lon = mission.startPoint.lon;
    const azimuth = mission.azimuth;

    const mWCRatio = this.getMetersTileCoordResolution(lat);
    let dx = (dx_m / 2) / mWCRatio;

    let p = this.latLonToTileCoord(lat, lon);

    let tlCorner = { x: p.x - dx, y: p.y - dx };
    tlCorner = this.tilesCoordToPixel(tlCorner);

    p = this.latLonToTileCoord(lat, lon);
    let brCorner = { x: p.x + dx, y: p.y + dx };
    brCorner = this.tilesCoordToPixel(brCorner);

    const rectArea = {
      px: tlCorner.px,
      py: tlCorner.py,
      width: brCorner.px - tlCorner.px,
      height: brCorner.py - tlCorner.py
    };

    if (rectArea.px > this.canvasMap.canvas_element.width || rectArea.px < 0 ||
      rectArea.py > this.canvasMap.canvas_element.height || rectArea.py < 0 ||
      rectArea.width > this.canvasMap.canvas_element.width ||
      rectArea.height > this.canvasMap.canvas_element.height) {
      return;
    }

    this.drawRect(rectArea.px, rectArea.py, rectArea.width, rectArea.height);

    return rectArea;
  }

  paintLabels() {
    if (!(this.labels.points && this.labels.points.length))
      return;
    for (let i = 0; i < this.labels.points.length; i++) {
      const point = this.labels.points[i];
      let p = this.latLonToPixel(point.lat, point.lon);
      this.drawPoint(p.px, p.py);
      this.drawText(p.px, p.py, point.text);
    }
  }

  getMetersPixelResolution(lat) {
    const n = Math.pow(2, this.centerTileCoord.zoom);
    return (156543.03 * Math.cos(lat) / n);
  }

  getMetersTileCoordResolution(lat) {
    const _lat = lat * Math.PI / 180;
    const n = Math.pow(2, this.centerTileCoord.zoom);
    return (156543.03 * TILE_SIZE * Math.cos(_lat) / n);
  }

  //-------------------------------------------------------------------------------------------
  setStartPointCoords(lat, lon, azimuth) {
    this.mission.startPoint.lat = lat;
    this.mission.startPoint.lon = lon;
    this.mission.azimuth = azimuth;
  }

  getStartPointCoords() {
    return this.mission.startPoint;
  }

  setCurrentCoord(coord) {
    this.track.push(Object.assign({}, coord));
    if (this.track.length > this.mission.maxCoordsInMemory)
      this.track.shift();

    this.calculateMapGeometry();
  }

  paintCurrentCoord() {
    if (this.track.length <= 1)
      return;

    const _coord = this.track[this.track.length - 1];

    const p = this.latLonToPixel(_coord.lat, _coord.lon);

    const prevP = this.latLonToPixel(this.track[this.track.length - 2].lat, this.track[this.track.length - 2].lon);

    this.drawLine(prevP.px, prevP.py, 2, p.px, p.py);

    return p;
  }

  getMapGeometry() {
    return this.mapGeometry;
  }

  getCurrentCoord() {
    return this.currentCoord;
  }

  getCenterTileCoord() {
    return this.centerTileCoord;
  }

  setCenterTileCoord(lat, lon, zoom) {
    this.centerTileCoord.lat = lat;
    this.centerTileCoord.lon = lon;
    if (zoom)
      this.centerTileCoord.zoom = zoom;

    this.pointCenterCoord = this.latLonToTileCoord(this.centerTileCoord.lat, this.centerTileCoord.lon);
  }

  setPolygonPaint(isPolygonPaint) {
    this.mission.isPolygonPaint = isPolygonPaint;
  }

  setTrackPaint(isTrackPaint) {
    this.mission.isTrackPaint = isTrackPaint;
  }

  getMaxCoordsInMemory() {
    return this.mission.maxCoordsInMemory;
  }

  setMaxCoordsInMemory(maxCoordsInMemory) {
    this.mission.maxCoordsInMemory = maxCoordsInMemory;
  }

  getTrackLength() {
    return this.track.length;
  }

  getCoord(i) {
    if (i < this.track.length)
      return this.track[i];
  }

  setPreloadedMapPath(path) {
    this.preloaded_map_path = path;
  }

  setLabels(points) {
    this.labels.points = points;
  }

  tileCoordToLatLon(tileCoord) {
    const n = Math.pow(2, this.centerTileCoord.zoom);
    const lon = tileCoord.x / n * 360.0 - 180.0;
    let lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileCoord.y / n)));
    lat = lat * 180 / Math.PI; //from radians to degree

    const x = lon;
    const y = lat;
    // return lat, lon;
    return { x, y };
  }

  async paintToStartPoint() {
    this.centerTileCoord.lat = this.mission.startPoint.lat;
    this.centerTileCoord.lon = this.mission.startPoint.lon;

    this.currentCoord.lat = this.centerTileCoord.lat;
    this.currentCoord.lon = this.centerTileCoord.lon;

    this.calculateMapGeometry();
    await this.paint();
  }

  isInPolygonInTileCoords(lat, lon) {
    const mission = this.mission;
    const startWordCoord = this.latLonToTileCoord(mission.startPoint.lat, mission.startPoint.lon);
    const currentWordCoord = this.latLonToTileCoord(lat, lon);

    for (let i = 0; i < mission.polygonTileCoords.length - 1; i++) {
      if (isIntersection(startWordCoord, currentWordCoord, mission.polygonTileCoords[i], mission.polygonTileCoords[i + 1])) {
        return false;
      }
    }

    if (isIntersection(startWordCoord, currentWordCoord, mission.polygonTileCoords[mission.polygonTileCoords.length - 1], mission.polygonTileCoords[0])) {
      return false;
    }

    return true;
  }

  isInPolygonInLatLon(lat, lon) {
    const mission = this.mission;
    const startWordCoord = { x: mission.startPoint.lat, y: mission.startPoint.lon };
    const currentWordCoord = { x: lon, y: lat };

    for (let i = 0; i < mission.polygonCoords.length - 1; i++) {
      if (isIntersection(startWordCoord, currentWordCoord, mission.polygonCoords[i], mission.polygonCoords[i + 1])) {
        return false;
      }
    }

    if (isIntersection(startWordCoord, currentWordCoord, mission.polygonCoords[mission.polygonCoords.length - 1], mission.polygonCoords[0])) {
      return false;
    }

    return true;
  }

  getMapCorners() {
    const centerTileCoord = this.centerTileCoord;
    const map = this.canvasMap.canvas_element;

    const xTiles = Math.floor((map.width / TILE_SIZE) + 2);
    const yTiles = Math.floor((map.height / TILE_SIZE) + 2);

    const upperLeftTileCoord = {
      x: centerTileCoord.xTile - Math.floor(xTiles / 2),
      y: centerTileCoord.yTile - Math.floor(yTiles / 2),
      zoom: centerTileCoord.zoom
    };

    const lowerRightTileCoord = {
      x: centerTileCoord.xTile + Math.floor(xTiles / 2),
      y: centerTileCoord.yTile + Math.floor(yTiles / 2),
      zoom: centerTileCoord.zoom
    };

    const upperLeftLatLon = this.tileCoordToLatLon(upperLeftTileCoord);
    const lowerRightLatLon = this.tileCoordToLatLon(lowerRightTileCoord);

    console.log({upperLeftLatLon, lowerRightLatLon});

    return {
      upperLeft: upperLeftLatLon,
      lowerRight: lowerRightLatLon
    };
  }
  //-------------------------------------------------------------------------------------------
  // Functions for manipulating with map
  async onZoomIn() {
    if (this.centerTileCoord.zoom >= 18)
      return;

    this.centerTileCoord.zoom += 1;
    this.calculateMapGeometry();
    await this.paint();
    this.getMapCorners();
  }

  async onZoomOut() {
    if (this.centerTileCoord.zoom < 1)
      return;

    this.centerTileCoord.zoom -= 1;
    this.calculateMapGeometry();
    await this.paint();
    this.getMapCorners();
  }

  async onUp() {
    this.centerTileCoord.lat += 10 / (1 << this.centerTileCoord.zoom);
    this.calculateMapGeometry();
    await this.paint();
  }

  async onDown() {
    this.centerTileCoord.lat -= 10 / (1 << this.centerTileCoord.zoom);
    this.calculateMapGeometry();
    await this.paint();
  }

  async onLeft() {
    this.centerTileCoord.lon -= 10 / (1 << this.centerTileCoord.zoom);
    this.calculateMapGeometry();
    await this.paint();
  }

  async onRight() {
    this.centerTileCoord.lon += 10 / (1 << this.centerTileCoord.zoom);
    this.calculateMapGeometry();
    await this.paint();
  }

  async onMove(offsetX, offsetY) {
    const worldSize = 256 * (1 << this.centerTileCoord.zoom);
    // const worldSize = 256 * Math.pow(2, this.centerTileCoord.zoom);
    const degPerPixel = 360 / worldSize;

    this.centerTileCoord.lon -= offsetX * degPerPixel;
    this.centerTileCoord.lat += offsetY * degPerPixel;

    this.calculateMapGeometry();
    await this.paint();

    this.getMapCorners();
  }
  //-------------------------------------------------------------------------------------------
  //Functions for rotate coord system
  xToXr(x, y, angle) {
    const _angle = angle * Math.PI / 180;
    return ((x * Math.cos(_angle)) + (y * Math.sin(_angle)));
  }

  yToYr(x, y, angle) {
    const _angle = angle * Math.PI / 180;
    return ((y * Math.cos(_angle)) - (x * Math.sin(_angle)));
  }

  xRToX(x, y, angle) {
    const _angle = angle * Math.PI / 180;
    return ((x * Math.cos(_angle)) - (y * Math.sin(_angle)));
  }

  yRToY(x, y, angle) {
    const _angle = angle * Math.PI / 180;
    return ((x * Math.sin(_angle)) + (y * Math.cos(_angle)));
  }

  pointToRotatePpoint(p, angle) {
    return { x: this.xToXr(p.x, p.y, angle), y: this.yToYr(p.x, p.y, angle) }
  }

  rotatedPointToPoint(p, angle) {
    return { x: this.xRToX(p.x, p.y, angle), y: this.yRToY(p.x, p.y, angle) }
  }
  //-------------------------------------------------------------------------------------------
}

//-------------------------------------------------------------------------------------------
function isIntersection(pa1, pa2, pb1, pb2) {
  const v1 = (pb2.x - pb1.x) * (pa1.y - pb1.y) - (pb2.y - pb1.y) * (pa1.x - pb1.x);
  const v2 = (pb2.x - pb1.x) * (pa2.y - pb1.y) - (pb2.y - pb1.y) * (pa2.x - pb1.x);
  const v3 = (pa2.x - pa1.x) * (pb1.y - pa1.y) - (pa2.y - pa1.y) * (pb1.x - pa1.x);
  const v4 = (pa2.x - pa1.x) * (pb2.y - pa1.y) - (pa2.y - pa1.y) * (pb2.x - pa1.x);
  return ((v1 * v2) <= 0) && ((v3 * v4) <= 0);
}

function httpGetAsync(theUrl, callback) {
  const xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous.
  xmlHttp.send(null);
}



export default Map2d;

