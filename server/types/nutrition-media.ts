import type { NutritionMedia } from '../database/schema';
import type { NutritionMediaDTO } from '../../shared/types/nutrition-media';
import type { Serialized } from '../../shared/types/utils';

export type NutritionMediaComputed = Omit<NutritionMedia, 'createdAt'>;

type _NutritionMediaCheck = Serialized<NutritionMediaComputed> extends NutritionMediaDTO
	? NutritionMediaDTO extends Serialized<NutritionMediaComputed>
		? true
		: false
	: false;
const _assertNutritionMediaDTO: _NutritionMediaCheck = true;
