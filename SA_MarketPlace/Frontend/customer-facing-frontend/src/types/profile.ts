export type UserRole = 'buyer' | 'seller' | 'collection_manager' | 'admin'

export interface MyProfile {
  email: string
  firstName: string
  lastName: string
  phone: string | null
  organisationName: string | null
  roles: UserRole[]
  memberSince: string
  ordersPlaced: number
  passwordLength: number
}
