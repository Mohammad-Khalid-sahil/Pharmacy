export interface IPurchase {
  _id: string
  user: string
  seller: string
  product: string
  sellerName: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  paid: number
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID'
  invoiceNumber?: string
  purchaseDate?: string
  createdAt: string
}
