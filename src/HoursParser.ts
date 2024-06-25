export type Shift = 'am' | 'pm';

const dd = (...args: any) => {
  console.debug(...args);
}

export class Time {
  hour: number = 0;
  minute: number = 0;
  shift: Shift = 'am';
  constructor(h: number, m: number, s: Shift) {
    this.hour = h;
    this.minute = m;
    this.shift = s;
  }
}

export class TimeRange {
  start: Time | null;
  end: Time | null;
  constructor(s: Time | null, e: Time | null) {
    this.start = s;
    this.end = e;
  }
  create(sh: number, sm: number, s_shift: Shift, eh: number, em: number, e_shift: Shift) {
    this.start = new Time(sh, sm, s_shift);
    this.end = new Time(eh, em, e_shift);
  }
  isSame(other: TimeRange): boolean {
    if (this.start && other.start) {
      if (this.start.hour !== other.start.hour) {
        return false;
      }
      if (this.start.minute !== other.start.minute) {
        return false;
      }
      if (this.start.shift !== other.start.shift) {
        return false;
      }
    }
    if (this.end && other.end) {
      if (this.end.hour !== other.end.hour) {
        return false;
      }
      if (this.end.minute !== other.end.minute) {
        return false;
      }
      if (this.end.shift !== other.end.shift) {
        return false;
      }
    }

    return true;
  }
}
export class MultipleTimeRanges {
  times: Array<TimeRange> = [];
  closed: boolean = false;
  open24Hours: boolean = false;
  constructor(r: TimeRange | Array<TimeRange> | string) {
    if (typeof r === 'string') {
      if (r.toLocaleLowerCase() === 'closed') {
        this.closed = true;
        return;
      }
      if (r.toLocaleLowerCase() === 'open 24 hours') {
        this.open24Hours = true;
        this.times = [new TimeRange(new Time(12, 0, 'am'), new Time(12, 0, 'am'))];
      }
    }
    if (Array.isArray(r)) {
      this.times = r;
    } else if (r instanceof TimeRange) {
      this.times = [r];
    }
  }
  add(t: TimeRange) {
    this.times.push(t);
  }
  isSame(other: MultipleTimeRanges): boolean {
    if (other.open24Hours && this.open24Hours) {
      return true;
    }
    if (other.closed && this.closed) {
      return true;
    }
    if (other.times.length !== this.times.length) {
      return false;
    }
    for (let i = 0; i < other.times.length; i++) {
      if (other.times[i].isSame(this.times[i]) === false) {
        return false;
      }
    }
    return true;
  }
  export(): string {
    try {
      return JSON.stringify({
        times: this.times,
        closed: this.closed,
        open24Hours: this.open24Hours,
      });
    } catch (e) {
      return JSON.stringify([]);
    }
  }
  zeroPrepend(input: string | number): string {
    if (typeof input === 'string') {
      input = Number(input);
    }
    if (input < 10) {
      return `0${input}`;
    }
    return String(input);
  }
  format(): string {
    let formatted: string = '';
    const entries : number = this.times.length;
    this.times.forEach((range: TimeRange, index: number) => {
      if (range.start && range.end) {
        formatted +=
          this.zeroPrepend(range.start.hour) +
          ':' +
          this.zeroPrepend(range.start.minute) +
          ' ' +
          String(range.start.shift).toLocaleUpperCase() + ' - ';
        formatted +=
          this.zeroPrepend(range.end.hour) +
          ':' +
          this.zeroPrepend(range.end.minute) +
          ' ' +
          String(range.end.shift).toLocaleUpperCase();
        if(index + 1 < entries){
          formatted += ', ';
        }
      }
    });
    return formatted;
  }
}

export type ParseStatus = 'ok' | 'error' | 'unrecognized';

export class HoursParser {
  times: MultipleTimeRanges | undefined = undefined;
  input: string = '';
  matchedAt: number = 0;
  original: string = '';
  constructor() {
    this.input = '';
  }
  parse(s: string): ParseStatus {
    this.original = s;
    this.input = s;
    let replace: string = '–';
    while (this.input.match(replace)) {
      this.input = this.input.replace(replace, '-');
    }
    replace = ' – ';
    while (this.input.match(replace)) {
      this.input = this.input.replace(replace, '-');
    }
    this.input = this.input.toLocaleLowerCase();
    /**
     * Sometimes people enter things like:
     * "Wednesday: 11:00AM-12PM"
     * All we'll do is rip out the weekday
     */
    const days: Array<string> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach((day: string) => {
      if (this.input.indexOf(day + ':') !== -1) {
        this.input = this.input.replace(day + ':', '');
      }
      while (this.input.indexOf(day) !== -1) {
        this.input = this.input.replace(day, '');
      }
    });
    this.input = this.input.replace(/^\s+/, '');
    /**
     * If NN[AM|PM]-NN[AM|PM]
     */
    let matches: any = this.input.match(/^\s?([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2})\s?(am|pm)\s?$/i);
    this.matchedAt = 0;
    ++this.matchedAt; // 1
    if (matches) {
      this.times = new MultipleTimeRanges(
        new TimeRange(new Time(Number(matches[1]), 0, matches[2]), new Time(Number(matches[3]), 0, matches[4])),
      );
      return 'ok';
    }
    /**
     * if "NN:NN [AM|PM] - NN:NN [AM|PM]",
     */
    matches = this.input.match(
      /^\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i,
    );
    ++this.matchedAt; // 2
    if (matches) {
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), matches[3]),
          new Time(Number(matches[4]), Number(matches[5]), matches[6]),
        ),
      );
      return 'ok';
    }
    /**
     * Check for NN-NN:NN[AM|PM]
     */
    matches = this.input.match(/^([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})(am|pm)\s?$/i);
    ++this.matchedAt; // 3
    if (matches) {
      const startHour: number = Number(matches[1]);
      let shift: Shift = 'pm';
      if (startHour < 12) {
        shift = 'am';
      }
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), 0, shift),
          new Time(Number(matches[2]), Number(matches[3]), matches[4]),
        ),
      );
      return 'ok';
    }
    /**
     * Check for NN-NN [AM|PM]
     */
    matches = this.input.match(/^\s?([0-9]{1,2})\s?-\s?([0-9]{1,2})(am|pm)\s?$/i);
    ++this.matchedAt; // 4
    if (matches) {
      const startHour: number = Number(matches[1]);
      let shift: Shift = 'pm';
      if (startHour < 12) {
        shift = 'am';
      }
      this.times = new MultipleTimeRanges(
        new TimeRange(new Time(Number(matches[1]), 0, shift), new Time(Number(matches[2]), 0, matches[3])),
      );
      return 'ok';
    }
    /**
     * Check for NN:NN-NN:NN[AM|PM]
     */
    matches = this.input.match(/^\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})(am|pm)\s?$/i);
    ++this.matchedAt; // 5
    if (matches) {
      const startHour: number = Number(matches[1]);
      let shift: Shift = 'pm';
      if (startHour < 12) {
        shift = 'am';
      }
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), matches[5]),
          new Time(Number(matches[3]), Number(matches[4]), matches[5]),
        ),
      );
      return 'ok';
    }
    /**
     * Check for
     * NN:NN-NN:NN[AM|PM]
     */
    matches = this.input.match(/^\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i);
    ++this.matchedAt; // 6
    if (matches) {
      //let shift: Shift = 'pm';
      //if (Number(matches[1]) < 12) {
      //  shift = 'am';
      //}
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), matches[5]),
          new Time(Number(matches[3]), Number(matches[4]), matches[5]),
        ),
      );
      return 'ok';
    }
    /**
     * Check for
     * NN:NN-NN:NN[AM|PM], NN:NN-NN:NN[AM|PM]
     * i.e.: "12:00 – 2:00 PM, 4:30 – 10:00 PM",
     */
    /*
     * matches[1] = 12
     * 2 => 00
     * 3 => 2
     * 4 => 00
     * 5 => PM
     * 6 => 4
     * 7 => 30
     * 8 => 10
     * 9 => 00
     * 10 => PM
     */
    matches = this.input.match(
      /^\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?,\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i,
    );
    ++this.matchedAt; // 7
    if (matches) {
      let shift: Shift = 'pm';
      if (Number(matches[1]) < 12) {
        shift = 'am';
      }
      this.times = new MultipleTimeRanges([
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), shift),
          new Time(Number(matches[3]), Number(matches[4]), matches[5]),
        ),
        new TimeRange(
          new Time(Number(matches[6]), Number(matches[7]), matches[5]),
          new Time(Number(matches[8]), Number(matches[9]), matches[10]),
        ),
      ]);
      return 'ok';
    }
    /**
     * Check for
     * NN:NN[AM|PM]-NN:NN[AM|PM], NN:NN[AM|PM]-NN:NN[AM|PM]
     * i.e.: "12:00PM – 2:00 PM, 4:30PM – 10:00 PM",
     */
    /*
     * matches[1] = 12
     * 2 => 00
     * 3 => PM
     * 4 => 2
     * 5 => 0
     * 6 => PM
     * 7 => 4
     * 8 => 30
     * 9 => PM
     * 10 => 10
     * 11 => 0
     * 12 => PM
     */
    matches = this.input.match(
      /^([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?,\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i,
    );
    ++this.matchedAt; // 8
    if (matches) {
      this.times = new MultipleTimeRanges([
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), matches[3]),
          new Time(Number(matches[4]), Number(matches[5]), matches[6]),
        ),
        new TimeRange(
          new Time(Number(matches[7]), Number(matches[8]), matches[9]),
          new Time(Number(matches[10]), Number(matches[11]), matches[12]),
        ),
      ]);
      return 'ok';
    }
    /**
     * If anyhwere it says "closed" or "24 hours", then specify that
     */
    ++this.matchedAt; // 9
    if (this.input.match(/closed/i)) {
      this.times = new MultipleTimeRanges('closed');
      return 'ok';
    }
    ++this.matchedAt; // 10
    if (this.input.match(/24 hours/gi)) {
      this.times = new MultipleTimeRanges('open 24 hours');
      return 'ok';
    }
    /*
     * Check for
     * NN:NN[AM|PM]-NN:NN[AM|PM], NN:NN-NN:NN[AM|PM]
     * i.e.: "12:00PM – 2:00 PM, 4:30 – 10:00 PM",
     *
     * matches[1] = 12
     * 2 => 00
     * 3 => PM
     * 4 => 2
     * 5 => 0
     * 6 => PM
     * 7 => 4
     * 8 => 30
     * 9 => 10
     * 10 => 0
     * 11 => PM
     */
    matches = this.input.match(
      /^([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?,\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i,
    );
    ++this.matchedAt; // 11
    if (matches) {
      this.times = new MultipleTimeRanges([
        new TimeRange(
          new Time(Number(matches[1]), Number(matches[2]), matches[3]),
          new Time(Number(matches[4]), Number(matches[5]), matches[6]),
        ),
        new TimeRange(
          new Time(Number(matches[7]), Number(matches[8]), matches[6]),
          new Time(Number(matches[9]), Number(matches[10]), matches[11]),
        ),
      ]);
      return 'ok';
    }
    /**
     * Check for entries like:
     * "6:30 – 10:30 AM, 11:00 AM – 2:00 PM, 5:00 – 10:00 PM"
     *
     *
     */
    ++this.matchedAt; // 13
    let parts: Array<string> = this.input.split(',');
    if (parts.length > 1) {
      let ranges: Array<TimeRange> = [];
      parts.forEach((value: string) => {
        /**
         * Match against
         * NN:NN - NN:NN [AM|PM]
         * "6:30 – 10:30 AM"
         */
        let matches = value.match(/^\s?([0-9]{1,2}):([0-9]{1,2})\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i);
        if (matches) {
          /**
           * matches[1] => 6
           * 2 => 30
           * 3 => 10
           * 4 => 30
           * 5 => AM
           */
          const startHour : number = Number(matches[1]);
          const stopHour : number = Number(matches[3]);
          let stopShift: Shift = matches[5].toLocaleLowerCase() === 'am' ? 'am' : 'pm';
          let startShift : Shift = stopShift;
          if(startHour === 12 && stopShift === 'am' && stopHour < 5) {
            startShift = 'pm';
          }
          ranges.push(
            new TimeRange(
              new Time(Number(matches[1]), Number(matches[2]), startShift),
              new Time(Number(matches[3]), Number(matches[4]), stopShift),
            ),
          );
          return;
        }
        /**
         * Match against
         * NN:NN [AM|PM] - NN:NN [AM|PM]
         * "6:30 AM – 10:30 AM"
         */
        matches = value.match(/^\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i);
        if (matches) {
          /**
           * matches[1] => 6
           * 2 => 30
           * 3 => AM
           * 4 => 10
           * 5 => 30
           * 6 => AM
           */
          let startShift: Shift = matches[3].toLocaleLowerCase() === 'am' ? 'am' : 'pm';
          let stopShift: Shift = matches[6].toLocaleLowerCase() === 'am' ? 'am' : 'pm';
          ranges.push(
            new TimeRange(
              new Time(Number(matches[1]), Number(matches[2]), startShift),
              new Time(Number(matches[4]), Number(matches[5]), stopShift),
            ),
          );
          return;
        }
      });
      if (ranges.length) {
        this.times = new MultipleTimeRanges(ranges);
        return 'ok';
      }
    }
    /**
     * if "NN[AM|PM] - NN:NN [AM|PM]",
     * "4PM-10:30PM"
     * matches[1] => 4
     * 2 => PM
     * 3 => 10
     * 4 => 30
     * 5 => PM
     */
    matches = this.input.match(/^\s?([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?$/i);
    ++this.matchedAt; // 14
    if (matches) {
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), 0, matches[2]),
          new Time(Number(matches[3]), Number(matches[4]), matches[5]),
        ),
      );
      return 'ok';
    }
    /**
     * if "NN:NN[AM|PM] - NN[AM|PM]",
     * "4:30PM-2AM"
     * matches[1] => 4
     * 2 => 30
     * 3 => PM
     * 4 => 2
     * 5 => AM
     */
    matches = this.input.match(/^\s?([0-9]{1,2}):([0-9]{1,2})\s?(am|pm)\s?-\s?([0-9]{1,2})\s?(am|pm)\s?$/i);
    ++this.matchedAt; // 15
    if (matches) {
      this.times = new MultipleTimeRanges(
        new TimeRange(
          new Time(Number(matches[1]), matches[2], matches[3]),
          new Time(Number(matches[4]), 0, matches[5]),
        ),
      );
      return 'ok';
    }

    return 'unrecognized';
  }
  /**
   *
   * This function should be used to store data into a database.
   * To format the date to be presented to a user, use format()
   * @returns A JSON string of the internal state
   */
  export(): string {
    const obj: any = {
      original: this.original,
      valid: !!this.times,
      mt: this.times,
    };
    return JSON.stringify(obj);
  }
  format(): string {
    if (!this.times) {
      return this.original;
    }
    if (this.times.closed) {
      return 'Closed';
    }
    return this.times.format();
  }
}
