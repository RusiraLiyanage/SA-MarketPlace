import { OrderItem } from '@sa-marketplace/entities'
import { Repository } from 'typeorm'

// Total units per order, in one grouped query rather than one per row.
export const sumUnitsByOrderId = async (
  orderItemRepository: Repository<OrderItem>,
  orderIds: string[],
): Promise<Map<string, number>> => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const rows = await orderItemRepository
    .createQueryBuilder('item')
    .select('item.orderId', 'orderId')
    .addSelect('SUM(item.quantity)', 'units')
    .where('item.orderId IN (:...orderIds)', { orderIds })
    .groupBy('item.orderId')
    .getRawMany<{ orderId: string; units: string }>()

  return new Map(rows.map((row) => [row.orderId, Number(row.units)]))
}
