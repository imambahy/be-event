export interface CreateReviewDto {
    rating: number;
    comment: string;
}

export interface UpdateReviewDto {
    rating?: number;
    comment?: string;
}