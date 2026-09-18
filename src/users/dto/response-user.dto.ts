import { User, UserRole } from '../../generated/prisma/client';

type UserWithCustomerAccount = User & {
  customerAccount?: { id: string } | null;
};

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  /** Solo presente si el usuario es CLIENT y tiene un Customer vinculado. */
  customerId?: string;

  constructor(user: UserWithCustomerAccount) {
    this.id = user.id;
    this.email = user.email;
    this.fullName = user.fullName;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    if (user.customerAccount) {
      this.customerId = user.customerAccount.id;
    }
  }
}
