export interface CreateCouponDto {
    code: string;
    discountValue: number;
    usageLimit: number;
    startDate: Date;
    endDate: Date;
}

export interface UpdateCouponDto {
    code?: string;
    discountValue?: number;
    usageLimit?: number;
    startDate?: Date;
    endDate?: Date;
}