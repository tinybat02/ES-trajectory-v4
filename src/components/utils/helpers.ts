import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import Circle from 'ol/geom/Circle';
import { Circle as CircleStyle, Stroke, Style, Fill, Icon, Text } from 'ol/style';
import GeometryType from 'ol/geom/GeometryType';
import { Draw } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { FeatureLike } from 'ol/Feature';
import { getLength } from 'ol/sphere';
import Arrow from '../../img/arrow.png';
import Arrow1 from '../../img/arrow1.png';

interface SingleData {
  latitude: number;
  longitude: number;
  [key: string]: any;
}

export const formatLength = function(line: LineString) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
};

export const processDataES = (data: SingleData[]) => {
  data.reverse();
  const perDeviceRoute: { [key: string]: [number, number][] } = {};
  const perDeviceVendor: { [key: string]: string } = {};
  const perDeviceTime: { [key: string]: number[] } = {};
  const perDeviceUncertainty: { [key: string]: number[] } = {};
  const perDeviceFloor: { [key: string]: number[] } = {};
  data.map(datum => {
    (perDeviceRoute[datum.hash_id] = perDeviceRoute[datum.hash_id] || []).push([datum.longitude, datum.latitude]);
    (perDeviceTime[datum.hash_id] = perDeviceTime[datum.hash_id] || []).push(datum.timestamp);
    (perDeviceUncertainty[datum.hash_id] = perDeviceUncertainty[datum.hash_id] || []).push(datum.uncertainty);
    (perDeviceFloor[datum.hash_id] = perDeviceFloor[datum.hash_id] || []).push(datum.floor);
    if (!perDeviceVendor[datum.hash_id]) perDeviceVendor[datum.hash_id] = datum.vendor;
  });
  const perDeviceRoute_nonSinglePoint: { [key: string]: [number, number][] } = {};
  const perDeviceTime_nonSinglePoint: { [key: string]: number[] } = {};
  const perDeviceTime_array: { hash_id: string; duration: number }[] = [];
  let singlePointCount = 0;
  Object.keys(perDeviceRoute).map(hash_id => {
    if (perDeviceRoute[hash_id].length > 1) {
      perDeviceRoute_nonSinglePoint[hash_id] = perDeviceRoute[hash_id];
    } else {
      singlePointCount++;
    }
  });

  Object.keys(perDeviceTime).map(hash_id => {
    if (perDeviceTime[hash_id].length > 1) {
      perDeviceTime_nonSinglePoint[hash_id] = perDeviceTime[hash_id];
      perDeviceTime_array.push({ hash_id, duration: perDeviceTime[hash_id].slice(-1)[0] - perDeviceTime[hash_id][0] });
    }
  });

  perDeviceTime_array.sort((a, b) => {
    if (a.duration > b.duration) return -1;
    if (a.duration < b.duration) return 1;
    return 0;
  });

  return {
    perDeviceRoute: perDeviceRoute_nonSinglePoint,
    perDeviceTime: perDeviceTime_nonSinglePoint,
    perDeviceVendor,
    perDeviceUncertainty,
    singlePointCount,
    perDeviceFloor,
    selectList: perDeviceTime_array.map(elm => elm.hash_id),
  };
};

export const createLine = (routeData: Coordinate[], iterRoute: number, floorData: number[], other_floor: number) => {
  let color = 'rgba(73,168,222)';
  let pic = Arrow;

  if (floorData[iterRoute] == other_floor) color = 'rgba(255,176,0)';

  if (floorData[iterRoute + 1] == other_floor) pic = Arrow1;

  const dx = routeData[iterRoute + 1][0] - routeData[iterRoute][0];
  const dy = routeData[iterRoute + 1][1] - routeData[iterRoute][1];
  const rotation = Math.atan2(dy, dx);
  const lineFeature = new Feature(new LineString([routeData[iterRoute], routeData[iterRoute + 1]]));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    }),
    new Style({
      geometry: new Point(routeData[iterRoute + 1]),
      image: new Icon({
        src: pic,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotation,
      }),
    }),
  ]);
  return lineFeature;
};

export const createLineWithLabel = (
  routeData: Coordinate[],
  timeData: number[],
  iterRoute: number,
  floorData: number[],
  other_floor: number
) => {
  let color = 'rgba(73,168,222)';
  let pic = Arrow;

  if (floorData[iterRoute] == other_floor) color = 'rgba(255,176,0)';

  if (floorData[iterRoute + 1] == other_floor) pic = Arrow1;

  const dx = routeData[iterRoute + 1][0] - routeData[iterRoute][0];
  const dy = routeData[iterRoute + 1][1] - routeData[iterRoute][1];
  const rotation = Math.atan2(dy, dx);
  const lineFeature = new Feature(new LineString([routeData[iterRoute], routeData[iterRoute + 1]]));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
      text: new Text({
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
        font: '18px Calibri,sans-serif',
        text: `${(timeData[iterRoute + 1] - timeData[iterRoute]).toFixed(2)}s`,
      }),
    }),
    new Style({
      geometry: new Point(routeData[iterRoute + 1]),
      image: new Icon({
        src: pic,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotation,
      }),
    }),
  ]);
  return lineFeature;
};

export const createPoint = (
  routeData: Coordinate[],
  routeRadiusData: number[],
  iterRoute: number,
  floorData: number[],
  other_floor: number
) => {
  let color = 'rgba(73,168,222,0.6)';

  if (floorData[iterRoute] == other_floor) color = 'rgba(255,176,0,0.6)';

  // const pointFeature = new Feature(new Point(routeData[iterRoute]));
  // pointFeature.setStyle(
  //   new Style({
  //     image: new Circle({
  //       radius: routeRadiusData[iterRoute] || 2,
  //       // radius: 5,
  //       fill: new Fill({ color: color }),
  //     }),
  //   })
  // );
  const pointFeature = new Feature(new Circle(routeData[iterRoute], routeRadiusData[iterRoute] || 2));
  pointFeature.setStyle(
    new Style({
      fill: new Fill({ color: color }),
    })
  );
  return pointFeature;
};

export const createMeasureLayer = (source: VectorSource) => {
  return new VectorLayer({
    source: source,

    style: function(feature: FeatureLike) {
      const geometry = feature.getGeometry() as LineString;

      const line_styles = [
        new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.5)',
            width: 2,
          }),
        }),
      ];

      geometry.forEachSegment(function(start, end) {
        const linestring = new LineString([start, end]);
        const len = formatLength(linestring);

        line_styles.push(
          new Style({
            geometry: linestring,
            text: new Text({
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({
                color: '#fff',
                width: 2,
              }),
              font: '12px/1 sans-serif',
              text: len,
            }),
          })
        );
      });
      return line_styles;
    },
    zIndex: 2,
  });
};

export const createDraw = (source: VectorSource) => {
  return new Draw({
    source: source,
    type: GeometryType.LINE_STRING,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });
};
