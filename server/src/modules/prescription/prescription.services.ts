/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import Prescription from './prescription.model';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class PrescriptionServices {
  async create(payload: any, userId: string) {
    return Prescription.create({ ...payload, createdBy: userId });
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const search = query.search ? String(query.search) : '';
    const match: Record<string, unknown> = {
      createdBy: new Types.ObjectId(userId),
      $or: [
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } }
      ]
    };
    if (query.customer) match.customer = new Types.ObjectId(String(query.customer));

    const data = await Prescription.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await Prescription.countDocuments({ createdBy: userId });
    return { data, totalCount };
  }

  async read(id: string, userId: string) {
    const doc = await Prescription.findOne({ _id: id, createdBy: userId })
      .populate('customer', 'name phone')
      .populate('sale', 'productName buyerName totalPrice date transactionId paymentType paidAmount dueAmount')
      .populate('items.product', 'name price stock');
    if (!doc) throw new CustomError(404, 'Prescription is not found!');
    return doc;
  }

  async update(id: string, payload: any, userId: string) {
    const doc = await Prescription.findOneAndUpdate({ _id: id, createdBy: userId }, payload, { new: true });
    if (!doc) throw new CustomError(404, 'Prescription is not found!');
    return doc;
  }

  async delete(id: string, userId: string) {
    const doc = await Prescription.findOneAndDelete({ _id: id, createdBy: userId });
    if (!doc) throw new CustomError(404, 'Prescription is not found!');
    return doc;
  }
}

export default new PrescriptionServices();
