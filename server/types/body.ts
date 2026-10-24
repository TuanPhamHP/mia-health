import type { BodyProfile, BodyWeight } from '../database/schema';
import type { BodyDTO, BodyProfileDTO, BodyWeightDTO } from '../../shared/types/body';
import type { Serialized } from '../../shared/types/utils';

export type BodyProfileComputed = Omit<BodyProfile, 'id'>;
export type BodyComputed = Omit<BodyDTO, 'profile' | 'weights'> & {
	profile: BodyProfileComputed | null;
	weights: BodyWeight[];
};

type _ProfileCheck = Serialized<BodyProfileComputed> extends BodyProfileDTO
	? BodyProfileDTO extends Serialized<BodyProfileComputed>
		? true
		: false
	: false;
const _assertBodyProfileDTO: _ProfileCheck = true;

type _WeightCheck = Serialized<BodyWeight> extends BodyWeightDTO
	? BodyWeightDTO extends Serialized<BodyWeight>
		? true
		: false
	: false;
const _assertBodyWeightDTO: _WeightCheck = true;
