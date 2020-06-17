import { WithEvents } from '@/core/mixins/WithEvents';
import { Filterable } from '@/viz/filters/Filterable';
import { Filter } from '@/viz/filters/types';
import { AggregationType } from '@/data/operations/aggregation/aggregation';
import { CartoDataViewError, dataViewErrorTypes } from '../DataViewError';

export abstract class DataViewModeBase<T extends Filterable> extends WithEvents {
  protected dataSource: T;
  public column: string;

  constructor(dataSource: T, column: string) {
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

  public abstract async aggregation(aggregationParams: {
    aggregation: AggregationType;
    operationColumn: string;
    limit?: number;
  }): Promise<Partial<DataViewData>>;

  public abstract async formula(operation: AggregationType): Promise<Partial<DataViewData>>;
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

export enum DataViewModeAlias {
  GLOBAL = 'global',
  VIEWPORT = 'viewport',
  NON_PRECISE = 'non-precise'
}
