/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

const matchStagePipeline = (query: Record<string, unknown>, userId: string) => {
  let minPrice = 0;
  let maxPrice = Number.MAX_VALUE;

  if (query.minPrice) {
    minPrice = Number(query.minPrice);
  }

  if (query.maxPrice) {
    maxPrice = Number(query.maxPrice);
  }

  const fieldQuery: any = [{ user: new Types.ObjectId(userId) }, { price: { $gte: minPrice, $lte: maxPrice } }];

  if (query.name) {
    const search = new RegExp(query.name as string, 'i');
    fieldQuery.push({ $or: [{ name: { $regex: search } }, { barcode: { $regex: search } }] });
  }

  return [
    {
      $match: {
        $and: [...fieldQuery]
      }
    }
  ];
};

export default matchStagePipeline;
