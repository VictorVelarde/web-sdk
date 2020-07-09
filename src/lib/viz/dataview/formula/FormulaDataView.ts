import { Layer, Source } from '@/viz';
import { BuiltInFilters } from '@/viz/filters/types';
import { uuidv4 } from '@/core/utils/uuid';
import { DataViewCalculation } from '../mode/DataViewMode';
import { AggregationType } from '../../../data/operations/aggregation/aggregation';
import { DataViewLocal } from '../mode/DataViewLocal';
import { DataViewRemote } from '../mode/DataViewRemote';
import { DataView, getCredentialsFrom, DataViewOptions } from '../DataView';
import { FormulaDataViewImpl, FormulaDataViewData } from './FormulaDataViewImpl';
import { isGeoJSONSource } from '../utils';

export class FormulaDataView extends DataView<FormulaDataViewData> {
  protected buildImpl(dataSource: Layer | Source, column: string, options: FormulaDataViewOptions) {
    let dataView;
    const { mode } = options;

    switch (mode) {
      case DataViewCalculation.LOCAL: {
        dataView = new DataViewLocal(dataSource as Layer, column);
        break;
      }

      case DataViewCalculation.REMOTE: {
        if (isGeoJSONSource(dataSource)) {
          const useViewport = false;
          dataView = new DataViewLocal(dataSource as Layer, column, useViewport);
          break;
        }

        const credentials = getCredentialsFrom(dataSource);
        dataView = new DataViewRemote(dataSource as Source, column, credentials);
        break;
      }

      case DataViewCalculation.REMOTE_FILTERED:

      // eslint-disable-next-line no-fallthrough
      default: {
        if (isGeoJSONSource(dataSource)) {
          dataView = new DataViewLocal(dataSource as Layer, column);
          break;
        }

        const credentials = getCredentialsFrom(dataSource);
        dataView = new DataViewRemote(dataSource as Layer, column, credentials);
        dataView.addFilter(`VIEWPORT_FILTER_${uuidv4()}`, BuiltInFilters.VIEWPORT);
        break;
      }
    }

    this.dataviewImpl = new FormulaDataViewImpl(dataView, options);
  }
}

interface FormulaDataViewOptions extends DataViewOptions {
  operation: AggregationType;
  mode?: DataViewCalculation;
}
