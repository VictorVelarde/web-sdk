import { CartoError } from '../../../../core/errors/CartoError';
import { aggregateValues } from './values-aggregation';
import { AggregationType } from '../AggregationType';

describe('Values Aggregation', () => {
  describe('Errors', () => {
    it('should throw an exception when aggregation type is not implemented', () => {
      expect(() => aggregateValues(values, 'unknownAggregation' as AggregationType)).toThrow(
        new CartoError({
          type: '[DataView]',
          message: '"unknownAggregation" aggregation type not implemented'
        })
      );
    });
  });

  describe('aggregate', () => {
    it(AggregationType.COUNT, async () => {
      expect(aggregateValues(values, AggregationType.COUNT).result).toEqual(5);
    });

    it(AggregationType.AVG, async () => {
      expect(aggregateValues(values, AggregationType.AVG).result).toEqual(30);
    });

    it(AggregationType.MIN, async () => {
      expect(aggregateValues(values, AggregationType.MIN).result).toEqual(10);
    });

    it(AggregationType.MAX, async () => {
      expect(aggregateValues(values, AggregationType.MAX).result).toEqual(50);
    });

    it(AggregationType.SUM, async () => {
      expect(aggregateValues(values, AggregationType.SUM).result).toEqual(150);
    });

    it('percentile_50', async () => {
      expect(aggregateValues(values, 'percentile_50' as AggregationType).result).toEqual(30);
    });

    it('percentile_fake', async () => {
      expect(() => aggregateValues(values, 'percentile_fake' as AggregationType)).toThrow(
        new CartoError({
          type: '[DataView]',
          message: '"NaN" percentile value is not correct'
        })
      );
    });
  });
});

const values = [10, 20, 30, 40, 50];
