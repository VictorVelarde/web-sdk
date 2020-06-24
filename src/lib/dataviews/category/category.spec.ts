import { Layer } from '../../viz/layer/Layer';
import { Category } from './Category';
import { AggregationType } from '../../data/operations/aggregation/aggregation';
import { CartoDataViewError, dataViewErrorTypes } from '../DataViewError';
import { DataViewCalculation } from '../mode/DataViewMode';

describe('DataView', () => {
  describe('Instance Creation', () => {
    it('should create new DataView instance', () => {
      expect(
        () =>
          new Category(new Layer('fake_source'), 'fake_column', {
            operation: AggregationType.AVG,
            operationColumn: 'popEst',
            mode: DataViewCalculation.LOCAL
          })
      ).not.toThrow();
    });

    it('should throw an exception when operation is not provided', () => {
      expect(
        () =>
          new Category(new Layer('fake_source'), 'fake_column', {
            operation: undefined as never,
            operationColumn: 'fake_operation_column',
            mode: DataViewCalculation.LOCAL
          })
      ).toThrow(
        new CartoDataViewError(
          'Operation property not provided while creating dataview. Please check documentation.',
          dataViewErrorTypes.PROPERTY_MISSING
        )
      );
    });

    it('should throw an exception when operationColumn is not provided', () => {
      expect(
        () =>
          new Category(new Layer('fake_source'), 'fake_column', {
            operation: AggregationType.AVG,
            operationColumn: undefined as never,
            mode: DataViewCalculation.LOCAL
          })
      ).toThrow(
        new CartoDataViewError(
          'Operation column property not provided while creating dataview. Please check documentation.',
          dataViewErrorTypes.PROPERTY_MISSING
        )
      );
    });
  });

  describe('getData', () => {
    it('should return categories and stats grouped by column', async () => {
      const sourceDataToGroup = [
        { country: 'Country 2', popEst: 10 },
        { country: 'Country 2', popEst: 20 },
        { country: 'Country 4', popEst: 30 },
        { country: 'Country 4', popEst: 40 },
        { country: 'Country 5', popEst: 50 }
      ];

      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(Promise.resolve(sourceDataToGroup));

      const dataView = new Category(layer, 'country', {
        operation: AggregationType.AVG,
        operationColumn: 'popEst',
        mode: DataViewCalculation.LOCAL
      });

      expect(await dataView.getData()).toMatchObject({
        categories: [
          { name: 'Country 2', value: 15 },
          { name: 'Country 4', value: 35 },
          { name: 'Country 5', value: 50 }
        ],
        count: 3,
        operation: AggregationType.AVG,
        max: 50,
        min: 15,
        nullCount: 0
      });
    });
  });
});