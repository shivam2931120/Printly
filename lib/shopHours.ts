export interface ShopOpenState {
    isOpen: boolean | null;
    label: string;
    detail: string;
}

const DAY_INDEX: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseTime = (value: string): number | null => {
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const meridian = match[3]?.toLowerCase();

    if (minutes < 0 || minutes > 59 || hours < 0 || hours > 23) return null;
    if (meridian) {
        if (hours < 1 || hours > 12) return null;
        if (meridian === 'pm' && hours !== 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
};

const expandDays = (value?: string): number[] => {
    if (!value) return [0, 1, 2, 3, 4, 5, 6];

    const normalized = value.toLowerCase().replace(/\s/g, '');
    const days = new Set<number>();
    normalized.split(',').forEach((part) => {
        const [start, end] = part.split('-');
        const startDay = DAY_INDEX[start?.slice(0, 3)];
        const endDay = end ? DAY_INDEX[end.slice(0, 3)] : startDay;
        if (startDay === undefined || endDay === undefined) return;

        let day = startDay;
        days.add(day);
        while (day !== endDay) {
            day = (day + 1) % 7;
            days.add(day);
        }
    });

    return days.size > 0 ? Array.from(days) : [0, 1, 2, 3, 4, 5, 6];
};

export const getShopOpenState = (operatingHours: string, now = new Date()): ShopOpenState => {
    const match = operatingHours.match(/(.+?)\s*-\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    if (!match) {
        return {
            isOpen: null,
            label: 'Hours',
            detail: operatingHours,
        };
    }

    const openMinutes = parseTime(match[1]);
    const closeMinutes = parseTime(match[2]);
    const days = expandDays(match[3]);

    if (openMinutes === null || closeMinutes === null) {
        return {
            isOpen: null,
            label: 'Hours',
            detail: operatingHours,
        };
    }

    const today = now.getDay();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const activeToday = days.includes(today);
    const wrapsMidnight = closeMinutes <= openMinutes;
    const openNow = activeToday && (
        wrapsMidnight
            ? minutesNow >= openMinutes || minutesNow < closeMinutes
            : minutesNow >= openMinutes && minutesNow < closeMinutes
    );

    if (openNow) {
        return {
            isOpen: true,
            label: 'Open',
            detail: `Closes at ${match[2].trim()}`,
        };
    }

    const nextOpenDay = days
        .map((day) => ({ day, offset: (day - today + 7) % 7 }))
        .filter(({ offset }) => offset > 0 || minutesNow < openMinutes)
        .sort((a, b) => a.offset - b.offset)[0];

    return {
        isOpen: false,
        label: 'Closed',
        detail: nextOpenDay ? `Opens ${nextOpenDay.offset === 0 ? 'today' : DAY_NAMES[nextOpenDay.day]} at ${match[1].trim()}` : operatingHours,
    };
};
