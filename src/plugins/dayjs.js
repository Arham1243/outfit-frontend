import dayjs from 'dayjs/esm/index.js';
import weekday from 'dayjs/esm/plugin/weekday/index.js';
import isoWeek from 'dayjs/esm/plugin/isoWeek/index.js';
import utc from 'dayjs/esm/plugin/utc/index.js';
import customParseFormat from 'dayjs/esm/plugin/customParseFormat/index.js';
import timezone from 'dayjs/esm/plugin/timezone/index.js';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

export default dayjs;
