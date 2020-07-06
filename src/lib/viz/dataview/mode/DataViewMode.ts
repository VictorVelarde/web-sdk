import { Layer, Source } from '@/viz';
import { WithEvents } from '@/core/mixins/WithEvents';
import { Filter } from '@/viz/filters/types';
import { AggregationType } from '@/data/operations/aggregation/aggregation';
import { CartoDataViewError, dataViewErrorTypes } from '../DataViewError';

export abstract class DataViewMode extends WithEvents {
  protected dataSource: Layer | Source;
  public column: string;

  constructor(dataSource: Layer | Source, column: string) {
    super();

    validateParameters(dataSource, column);

    this.column = column;
    this.dataSource = dataSource;
  }

  public addFilter(filterId: string, filter: Filter) {
    this.dataSource.addFilter(filterId, { [this.column]: filter });
  }

  public removeFilter(filterId: string) {
    this.dataSource.removeFilter(filterId);
  }

  public abstract async aggregation(
    aggregationParams: {
      aggregation: AggregationType;
      operationColumn: string;
      limit?: number;
    },
    options: { filterId?: string }
  ): Promise<Partial<DataViewData>>;

  public abstract async formula(operation: AggregationType): Promise<Partial<DataViewData>>;

  public abstract async histogram(
    binsNumber: number,
    start: number | undefined,
    end: number | undefined,
    options: { filterId?: string }
  ): Promise<HistogramDataViewData>;

  public onDataUpdate() {
    this.emit('dataUpdate');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateParameters(source: any, column: string) {
  if (!source) {
    throw new CartoDataViewError(
      'Source was not provided while creating dataview',
      dataViewErrorTypes.PROPERTY_MISSING
    );
  }

  if (!column) {
    throw new CartoDataViewError(
      'Column name was not provided while creating dataview',
      dataViewErrorTypes.PROPERTY_MISSING
    );
  }
}

export interface DataViewData {
  result: number;
  categories: {
    name: string;
    value: number;
  }[];
  count: number;
  operation: AggregationType;
  max: number;
  min: number;
  nullCount: number;
}

export enum DataViewCalculation {
  REMOTE = 'remote',
  LOCAL = 'local',
  REMOTE_FILTERED = 'remote-filtered'
}

export interface BinData {
  min: number;
  max: number;
  avg: number;
  normalized: number;
  bin: number;
  start: number;
  end: number;
  value: number;
}

export interface HistogramDataViewData {
  bins: BinData[];
  nulls: number;
  totalAmount: number;
}

export interface HistogramDataViewOptions {
  bins?: number;
  start?: number;
  end?: number;
  mode?: DataViewCalculation;
}
