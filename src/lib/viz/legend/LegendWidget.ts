import { Layer, LayerEvent } from '@/viz/layer';
import { queryDOMElement } from '@/core/utils/dom';
import { CartoError } from '@/core/errors/CartoError';

export type LegendGeometryType = 'point' | 'line' | 'polygon';

export type LegendProperties = {
  type: LegendGeometryType;
  color?: string;
  marker?: string;
  strokeColor?: string;
  strokeStyle?: string;
  label?: string | number;
  width?: number;
};

export class LegendWidget {
  constructor(element: string | HTMLElement, layer: Layer, options = {}) {
    const domElement = queryDOMElement(element);
    validateParameters(domElement, layer, options);
    const legendWidget = domElement as any;

    if (layer.isReady()) {
      legendWidget.data = layer.getLegendData(options);
    } else {
      layer.on(LayerEvent.DATA_READY, () => {
        legendWidget.data = layer.getLegendData(options);
      });
    }
  }
}

function validateParameters(element: HTMLElement | null, layer: Layer, options = {}) {
  if (!element) {
    throw new CartoError({
      type: '[Legend]',
      message: 'Element passed to Legend is not valid'
    });
  }

  if (!(layer instanceof Layer)) {
    throw new CartoError({
      type: '[Legend]',
      message: 'Layer passed to Legend is not valid'
    });
  }

  const validOptions = ['type', 'color', 'marker', 'strokeColor', 'strokeStyle', 'label', 'width'];
  const diffOptions = Object.keys(options).filter(opt => !validOptions.includes(opt));

  if (diffOptions.length > 0) {
    throw new CartoError({
      type: '[Legend]',
      message: `Options passed to Legend are not valid, valid values are ${validOptions.join(',')}`
    });
  }
}
