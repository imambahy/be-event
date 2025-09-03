export interface RegisterDto {
    name: string;
    email: string;
    password: string;
    role: 'CUSTOMER' | 'ORGANIZER';
    referralCode?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}