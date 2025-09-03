export interface CreateTransactionDto {
    ticketTypeId: number;
    quantity: number;
    pointsUsed: number;
    couponCode?: string;
    voucherCode?: string;
}