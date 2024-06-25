import { Shift, Time, TimeRange, MultipleTimeRanges, ParseStatus, HoursParser } from '../src/HoursParser';
const dd = (...args: any) => console.debug(...args);
const jstr = (...args: any) => JSON.stringify([...args], null, 2);
const dds = (...args: any) => dd(jstr(...args));

class StringTest {
  value: string;
  expected: MultipleTimeRanges;
  constructor(value: string, mtr: MultipleTimeRanges) {
    this.value = value;
    this.expected = mtr;
  }
  process(): string {
    const parser: HoursParser = new HoursParser();
    const status: ParseStatus = parser.parse(this.value);
    if (status !== 'ok') {
      console.debug({ value: this.value, status, matchedAt: parser.matchedAt });
      dd();
      return 'error';
    }
    if (parser.times) {
      if (!this.expected.isSame(parser.times)) {
        return 'error';
      }
    }
    return 'ok';
  }
}
function not_open(): MultipleTimeRanges {
  return new MultipleTimeRanges('closed');
}
function open_24(): MultipleTimeRanges {
  return new MultipleTimeRanges('open 24 hours');
}

function nt(sh: number, sm: number, shift: Shift, eh: number, em: number, eshift: Shift): MultipleTimeRanges {
  return new MultipleTimeRanges(new TimeRange(new Time(sh, sm, shift), new Time(eh, em, eshift)));
}
function multi_range(
  sh: number,
  sm: number,
  shift: Shift,
  eh: number,
  em: number,
  eshift: Shift,
  s2h: number,
  s2m: number,
  s2shift: Shift,
  e2h: number,
  e2m: number,
  e2shift: Shift,
): MultipleTimeRanges {
  const mtr: MultipleTimeRanges = new MultipleTimeRanges(
    new TimeRange(new Time(sh, sm, shift), new Time(eh, em, eshift)),
  );
  mtr.add(new TimeRange(new Time(s2h, s2m, s2shift), new Time(e2h, e2m, e2shift)));
  return mtr;
}

function trange(sh: number, sm: number, shift: Shift, eh: number, em: number, eshift: Shift): TimeRange {
  return new TimeRange(new Time(sh, sm, shift), new Time(eh, em, eshift));
}

const patterns: Array<StringTest> = [
  new StringTest('10:00AM-10:00PM', nt(10, 0, 'am', 10, 0, 'pm')),
  new StringTest('10:00 AM – 10:00 PM', nt(10, 0, 'am', 10, 0, 'pm')),
  new StringTest('10:00 AM – 10:45 PM', nt(10, 0, 'am', 10, 45, 'pm')),
  new StringTest('10:00 AM – 1:00 AM', nt(10, 0, 'am', 1, 0, 'am')),
  new StringTest(
    '10:00 AM – 2:00 PM, 4:00 PM – 12:00 AM',
    multi_range(10, 0, 'am', 2, 0, 'pm', 4, 0, 'pm', 12, 0, 'am'),
  ),
  new StringTest('10:00 AM – 2:00 PM, 4:00 – 10:00 PM', multi_range(10, 0, 'am', 2, 0, 'pm', 4, 0, 'pm', 10, 0, 'pm')),
  new StringTest('11AM-11PM', nt(11, 0, 'am', 11, 0, 'pm')),
  new StringTest('11AM-1AM', nt(11, 0, 'am', 1, 0, 'am')),
  new StringTest('12:00 PM - 12:00 AM', nt(12, 0, 'pm', 12, 0, 'am')),
  new StringTest('12:00 PM - 4:00 AM', nt(12, 0, 'pm', 4, 0, 'am')),
  new StringTest('12:00-12:00AM', nt(12, 0, 'pm', 12, 0, 'am')),
  new StringTest('10:00-12:00AM', nt(10, 0, 'am', 12, 0, 'am')),
  new StringTest('12:00 – 2:00 PM, 4:30 – 10:00 PM', multi_range(12, 0, 'pm', 2, 0, 'pm', 4, 30, 'pm', 10, 0, 'pm')),
  new StringTest('12:00 – 2:00 PM, 5:00 – 9:00 PM', multi_range(12, 0, 'pm', 2, 0, 'pm', 5, 0, 'pm', 9, 0, 'pm')),
  new StringTest('11AM-2AM', nt(11, 0, 'am', 2, 0, 'am')),
  new StringTest('11AM-9PM', nt(11, 0, 'am', 9, 0, 'pm')),
  new StringTest('12-11PM', nt(12, 0, 'pm', 11, 0, 'pm')),
  new StringTest('12-12AM', nt(12, 0, 'pm', 12, 0, 'am')),
  new StringTest('12:00-12:00AM', nt(12, 0, 'pm', 12, 0, 'am')),
  new StringTest('10:00-12:00AM', nt(10, 0, 'am', 12, 0, 'am')),
  new StringTest('CLOSED ', not_open()),
  new StringTest('CLOSED', not_open()),
  new StringTest('Closed', not_open()),
  new StringTest('Sunday: Closed', not_open()),
  new StringTest('Open 24 hours', open_24()),
];

patterns.forEach((value: StringTest) => {
  if (value.process() !== 'ok') {
    console.error('Failed: ', value);
  }
});
function main() {
  for (const pattern of [
    '12:00 – 2:00 PM, 4:30 – 10:00 PM',
    '12:00 – 2:00 PM, 5:00 – 9:00 PM',
    '12:00 – 2:30 PM, 5:00 PM – 2:00 AM',
    '12:00 – 2:30 PM, 5:00 – 10:00 PM',
    '12:00 – 2:30 PM, 5:00 – 11:00 PM',
    '12:00 – 2:30 PM, 5:00 – 9:45 PM',
    '12:00 – 3:00 AM, 6:00 PM – 12:00 AM',
    '12:00 – 3:00 AM, 8:00 PM – 12:00 AM',
    '12:00 – 3:00 PM, 4:00 – 11:00 PM',
    '12:00 – 3:00 PM, 5:00 – 10:00 PM',
    '12:00 – 3:00 PM, 5:00 – 11:00 PM',
    '12:00 – 3:00 PM, 5:00 – 9:00 PM',
    '12:00 – 3:00 PM, 5:00 – 9:30 PM',
    '12:00 – 3:30 PM, 5:00 – 10:00 PM',
    '12:00 – 3:30 PM, 5:00 – 11:00 PM',
    '12:00 – 9:45 PM',
    '12:01 PM – 2:00 AM',
    '12:01 PM – 4:00 AM',
    '12:30PM-1AM',
    '12:30 – 4:00 AM, 12:00 – 6:00 PM, 10:30 PM – 12:00 AM',
    '1:00 – 9:30 PM',
    '1:30AM-11:30PM',
    '1:30 PM – 1:00 AM',
    '1:30 – 11:00 PM',
    '1:30 – 8:30 PM',
    '1PM-2AM',
    '2:30 PM – 2:00 AM',
    '2:30 – 10:00 PM',
    '2PM-2AM',
    '3:00PM-11:00PM',
    '3:00 – 9:30 PM',
    '3:30 PM – 12:00 AM',
    '3:30 – 10:00 PM',
    '6:30 – 10:00 AM, 11:30 AM – 1:30 PM, 4:00 – 10:00 PM',
    '6:30 – 10:00 PM',
    '6:30 – 10:30 AM, 11:00 AM – 2:00 PM, 5:00 – 10:00 PM',
    '6:30 – 10:30 AM, 11:00 AM – 9:00 PM',
    '6:30 – 10:30 AM, 11:30 AM – 1:30 PM, 4:00 – 10:00 PM',
    '6:30 – 10:30 AM, 11:30 AM – 2:00 PM, 5:30 – 10:00 PM',
    '6:30 – 10:30 AM, 4:00 PM – 1:00 AM',
    '6:30 – 10:30 AM, 4:00 – 10:00 PM',
    '6:30 – 10:30 AM, 4:00 – 11:00 PM',
    '6:30 – 10:30 AM, 5:00 PM – 2:00 AM',
    '7:00 – 9:30 AM, 5:00 – 9:00 PM',
    '9:45 AM – 8:00 PM',
    'Friday: 11:00 AM – 10:00 PM',
    'Friday: 4:00 – 11:00 PM',
    'Friday: 8:00 AM – 1:00 PM, 5:00 – 11:00 PM',
    'Monday: 11:00 AM – 2:00 AM',
    'Monday: Closed',
    'Saturday: 10:30 AM – 3:30 PM, 4:00 – 11:00 PM',
    'Sunday: 10:30 AM – 3:30 PM, 4:00 – 10:00 PM',
    'Sunday: Closed',
    'Wednesday: 11:00 AM – 9:00 PM',
    'Wednesday: 8:00 AM – 1:00 PM, 5:00 – 11:00 PM',
    'Wednesday: 3:00 – 11:00 PM',
    'Wednesday: 4:00 PM– 10:00 PM',
    'Wednesday: 4:00 – 10:00 PM',
    'Wednesday: 4:00 – 9:00 PM',
    'Open 24 hours',
    'Saturday: 10:00 AM – 1:00 AM',
    'Monday: 3:00 – 11:00 PM',
    'Monday: 3:00 – 8:00 PM',
    'Friday: 8:00 AM – 8:00 PM',
    'CLOSED ',
    'CLOSED',
    'Closed',
  ]) {
    const parser: HoursParser = new HoursParser();
    const status: ParseStatus = parser.parse(pattern);
    //console.debug({ exported: parser.export() });
    console.info({ formated: parser.format(), from: pattern , matchedAt: parser.matchedAt, });
    if (status !== 'ok') {
      console.debug({ pattern, status, matchedAt: parser.matchedAt });
      dd();
      dd();
      dd();
    }
  }
}

main();
