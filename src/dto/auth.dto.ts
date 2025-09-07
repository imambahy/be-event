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

export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  email: string;
}