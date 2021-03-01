import React from 'react';
import { SliderItem, GetHandleProps, GetTrackProps, GetRailProps } from 'react-compound-slider';

interface IHandleProps {
  domain: number[];
  handle: SliderItem;
  getHandleProps: GetHandleProps;
}

interface ITrackProps {
  source: SliderItem;
  target: SliderItem;
  getTrackProps: GetTrackProps;
}
const railOuterStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: 40,
  transform: 'translate(0%, -50%)',
  //   borderRadius: 7,
  cursor: 'pointer',
  // border: '1px solid white',
};

const railInnerStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: 8,
  transform: 'translate(0%, -50%)',
  borderRadius: 4,
  pointerEvents: 'none',
  backgroundColor: '#c6c6c6',
};

export const SliderRail: React.FunctionComponent<{ getRailProps: GetRailProps }> = ({ getRailProps }) => {
  return (
    <>
      <div style={railOuterStyle} {...getRailProps()} />
      <div style={railInnerStyle} />
    </>
  );
};

export const Handle: React.FunctionComponent<IHandleProps> = ({
  domain: [min, max],
  handle: { id, value, percent },
  //   disabled = false,
  getHandleProps,
}) => {
  return (
    <>
      <div
        style={{
          left: `${percent}%`,
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)',
          zIndex: 5,
          width: 28,
          height: 42,
          cursor: 'pointer',
          // border: '1px solid white',
          backgroundColor: 'none',
        }}
        {...getHandleProps(id)}
      />
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{
          left: `${percent}%`,
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          boxShadow: '1px 1px 1px 1px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#333',
        }}
      />
    </>
  );
};

export const Track: React.FunctionComponent<ITrackProps> = ({ source, target, getTrackProps }) => {
  return (
    <div
      style={{
        position: 'absolute',
        transform: 'translate(0%, -50%)',
        height: 8,
        zIndex: 1,
        backgroundColor: '#444',
        borderRadius: 4,
        cursor: 'pointer',
        left: `${source.percent}%`,
        width: `${target.percent - source.percent}%`,
      }}
      {...getTrackProps()}
    />
  );
};

export const Tick: React.FunctionComponent<{
  tick: { percent: number; value: number };
  count: number;
  format?: (d: number) => number;
}> = ({ tick, count, format = (d: number) => d }) => {
  return (
    <div>
      <div
        style={{
          position: 'absolute',
          marginTop: 14,
          width: 1,
          height: 5,
          backgroundColor: 'rgb(200,200,200)',
          left: `${tick.percent}%`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          marginTop: 22,
          fontSize: 10,
          textAlign: 'center',
          marginLeft: `${-(100 / count) / 2}%`,
          width: `${100 / count}%`,
          left: `${tick.percent}%`,
        }}
      >
        {format(tick.value)}
      </div>
    </div>
  );
};
