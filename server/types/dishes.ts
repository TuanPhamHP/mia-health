import type { Dish, DishIngredient } from '../database/schema';
import type { DishDetailDTO, DishDTO, DishIngredientDTO, DishSummaryDTO } from '../../shared/types/dishes';
import type { Serialized } from '../../shared/types/utils';
import type { NutritionMediaComputed } from './nutrition-media';

export type DishIngredientComputed = DishIngredient & { food: DishIngredientDTO['food'] };
export type DishDetailComputed = Dish & {
	ingredients: DishIngredientComputed[];
	nutrition: DishDetailDTO['nutrition'];
	media: NutritionMediaComputed[];
	cover: DishDetailDTO['cover'];
};
export type DishSummaryComputed = Dish & Pick<DishSummaryDTO, 'ingredientCount' | 'perServing' | 'cover'>;

type _DishCheck = Serialized<Dish> extends DishDTO ? (DishDTO extends Serialized<Dish> ? true : false) : false;
const _assertDishDTO: _DishCheck = true;

type _IngredientCheck = Serialized<DishIngredientComputed> extends DishIngredientDTO
	? DishIngredientDTO extends Serialized<DishIngredientComputed>
		? true
		: false
	: false;
const _assertDishIngredientDTO: _IngredientCheck = true;
