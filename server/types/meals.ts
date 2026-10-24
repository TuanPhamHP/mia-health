import type { MealEntry, Menu, MenuItem, NutritionTarget } from '../database/schema';
import type {
	DayLogDTO,
	MealEntryDTO,
	MenuDetailDTO,
	MenuDTO,
	MenuItemDTO,
	MenuSummaryDTO,
	NutritionTargetsDTO,
} from '../../shared/types/meals';
import type { NutrientKey } from '../../shared/utils/nutrients';
import type { Serialized } from '../../shared/types/utils';

export type MealEntryComputed = Omit<MealEntry, 'missing'> & { missing: NutrientKey[] };
export type MenuItemComputed = MenuItem & Pick<MenuItemDTO, 'name' | 'isArchived' | 'energyKcal' | 'proteinG' | 'fatG' | 'carbG'>;
export type MenuDetailComputed = Menu & { items: MenuItemComputed[]; totals: MenuDetailDTO['totals'] };
export type MenuSummaryComputed = Menu & Pick<MenuSummaryDTO, 'itemCount' | 'totals'>;

type _EntryCheck = Serialized<MealEntryComputed> extends MealEntryDTO
	? MealEntryDTO extends Serialized<MealEntryComputed>
		? true
		: false
	: false;
const _assertMealEntryDTO: _EntryCheck = true;

type _MenuCheck = Serialized<Menu> extends MenuDTO ? (MenuDTO extends Serialized<Menu> ? true : false) : false;
const _assertMenuDTO: _MenuCheck = true;

type _MenuItemCheck = Serialized<MenuItemComputed> extends MenuItemDTO
	? MenuItemDTO extends Serialized<MenuItemComputed>
		? true
		: false
	: false;
const _assertMenuItemDTO: _MenuItemCheck = true;

export type NutritionTargetsComputed = Omit<NutritionTarget, 'id'>;
export type DayLogComputed = Omit<DayLogDTO, 'entries' | 'targets'> & {
	entries: MealEntryComputed[];
	targets: NutritionTargetsComputed;
};

type _TargetsCheck = Serialized<NutritionTargetsComputed> extends NutritionTargetsDTO
	? NutritionTargetsDTO extends Serialized<NutritionTargetsComputed>
		? true
		: false
	: false;
const _assertNutritionTargetsDTO: _TargetsCheck = true;
