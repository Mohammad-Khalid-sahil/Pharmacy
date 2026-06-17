export interface IUser {
  name: string;
  email: string;
  position?: string;
  role: string;
  avatar?: string;
  password: string;
  status: string;
  address?: string;
  phone?: string
  city?: string;
}

export const profileKeys = [
  { keyName: 'name' },
  { keyName: 'email' },
  { keyName: 'position' },
  { keyName: 'role' },
  { keyName: 'status' },
  { keyName: 'address' },
  { keyName: 'phone' },
  { keyName: 'city' },
]

export const profileInputFields = [
  { id: 1, name: 'name', label: 'Name' },
  { id: 2, name: 'email', label: 'Email' },
  { id: 3, name: 'position', label: 'Position' },
  { id: 7, name: 'address', label: 'Address' },
  { id: 8, name: 'phone', label: 'Phone' },
  { id: 9, name: 'city', label: 'City' },
]
