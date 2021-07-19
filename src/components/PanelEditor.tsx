import React, { useState } from 'react';
//@ts-ignore
import { FormField, PanelOptionsGroup } from '@grafana/ui';
import { PanelEditorProps } from '@grafana/data';

import { MapOptions } from '../types';

export const PanelEditor: React.FC<PanelEditorProps<MapOptions>> = ({ options, onOptionsChange }) => {
  const [inputs, setInputs] = useState(options);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setInputs(prevState => ({
      ...prevState,
      [name]: type == 'number' ? Number(value) || 0 : value,
    }));
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setInputs({ ...inputs, showRadius: !inputs.showRadius });
  };

  const handleSubmit = () => {
    onOptionsChange(inputs);
  };

  return (
    <PanelOptionsGroup>
      <div className="editor-row">
        <div className="section gf-form-group">
          <h5 className="section-heading">Map Visual Options</h5>
          <FormField
            label="Center Latitude"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="center_lat"
            value={inputs.center_lat}
            onChange={handleChange}
          />
          <FormField
            label="Center Longitude"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="center_lon"
            value={inputs.center_lon}
            onChange={handleChange}
          />
          <FormField
            label="1st Tile"
            labelWidth={10}
            inputWidth={80}
            type="text"
            name="tile_url"
            value={inputs.tile_url}
            onChange={handleChange}
          />
          <FormField
            label="2nd Tile"
            labelWidth={10}
            inputWidth={80}
            type="text"
            name="tile_other"
            value={inputs.tile_other}
            onChange={handleChange}
          />
          <FormField
            label="Initial Zoom"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="zoom_level"
            value={inputs.zoom_level}
            onChange={handleChange}
          />
          <FormField
            label="Other Floor"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="other_floor"
            value={inputs.other_floor}
            onChange={handleChange}
          />

          <div className="gf-form">
            <label className="gf-form-label width-10">Enable Circle</label>
            <div className="gf-form-switch" onClick={handleClick}>
              <input type="checkbox" checked={inputs.showRadius} />
              <span className="gf-form-switch__slider"></span>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSubmit}>
        Submit
      </button>
    </PanelOptionsGroup>
  );
};
