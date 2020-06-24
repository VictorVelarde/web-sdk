import { Credentials, defaultCredentials } from '@/core/Credentials';
import { MapInstance, MapOptions, Client } from '@/maps/Client';
import {
  Source,
  SourceProps,
  SourceMetadata,
  NumericFieldStats,
  CategoryFieldStats,
  StatFields,
  shouldInitialize
} from './Source';
import { isObject, parseGeometryType } from '../style/helpers/utils';
import { sourceErrorTypes, SourceError } from '../errors/source-error';

export interface SourceOptions {
  credentials?: Credentials;
  mapOptions?: MapOptions;
}

const defaultMapOptions: MapOptions = {
  vectorExtent: 2048,
  vectorSimplifyExtent: 2048,
  bufferSize: {
    mvt: 10
  },
  metadata: {
    geometryType: true
  }
};

function getSourceType(source: any) {
  let type: 'custom' | 'sql' | 'dataset' = 'custom';

  if (!isObject(source)) {
    const containsSpace = source.search(' ') > -1;
    type = containsSpace ? 'sql' : 'dataset';
  }

  return type;
}

interface CARTOSourceProps extends SourceProps {
  // Tile URL template. It should be in the format of https://server/{z}/{x}/{y}..
  data: string | Array<string>;
}

/**
 * Implementation of a Source compatible with CARTO's MAPs API
 * * */
export class CARTOSource extends Source {
  // type of the source.
  private _type: 'sql' | 'dataset' | 'custom';
  // value it should be a dataset name, a SQL query or a Maps API response
  private _value: any; // string | MapInstance;

  // Internal credentials of the user
  private _credentials: Credentials;
  private _props?: CARTOSourceProps;
  private _mapConfig: MapOptions;
  private _metadata?: SourceMetadata;
  private _fields: StatFields;

  constructor(source: string | MapInstance, options: SourceOptions = {}) {
    const { mapOptions = {}, credentials = defaultCredentials } = options;

    // set layer id
    const id = `CARTO-${source}`;

    // call to super class
    super(id);
    this.sourceType = 'CARTOSource';

    // Set object properties
    this._type = getSourceType(source);
    this._value = source;
    this._credentials = credentials;
    const sourceOpts = { [this._type]: source };
    this._fields = { sample: new Set(), aggregation: new Set() };

    // Set Map Config
    this._mapConfig = {
      // hack: deep copy
      ...JSON.parse(JSON.stringify(defaultMapOptions)),
      ...mapOptions,
      ...sourceOpts
    };
  }

  /**
   * It returns the props of the source:
   *   - URL of the tiles provided by MAPs API
   *   - geometryType
   */
  public getProps(): CARTOSourceProps {
    if (!this.isInitialized) {
      throw new SourceError('getProps requires init call', sourceErrorTypes.INIT_SKIPPED);
    }

    if (this._props === undefined) {
      throw new SourceError('Props are not set after map instantiation');
    }

    return this._props;
  }

  public get value(): string {
    let res = this._value;

    if (this._type === 'custom') {
      res = (this._value as MapInstance).layergroupid;
    }

    return res;
  }

  public get type(): 'sql' | 'dataset' | 'custom' {
    return this._type;
  }

  public get credentials(): Credentials {
    return this._credentials;
  }

  public getMetadata(): SourceMetadata {
    // initialize the stats to 0

    if (!this.isInitialized) {
      throw new SourceError('GetMetadata requires init call', sourceErrorTypes.INIT_SKIPPED);
    }

    if (this._metadata === undefined) {
      throw new SourceError('Metadata are not set after map instantiation');
    }

    return this._metadata;
  }

  private _initConfigForStats() {
    if (this._mapConfig.metadata === undefined) {
      throw new SourceError('Map Config has not metadata field');
    }

    // Modify mapConfig to add the field stats
    this._mapConfig.metadata.columnStats = {
      topCategories: 32768,
      includeNulls: true
    };

    this._mapConfig.metadata.dimensions = true;

    this._mapConfig.metadata.sample = {
      num_rows: 1000,
      include_columns: [...this._fields.sample]
    };

    const dimensions: Record<string, { column: string }> = {};
    this._fields.aggregation.forEach(field => {
      dimensions[field] = { column: field };
    });

    this._mapConfig.aggregation = {
      columns: {},
      dimensions,
      placement: 'centroid',
      resolution: 1,
      threshold: 1
    };
  }

  /**
   * Instantiate the map, getting proper stats for input fields
   * @param fields
   */
  public async init(fields: StatFields): Promise<boolean> {
    if (!shouldInitialize(this.isInitialized, fields, this._fields)) {
      return true;
    }

    if (this.isInitialized) {
      console.warn('CARTOSource reinitialized');
    }

    this._saveFields(fields);
    this._initConfigForStats();
    let mapInstance: MapInstance = this._value as MapInstance;

    if (this._type !== 'custom') {
      const mapsClient = new Client(this._credentials);
      mapInstance = await mapsClient.instantiateMapFrom(this._mapConfig);
    }

    const urlTemplate = getUrlsFrom(mapInstance);
    this._props = { type: 'TileLayer', data: urlTemplate }; // TODO refactor / include in metadata ?
    this._metadata = extractMetadataFrom(mapInstance, fields);

    this.isInitialized = true;
    return this.isInitialized;
  }

  private _saveFields(fields: StatFields) {
    this._fields.sample = new Set([...fields.sample]);
    this._fields.aggregation = new Set([...fields.aggregation]);
  }
}

function getUrlsFrom(mapInstance: MapInstance): string | string[] {
  const urlData = mapInstance.metadata.url.vector;
  let urlTemplate = [urlData.urlTemplate];

  // if subdomains exist, then a collection of urls will be used for better performance
  if (urlData.subdomains.length) {
    urlTemplate = urlData.subdomains.map((subdomain: string) =>
      urlData.urlTemplate.replace('{s}', subdomain)
    );
  }

  return urlTemplate;
}

function extractMetadataFrom(mapInstance: MapInstance, fields?: StatFields) {
  const { stats } = mapInstance.metadata.layers[0].meta;
  const geometryType = parseGeometryType(stats.geometryType);
  const fieldStats = getCompleteFieldStats(stats, fields);

  const metadata = { geometryType, stats: fieldStats };

  return metadata;
}

function getCompleteFieldStats(stats: any, fields?: StatFields) {
  if (!fields) return [];

  const fieldStats: (NumericFieldStats | CategoryFieldStats)[] = [];
  const columns = new Set([...fields.sample, ...fields.aggregation]);

  if (columns) {
    columns.forEach(column => {
      const columnStats = stats.columns[column];

      switch (columnStats.type) {
        case 'string':
          fieldStats.push({
            name: column,
            categories: columnStats.categories
          });
          break;
        case 'number':
          fieldStats.push({
            name: column,
            ...stats.columns[column],
            sample: stats.sample.map((x: any) => x[column])
          });
          break;
        default:
          throw new SourceError(
            'Unsupported type for stats',
            sourceErrorTypes.UNSUPPORTED_STATS_TYPE
          );
      }
    });
  }

  return fieldStats;
}
