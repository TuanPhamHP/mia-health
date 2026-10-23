import { daysToMask } from '../../../shared/utils/weekday';
import type { CreateExerciseData } from '../../services/exercises';

// Bộ bài tập + giáo án mẫu cho lần chạy đầu. Seed idempotent THEO TÊN
// (POST /api/presets/seed): bài/giáo án trùng tên đã có thì bỏ qua, không ghi đè
// thông số người dùng đã chỉnh.

const KEGEL_NOTE = 'Nếu thấy đau hoặc có vấn đề về sàn chậu, hỏi bác sĩ / chuyên viên vật lý trị liệu trước khi tập.';

export const EXERCISE_PRESETS: CreateExerciseData[] = [
	{
		name: 'Kegel giữ lâu',
		category: 'kegel',
		mode: 'hold',
		sets: 3,
		reps: 10,
		holdSec: 5,
		relaxSec: 5,
		restSec: 30,
		instructions: `Siết cơ sàn chậu như đang nhịn tiểu, giữ yên, rồi thả lỏng HOÀN TOÀN trong nhịp thả. Thở đều, không nín thở; không siết mông, bụng hay đùi. Quen rồi thì tăng dần thời gian giữ lên 8–10 giây. ${KEGEL_NOTE}`,
	},
	{
		name: 'Kegel nhanh',
		category: 'kegel',
		mode: 'hold',
		sets: 3,
		reps: 10,
		holdSec: 1,
		relaxSec: 1,
		restSec: 30,
		instructions: `Siết nhanh, mạnh cơ sàn chậu rồi thả ngay — luyện phản xạ co cơ (khi ho, hắt hơi, nâng vật nặng). Giữ nhịp đều, không gồng bụng. ${KEGEL_NOTE}`,
	},
	{
		name: 'Thở bụng thả lỏng sàn chậu',
		category: 'breathing',
		mode: 'hold',
		sets: 1,
		reps: 10,
		holdSec: 4,
		relaxSec: 6,
		restSec: 0,
		instructions: 'Nằm hoặc ngồi thoải mái. Hít vào bằng mũi, bụng phình ra, cảm nhận sàn chậu giãn xuống; thở ra chậm, sàn chậu tự nâng nhẹ. Dùng để khởi động và thả lỏng trước/sau Kegel.',
	},
	{
		name: 'Cầu mông (Glute bridge)',
		category: 'strength',
		mode: 'reps',
		sets: 3,
		reps: 12,
		restSec: 45,
		instructions: 'Nằm ngửa, gối co, bàn chân rộng bằng hông. Siết mông đẩy hông lên tới khi vai–hông–gối thẳng hàng, dừng một nhịp rồi hạ chậm. Có thể siết sàn chậu khi đẩy lên.',
	},
	{
		name: 'Squat',
		category: 'strength',
		mode: 'reps',
		sets: 3,
		reps: 15,
		restSec: 60,
		instructions: 'Chân rộng bằng vai, ngồi xuống như ngồi ghế, lưng thẳng, gối hướng theo mũi chân. Xuống tới khi đùi song song sàn rồi đứng lên.',
	},
	{
		name: 'Hít đất',
		category: 'strength',
		mode: 'reps',
		sets: 3,
		reps: 10,
		restSec: 60,
		instructions: 'Tay rộng hơn vai, thân thẳng từ đầu tới gót. Hạ ngực gần sàn, khuỷu tay khoảng 45° so với thân, rồi đẩy lên. Mới tập thì chống gối.',
	},
	{
		name: 'Gập bụng (Crunch)',
		category: 'strength',
		mode: 'reps',
		sets: 3,
		reps: 15,
		restSec: 45,
		instructions: 'Nằm ngửa, gối co. Siết bụng nâng vai khỏi sàn, không kéo cổ, hạ chậm.',
	},
	{
		name: 'Plank',
		category: 'gymnastics',
		mode: 'duration',
		sets: 3,
		durationSec: 30,
		restSec: 30,
		instructions: 'Chống cẳng tay, khuỷu dưới vai, thân thẳng từ đầu tới gót. Siết bụng và mông, không võng lưng, thở đều.',
	},
	{
		name: 'Hollow hold',
		category: 'gymnastics',
		mode: 'duration',
		sets: 3,
		durationSec: 20,
		restSec: 40,
		instructions: 'Bài nền của thể dục dụng cụ. Nằm ngửa, ép thắt lưng xuống sàn, nâng vai và chân khỏi sàn, tay duỗi qua đầu — thân như chiếc thuyền. Khó quá thì co gối.',
	},
	{
		name: 'Treo xà (Dead hang)',
		category: 'gymnastics',
		mode: 'duration',
		sets: 3,
		durationSec: 20,
		restSec: 60,
		instructions: 'Nắm xà rộng bằng vai, treo người thả lỏng, vai không nhô lên tai. Tăng dần thời gian treo.',
	},
	{
		name: 'Kéo xà (Pull-up)',
		category: 'gymnastics',
		mode: 'reps',
		sets: 3,
		reps: 5,
		restSec: 90,
		instructions: 'Từ tư thế treo, kéo người lên tới khi cằm qua xà, hạ có kiểm soát. Chưa kéo được thì tập kéo xà âm: nhảy lên rồi hạ chậm 3–5 giây.',
	},
	{
		name: 'Jumping jack',
		category: 'cardio',
		mode: 'duration',
		sets: 3,
		durationSec: 30,
		restSec: 20,
		instructions: 'Bật nhảy dang tay chân rồi khép lại, tiếp đất bằng mũi chân, giữ nhịp đều.',
	},
	{
		name: 'Nhảy dây',
		category: 'cardio',
		mode: 'duration',
		sets: 3,
		durationSec: 60,
		restSec: 30,
		instructions: 'Nhảy thấp bằng mũi chân, quay dây bằng cổ tay, khuỷu tay sát người.',
	},
	{
		name: "Tư thế em bé (Child's pose)",
		category: 'stretching',
		mode: 'duration',
		sets: 1,
		durationSec: 60,
		restSec: 0,
		instructions: 'Quỳ, ngồi lên gót, gập người đưa tay ra trước, trán chạm sàn. Thở sâu, thả lỏng lưng và hông.',
	},
	{
		name: 'Giãn cơ hông (Pigeon)',
		category: 'stretching',
		mode: 'duration',
		sets: 2,
		durationSec: 30,
		restSec: 10,
		instructions: 'Đưa một chân ra trước gập gối, chân sau duỗi thẳng, hạ hông xuống. Đổi bên sau mỗi set.',
	},
];

export interface RoutinePreset {
	name: string;
	description: string;
	scheduleMask: number;
	prepSec: number;
	exerciseNames: string[];
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
	{
		name: 'Kegel hằng ngày',
		description: 'Thở bụng khởi động, rồi Kegel chậm và Kegel nhanh.',
		scheduleMask: daysToMask([1, 2, 3, 4, 5, 6, 7]),
		prepSec: 5,
		exerciseNames: ['Thở bụng thả lỏng sàn chậu', 'Kegel giữ lâu', 'Kegel nhanh'],
	},
	{
		name: 'Core & thể dục dụng cụ cơ bản',
		description: 'Bài nền cho cơ trung tâm: hollow, plank, cầu mông, hít đất, squat.',
		scheduleMask: daysToMask([1, 3, 5]),
		prepSec: 10,
		exerciseNames: ['Hollow hold', 'Plank', 'Cầu mông (Glute bridge)', 'Hít đất', 'Squat'],
	},
	{
		name: 'Giãn cơ buổi tối',
		description: 'Thả lỏng hông và lưng trước khi ngủ.',
		scheduleMask: daysToMask([2, 4, 6, 7]),
		prepSec: 5,
		exerciseNames: ["Tư thế em bé (Child's pose)", 'Giãn cơ hông (Pigeon)', 'Thở bụng thả lỏng sàn chậu'],
	},
];
