import React, { PureComponent } from 'react';
import { PanelProps, Vector as VectorData } from '@grafana/data';
import { MapOptions } from '../types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import nanoid from 'nanoid';
import { processDataES, createLine, createPoint, createLineWithLabel } from './utils/helpers';
import { CustomSlider } from './common/CustomSlider';
import ReactSearchBox from 'react-search-box';
import 'ol/ol.css';
import '../style/MainPanel.css';

interface Props extends PanelProps<MapOptions> {}
interface Buffer extends VectorData {
  buffer: any;
}

interface State {
  options: string[];
  current: string;
  iterRoute: number;
  routeLength: number;
  showTotalRoute: boolean;
  singlePointCount: number;
}

export class MainPanel extends PureComponent<Props> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  perDeviceRoute: { [key: string]: [number, number][] };
  perDeviceTime: { [key: string]: number[] };
  perDeviceUncertainty: { [key: string]: number[] };
  perDeviceFloor: { [key: string]: number[] };
  perDeviceVendor: { [key: string]: string } = {};
  partialRoute: VectorLayer;
  totalRoute: VectorLayer;

  state: State = {
    options: [],
    current: 'None',
    iterRoute: 0,
    routeLength: 0,
    showTotalRoute: true,
    singlePointCount: 0,
  };

  componentDidMount() {
    const { tile_url, zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });
    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    if (this.props.data.series.length > 0) {
      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      const {
        perDeviceRoute,
        perDeviceTime,
        perDeviceUncertainty,
        singlePointCount,
        perDeviceFloor,
        perDeviceVendor,
        selectList,
      } = processDataES(buffer);
      this.perDeviceRoute = perDeviceRoute;
      this.perDeviceTime = perDeviceTime;
      this.perDeviceUncertainty = perDeviceUncertainty;
      this.perDeviceFloor = perDeviceFloor;
      this.perDeviceVendor = perDeviceVendor;
      this.setState({
        ...this.state,
        options: selectList /* Object.keys(this.perDeviceRoute).sort() */,
        singlePointCount,
      });
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      this.map.removeLayer(this.partialRoute);
      this.map.removeLayer(this.totalRoute);
      this.setState({ ...this.state, options: [], current: 'None', singlePointCount: 0 });

      if (this.props.data.series.length == 0) {
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      if (buffer.length !== 0) {
        const {
          perDeviceRoute,
          perDeviceTime,
          perDeviceUncertainty,
          singlePointCount,
          perDeviceFloor,
          perDeviceVendor,
          selectList,
        } = processDataES(buffer);
        this.perDeviceRoute = perDeviceRoute;
        this.perDeviceTime = perDeviceTime;
        this.perDeviceUncertainty = perDeviceUncertainty;
        this.perDeviceFloor = perDeviceFloor;
        this.perDeviceVendor = perDeviceVendor;
        this.setState({
          ...this.state,
          options: selectList /* Object.keys(this.perDeviceRoute).sort() */,
          singlePointCount,
        });
      }
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });

    if (prevState.current !== this.state.current) {
      this.map.removeLayer(this.partialRoute);
      this.map.removeLayer(this.totalRoute);

      this.setState({ iterRoute: 0, routeLength: 0, showTotalRoute: true });

      if (this.state.current !== 'None') {
        const routeData = this.perDeviceRoute[this.state.current].map(coordinate => fromLonLat(coordinate));
        const timeData = this.perDeviceTime[this.state.current];
        const uncertaintyData = this.perDeviceUncertainty[this.state.current];
        const floorData = this.perDeviceFloor[this.state.current];

        this.setState({ routeLength: routeData.length });

        let totalRoute: Feature[] = [];
        const partialRoute: Feature<LineString>[] = [];

        if (routeData.length > 1) {
          const firstLine = createLineWithLabel(routeData, timeData, 0, floorData, this.props.options.other_floor);
          partialRoute.push(firstLine);
          for (let i = 0; i < routeData.length - 1; i++) {
            totalRoute.push(createLine(routeData, i, floorData, this.props.options.other_floor));
          }
        }

        const totalPoints: Feature<Point>[] = [];
        if (this.props.options.showRadius)
          for (let i = 0; i < routeData.length; i++) {
            totalPoints.push(createPoint(routeData, uncertaintyData, i, floorData, this.props.options.other_floor));
          }

        this.totalRoute = new VectorLayer({
          source: new VectorSource({
            features: [...totalPoints, ...totalRoute],
          }),
          zIndex: 2,
        });

        this.map.addLayer(this.totalRoute);

        const pointFeatures: Feature<Point>[] = [];

        const firstPoint = createPoint(routeData, uncertaintyData, 0, floorData, this.props.options.other_floor);
        pointFeatures.push(firstPoint);
        if (routeData.length > 1) {
          const secondPoint = createPoint(routeData, uncertaintyData, 1, floorData, this.props.options.other_floor);
          pointFeatures.push(secondPoint);
        }

        this.partialRoute = new VectorLayer({
          source: new VectorSource({
            features: [...partialRoute, ...pointFeatures],
          }),
          zIndex: 2,
        });
      }
    }

    if (prevState.showTotalRoute !== this.state.showTotalRoute) {
      if (this.state.showTotalRoute) {
        this.map.removeLayer(this.partialRoute);
        this.map.removeLayer(this.totalRoute);
        this.map.addLayer(this.totalRoute);
      } else {
        this.map.removeLayer(this.totalRoute);
        this.map.removeLayer(this.partialRoute);
        this.map.addLayer(this.partialRoute);
        const floorData = this.perDeviceFloor[this.state.current];
        if (floorData.length < 2) return;

        if (floorData[this.state.iterRoute + 1] == this.props.options.other_floor) {
          this.randomTile = new TileLayer({
            source: new XYZ({
              url: this.props.options.tile_other,
            }),
            zIndex: 1,
          });
          this.map.addLayer(this.randomTile);
        } else {
          this.randomTile = new TileLayer({
            source: new XYZ({
              url: this.props.options.tile_url,
            }),
            zIndex: 1,
          });
          this.map.addLayer(this.randomTile);
        }
      }
    }
  }

  handleSelector = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ ...this.state, current: e.target.value, showTotalRoute: true });
  };

  handleShowTotalRoute = () => {
    this.setState({ showTotalRoute: !this.state.showTotalRoute });
  };

  handleIterRoute = (type: string) => () => {
    const routeData = this.perDeviceRoute[this.state.current].map(coordinate => fromLonLat(coordinate));
    const timeData = this.perDeviceTime[this.state.current];
    const uncertaintyData = this.perDeviceUncertainty[this.state.current];
    const floorData = this.perDeviceFloor[this.state.current];

    const { iterRoute } = this.state;
    if (type === 'previous' && iterRoute > 0) {
      this.map.removeLayer(this.partialRoute);
      this.setState({ iterRoute: iterRoute - 1 }, () => {
        if (
          this.state.iterRoute < floorData.length - 2 &&
          floorData[this.state.iterRoute + 1] != floorData[this.state.iterRoute + 2]
        ) {
          if (this.props.options.tile_url == '' || this.props.options.tile_other == '') return;
          this.map.removeLayer(this.randomTile);
          if (floorData[this.state.iterRoute + 2] == this.props.options.other_floor) {
            this.randomTile = new TileLayer({
              source: new XYZ({
                url: this.props.options.tile_url,
              }),
              zIndex: 1,
            });
            this.map.addLayer(this.randomTile);
          } else {
            this.randomTile = new TileLayer({
              source: new XYZ({
                url: this.props.options.tile_other,
              }),
              zIndex: 1,
            });
            this.map.addLayer(this.randomTile);
          }
        }
        const lineFeature = createLineWithLabel(
          routeData,
          timeData,
          this.state.iterRoute,
          floorData,
          this.props.options.other_floor
        );
        const beginPoint = createPoint(
          routeData,
          uncertaintyData,
          this.state.iterRoute,
          floorData,
          this.props.options.other_floor
        );
        const endPoint = createPoint(
          routeData,
          uncertaintyData,
          this.state.iterRoute + 1,
          floorData,
          this.props.options.other_floor
        );

        this.partialRoute = new VectorLayer({
          source: new VectorSource({
            features: [lineFeature, beginPoint, endPoint],
          }),
          zIndex: 2,
        });
        this.map.addLayer(this.partialRoute);
      });
    }

    if (type === 'next' && iterRoute < routeData.length - 2) {
      this.partialRoute && this.map.removeLayer(this.partialRoute);
      this.setState({ iterRoute: iterRoute + 1 }, () => {
        if (floorData[this.state.iterRoute] != floorData[this.state.iterRoute + 1]) {
          if (this.props.options.tile_url == '' || this.props.options.tile_other == '') return;
          this.map.removeLayer(this.randomTile);

          if (floorData[this.state.iterRoute + 1] == this.props.options.other_floor) {
            this.randomTile = new TileLayer({
              source: new XYZ({
                url: this.props.options.tile_other,
              }),
              zIndex: 1,
            });
            this.map.addLayer(this.randomTile);
          } else {
            this.randomTile = new TileLayer({
              source: new XYZ({
                url: this.props.options.tile_url,
              }),
              zIndex: 1,
            });
            this.map.addLayer(this.randomTile);
          }
        }
        const lineFeature = createLineWithLabel(
          routeData,
          timeData,
          this.state.iterRoute,
          floorData,
          this.props.options.other_floor
        );
        const beginPoint = createPoint(
          routeData,
          uncertaintyData,
          this.state.iterRoute,
          floorData,
          this.props.options.other_floor
        );
        const endPoint = createPoint(
          routeData,
          uncertaintyData,
          this.state.iterRoute + 1,
          floorData,
          this.props.options.other_floor
        );

        this.partialRoute = new VectorLayer({
          source: new VectorSource({
            features: [lineFeature, beginPoint, endPoint],
          }),
          zIndex: 2,
        });
        this.map.addLayer(this.partialRoute);
      });
    }
  };

  onSliding = (value: number) => {
    this.setState({ iterRoute: value }, () => {
      this.map.removeLayer(this.partialRoute);

      const routeData = this.perDeviceRoute[this.state.current].map(coordinate => fromLonLat(coordinate));
      const timeData = this.perDeviceTime[this.state.current];
      const uncertaintyData = this.perDeviceUncertainty[this.state.current];
      const floorData = this.perDeviceFloor[this.state.current];

      const lineFeature = createLineWithLabel(routeData, timeData, value, floorData, this.props.options.other_floor);
      const beginPoint = createPoint(routeData, uncertaintyData, value, floorData, this.props.options.other_floor);
      const endPoint = createPoint(routeData, uncertaintyData, value + 1, floorData, this.props.options.other_floor);

      this.partialRoute = new VectorLayer({
        source: new VectorSource({
          features: [lineFeature, beginPoint, endPoint],
        }),
        zIndex: 2,
      });
      this.map.addLayer(this.partialRoute);
    });
  };

  onSlider = (value: number) => {
    // this.map.removeLayer(this.partialRoute);
    // const routeData = this.perDeviceRoute[this.state.current].map(coordinate => fromLonLat(coordinate));
    // const timeData = this.perDeviceTime[this.state.current];
    // const uncertaintyData = this.perDeviceUncertainty[this.state.current];
    // const floorData = this.perDeviceFloor[this.state.current];
    // const lineFeature = createLineWithLabel(routeData, timeData, value, floorData, this.props.options.other_floor);
    // const beginPoint = createPoint(routeData, uncertaintyData, value, floorData, this.props.options.other_floor);
    // const endPoint = createPoint(routeData, uncertaintyData, value + 1, floorData, this.props.options.other_floor);
    // this.partialRoute = new VectorLayer({
    //   source: new VectorSource({
    //     features: [lineFeature, beginPoint, endPoint],
    //   }),
    //   zIndex: 2,
    // });
    // this.map.addLayer(this.partialRoute);
  };

  handleSearch = (record: { key: string; value: string }) => {
    this.setState({ current: record.key });
  };

  render() {
    const { width, height } = this.props;
    const { options, current, iterRoute, routeLength, showTotalRoute } = this.state;

    return (
      <div
        style={{
          width,
          height,
        }}
      >
        <div className="tool-bar">
          <div className="tool-content">
            <div style={{ width: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <select id="selector" style={{ width: 350 }} onChange={this.handleSelector} value={current}>
                  <option value="None">None</option>
                  {options.map(item => (
                    <option key={item} value={item}>
                      {`${item} - ${this.perDeviceVendor[item]}`}
                    </option>
                  ))}
                </select>
                <div style={{ width: 350, marginLeft: 10 }}>
                  <ReactSearchBox
                    placeholder="Search ..."
                    data={options.map(hash => ({ key: hash, value: `${hash} - ${this.perDeviceVendor[hash]}` }))}
                    onSelect={this.handleSearch}
                    fuseConfigs={{ threshold: 0.05 }}
                    value={current == 'None' ? '' : current}
                  />
                </div>
              </div>
              {current !== 'None' && (
                <div>
                  <button
                    className="custom-btn"
                    onClick={this.handleIterRoute('previous')}
                    disabled={showTotalRoute}
                    style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
                  >
                    &#60;&#60;
                  </button>
                  <button
                    className="custom-btn"
                    onClick={this.handleIterRoute('next')}
                    disabled={showTotalRoute}
                    style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
                  >
                    &#62;&#62;
                  </button>
                  <button className="custom-btn" onClick={this.handleShowTotalRoute}>
                    {showTotalRoute ? 'Show Single' : 'Show Total'} Route
                  </button>
                </div>
              )}
            </div>
            <div>
              {current !== 'None' && this.perDeviceTime[current] && (
                <span style={{ marginLeft: 10 }}>
                  {`${current} ${iterRoute + 1} / ${routeLength - 1} -- Begin: ${new Date(
                    this.perDeviceTime[current][iterRoute] * 1000
                  )
                    .toLocaleString('de-DE')
                    .replace(/\./g, '/')} -- End: ${
                    showTotalRoute
                      ? new Date(this.perDeviceTime[current][routeLength - 1] * 1000)
                          .toLocaleString('de-DE')
                          .replace(/\./g, '/')
                      : new Date(this.perDeviceTime[current][iterRoute + 1] * 1000)
                          .toLocaleString('de-DE')
                          .replace(/\./g, '/')
                  }`}
                </span>
              )}
            </div>
          </div>
          <div style={{ width: '100%', padding: 10, marginRight: 10 }}>
            {!showTotalRoute && (
              <CustomSlider
                initialValue={0}
                onSliding={this.onSliding}
                onSlider={this.onSlider}
                upperDomain={routeLength - 2}
              />
            )}
          </div>
        </div>
        <div
          id={this.id}
          style={{
            width,
            height: height - 60,
          }}
        ></div>
      </div>
    );
  }
}
