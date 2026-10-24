import type { Food, FoodCategory, FoodPortion } from '../database/schema';
import type { FoodCategoryDTO, FoodDetailDTO, FoodDTO, FoodPortionDTO } from '../../shared/types/foods';
import type { Serialized } from '../../shared/types/utils';

export type FoodDetailComputed = Food & { portions: FoodPortion[]; category: FoodDetailDTO['category'] };
export type FoodCategoryNodeComputed = FoodCategory & {
	foodCount: number;
	children: (FoodCategory & { foodCount: number })[];
};

type _FoodCheck = Serialized<Food> extends FoodDTO ? (FoodDTO extends Serialized<Food> ? true : false) : false;
const _assertFoodDTO: _FoodCheck = true;

type _CategoryCheck = Serialized<FoodCategory> extends FoodCategoryDTO
	? FoodCategoryDTO extends Serialized<FoodCategory>
		? true
		: false
	: false;
const _assertFoodCategoryDTO: _CategoryCheck = true;

type _PortionCheck = Serialized<FoodPortion> extends FoodPortionDTO
	? FoodPortionDTO extends Serialized<FoodPortion>
		? true
		: false
	: false;
const _assertFoodPortionDTO: _PortionCheck = true;
