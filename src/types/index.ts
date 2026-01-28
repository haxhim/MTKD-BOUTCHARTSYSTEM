export interface Participant {
    id: string;
    name: string;
    club: string;
    category: string;
    gender: string;
    category_key: string;
}

export interface RawCSVRow {
    NAME: string;
    CLUB: string;
    CATEGORY: string;
    GENDER: string;
}

export interface CategorySummary {
    category_key: string;
    count: number;
    ageGroup: string;
}

export interface Ring {
    id: string;
    name: string;
    priorityGroups: {
        [priority: number]: string[];
    };
    orderIndex?: number;
}

export interface Match {
    id: string;
    bout_number: string;
    red: Participant | 'BYE' | null; // null if TBD
    blue: Participant | 'BYE' | null;
    round: string;
    ring?: string;
    winner?: Participant | 'BYE';
    nextMatchId?: string;
    // For tree structure
    leftChildId?: string;
    rightChildId?: string;
}
