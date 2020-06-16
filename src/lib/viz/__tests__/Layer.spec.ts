import { log, Deck } from '@deck.gl/core';
import { CARTOSource } from '@/viz/sources';
import { colorBinsStyle } from '@/viz/style/helpers/color-bins-style';
import { NumericFieldStats } from '@/viz/sources/Source';
import { Layer } from '../layer/Layer';
import { getStyles } from '../style';

const DEFAULT_DATASET = 'default_dataset';

// Set Deck. level for debug
log.level = 1;

const instantiationMapResult = {
  metadata: {
    layers: [
      {
        meta: {
          stats: {
            geometryType: 'ST_Polygon'
          }
        }
      }
    ],
    url: {
      vector: {
        subdomains: ['a', 'b', 'c'],
        urlTemplate:
          'https://{s}.cartocdn.net/username/api/v1/map/map_id/layer0/{z}/{x}/{y}.mvt?api_key=default_public'
      }
    }
  }
};

const stylesDefault = getStyles('Polygon');

const instantiateMapFrom = jest
  .fn()
  .mockImplementation(() => Promise.resolve(instantiationMapResult));

jest.mock('@/maps/Client', () => ({
  Client: jest.fn().mockImplementation(() => ({ instantiateMapFrom }))
}));

describe('Layer', () => {
  describe('Layer creation', () => {
    it('should create a new Layer instance properly', () => {
      expect(() => new Layer(DEFAULT_DATASET)).not.toThrow();
    });
  });

  describe('Deck.gl integration', () => {
    let deckInstanceMock: Deck;

    beforeEach(() => {
      const deck = {
        props: {
          layers: []
        },
        setProps: null as unknown
      };
      deck.setProps = jest.fn().mockImplementation(props => {
        deck.props = { ...props };
      });

      deckInstanceMock = (deck as unknown) as Deck;
    });

    describe('.addTo', () => {
      it('should add the created Deck.gl layer to the provided instance', async () => {
        const layer = new Layer(DEFAULT_DATASET);
        await layer.addTo(deckInstanceMock);

        const deckGLLayer = await layer.getDeckGLLayer();
        expect(deckInstanceMock.setProps).toHaveBeenCalledWith(
          expect.objectContaining({
            layers: expect.arrayContaining([deckGLLayer])
          })
        );
      });

      it('should respect the order when updating a layer', async () => {
        const layer1 = new Layer(DEFAULT_DATASET, {}, { id: 'layer1' });
        await layer1.addTo(deckInstanceMock);

        const layer2 = new Layer(DEFAULT_DATASET, {}, { id: 'layer2' });
        await layer2.addTo(deckInstanceMock);

        await layer1.replaceDeckGLLayer();
        expect(deckInstanceMock.props.layers.length).toBe(2);
        expect(deckInstanceMock.props.layers[0].id).toBe('layer1');
        expect(deckInstanceMock.props.layers[1].id).toBe('layer2');
      });
    });
  });

  describe('.getDeckGLLayer', () => {
    const data = [
      'https://a.cartocdn.net/username/api/v1/map/map_id/layer0/{z}/{x}/{y}.mvt?api_key=default_public',
      'https://b.cartocdn.net/username/api/v1/map/map_id/layer0/{z}/{x}/{y}.mvt?api_key=default_public',
      'https://c.cartocdn.net/username/api/v1/map/map_id/layer0/{z}/{x}/{y}.mvt?api_key=default_public'
    ];

    it('should return default style properties in MVTLayer', async () => {
      const defaultProperties = {
        ...stylesDefault,
        data
      };

      const layer = new Layer(DEFAULT_DATASET);
      const deckGLLayer = await layer.getDeckGLLayer();
      expect(deckGLLayer.props).toMatchObject(defaultProperties);
    });

    it('should return default style properties plus the ones overriden', async () => {
      const layerProperties = {
        ...stylesDefault,
        data,
        getFillColor: [128, 128, 128]
      };

      const layer = new Layer(DEFAULT_DATASET, {
        getFillColor: [128, 128, 128]
      });

      const deckGLLayer = await layer.getDeckGLLayer();
      expect(deckGLLayer.props).toMatchObject(layerProperties);
    });
  });

  describe('Source init calls (instantiation in CARTOSource)', () => {
    const mockSourceInit = jest.fn().mockImplementation();
    const mockSourceGetProps = jest.fn().mockImplementation();
    const mockSourceGetMetadata = jest.fn().mockImplementation(() => {
      return {
        geometryType: 'Polygon',
        stats: [{} as NumericFieldStats]
      };
    });

    let deckInstanceMock: Deck;

    beforeEach(() => {
      const deck = {
        props: {
          layers: []
        },
        setProps: null as unknown
      };
      deck.setProps = jest.fn().mockImplementation(props => {
        deck.props = { ...props };
      });

      deckInstanceMock = (deck as unknown) as Deck;

      CARTOSource.prototype.init = mockSourceInit;
      CARTOSource.prototype.getProps = mockSourceGetProps;
      CARTOSource.prototype.getMetadata = mockSourceGetMetadata;
    });

    afterEach(() => {
      mockSourceInit.mockClear();
      mockSourceGetProps.mockClear();
      mockSourceGetMetadata.mockClear();
    });

    it('should trigger a first Source init when adding the layer', async () => {
      const source = new CARTOSource(DEFAULT_DATASET);
      const layer = new Layer(source);
      await layer.addTo(deckInstanceMock);
      expect(mockSourceInit).toHaveBeenCalledTimes(1);
    });

    it('should trigger a second Source init when modifying styles requires it', async () => {
      const source = new CARTOSource(DEFAULT_DATASET);
      const layer = new Layer(source);
      await layer.addTo(deckInstanceMock);
      expect(mockSourceInit).toHaveBeenCalledTimes(1);

      const styleWithNewColumn = colorBinsStyle('attributeName');
      layer.setStyle(styleWithNewColumn);
      expect(mockSourceInit).toHaveBeenCalledTimes(2);
    });

    it('should trigger Source init just once when setting a layer and source is not added to the map yet', async () => {
      const source = new CARTOSource(DEFAULT_DATASET);
      const layer = new Layer(source);

      const styleWithNewColumn = colorBinsStyle('attributeName');
      layer.setStyle(styleWithNewColumn);
      expect(mockSourceInit).toHaveBeenCalledTimes(0);

      await layer.addTo(deckInstanceMock).catch(err => {
        // catching this error is better than mocking everything
        if (err.message !== "Cannot read property 'sample' of undefined") {
          throw err;
        }
      });
      expect(mockSourceInit).toHaveBeenCalledTimes(1);
    });

    it('should trigger a second Source init when modifying popups requires it', async () => {
      const source = new CARTOSource(DEFAULT_DATASET);
      const layer = new Layer(source);
      await layer.addTo(deckInstanceMock);
      expect(mockSourceInit).toHaveBeenCalledTimes(1);

      source.isInitialized = true;

      layer.setPopupClick(['fake_column']);
      expect(mockSourceInit).toHaveBeenCalledTimes(2);

      source.isInitialized = true;

      layer.setPopupHover(['another_fake_column']);
      expect(mockSourceInit).toHaveBeenCalledTimes(3);
    });

    it('should trigger Source init just once when setting a popup and source is not added to the map yet', async () => {
      const source = new CARTOSource(DEFAULT_DATASET);
      const layer = new Layer(source);

      layer.setPopupClick(['fake_column']);
      expect(mockSourceInit).toHaveBeenCalledTimes(0);

      await layer.addTo(deckInstanceMock);
      expect(mockSourceInit).toHaveBeenCalledTimes(1);
    });
  });
});
