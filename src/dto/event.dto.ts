export interface CreateEventDto {
    title: string;
    description: string;
    category: string;
    location: string;
    startDate: Date;
    endDate: Date;
    ticketTypes: CreateTicketTypeDto[];
}

export interface CreateTicketTypeDto {
    name: string;
    price: number;
    totalSeats: number;
}

export interface UpdateEventDto {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
    startDate?: Date;
    endDate?: Date;
    published?: boolean;
}

