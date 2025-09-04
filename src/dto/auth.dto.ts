export interface RegisterDTO {
    name: string,
    email: string,
    password: string,
    role: "CUSTOMER" | "ORGANIZER",
    referralCode?: string
}

export interface LoginDTO {
    email: string,
    password: string
} 

export interface UpdateUserDTO {
    name?: string,
    email?: string,
    password?: string,
}