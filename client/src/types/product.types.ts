export type IProduct = {
  _id: string
  name: string
  description?: string
  price: number
  purchasePrice?: number
  salePrice?: number
  barcode?: string
  minStock?: number
  expireDate?: string
  location?: string
  stock: number
  seller: ISeller
}

export interface ISeller {
  _id: string
  name: string
  email: string
  contactNo: string
}
