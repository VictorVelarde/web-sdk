import { CartoError } from '../../../core/errors/CartoError';
import { DataViewData } from '../DataViewMode';
import { aggregate } from '../../operations/aggregation/aggregation';
import { DataViewLocal } from '../DataViewLocal';
import { FormulaBase, FormulaDataViewOptions } from './FormulaBase';

export class FormulaLocal extends FormulaBase<DataViewLocal> {
  constructor(dataView: DataViewLocal, options: FormulaDataViewOptions) {
    const events = ['dataUpdate'];
    super(dataView, options, events);
  }

  async getData(): Promise<Partial<DataViewData>> {
    const features = await this.dataView.getSourceData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = features.map((feature: { [x: string]: any }) => feature[this.dataView.column]);
    validateNumbersOrNullIn(values);

    // just include numbers in calculations... TODO: should we consider features with null & undefined for the column?
    const filteredValues = values.filter(Number.isFinite);

    return {
      result: aggregate(filteredValues, this.operation),
      operation: this.operation,
      nullCount: values.length - filteredValues.length
    };
  }
}

/**
 * Check the values are numbers or null | undefined, taking a small sample
 * @param features
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateNumbersOrNullIn(values: any[]) {
  const sample = values.slice(0, Math.min(values.length, 10));
  sample.forEach(value => {
    const isAcceptedNull = value === null || value === undefined; // TODO should we just support null?

    if (!isAcceptedNull && typeof value !== 'number') {
      throw new CartoError({
        type: '[DataView]',
        message: `Column property for Formula can just contain numbers (or nulls) and a ${typeof value} with ${value} value was found. Please check documentation.`
      });
    }
  });
}
