import { Customer, PriceList } from '../../generated/prisma/client';
import { PriceListBasicResponseDto } from '../../price-lists/dto/price-list-basic-response.dto';

// Tipado estructural: Le decimos a TS/ESLint exactamente qué usamos del Decimal.
type CustomerWithDecimals = Omit<Customer, 'creditLimit'> & {
  creditLimit: { toString(): string };
  priceList: PriceList;
};

export class CustomerResponseDto {
  id: string;
  businessName: string;
  cuit: string;
  address: string;
  phone: string | null;
  creditLimit: string;
  isActive: boolean;
  priceListId: string;
  priceList: PriceListBasicResponseDto;
  createdAt: Date;

  constructor(customer: CustomerWithDecimals) {
    this.id = customer.id;
    this.businessName = customer.businessName;
    this.cuit = customer.cuit;
    this.address = customer.address;
    this.phone = customer.phone;
    this.creditLimit = customer.creditLimit.toString();
    this.isActive = customer.isActive;
    this.priceListId = customer.priceListId;
    this.priceList = new PriceListBasicResponseDto(customer.priceList);
    this.createdAt = customer.createdAt;
  }
}
