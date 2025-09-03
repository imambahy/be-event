export interface CreateVoucherDto {
    code: string;
    discountValue: number;
    eventId: number;
    usageLimit: number;
    startDate: Date;
    endDate: Date;
}

export interface UpdateVoucherDto {
    code?: string;
    discountValue?: number;
    usageLimit?: number;
    startDate?: Date;
    endDate?: Date;
}