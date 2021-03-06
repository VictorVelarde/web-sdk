import { CartoError } from '@/core/errors/CartoError';

/**
 * Utility to build a CartoError related to Layer errors.
 *
 * @return {CartoError} A well formed object representing the error.
 */

/**
 * CartoPopupError types:
 * - [Error]
 * - [Missing property]
 * - [Invalid coordinate]
 *
 * @name CartoLayerError
 * @memberof CartoError
 * @api
 */
export class CartoLayerError extends CartoError {
  constructor(message: string, type = layerErrorTypes.DEFAULT) {
    super({ message, type });
    this.name = 'CartoLayerError';
  }
}

export const layerErrorTypes = {
  DEFAULT: '[Error]',
  DECK_MAP_NOT_FOUND: '[Deck.gl Map not found]',
  UNKNOWN_SOURCE: '[Source is unknown]'
};
