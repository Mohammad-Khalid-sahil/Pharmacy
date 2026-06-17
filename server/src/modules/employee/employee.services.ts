/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import Employee from './employee.model';
import CustomError from '../../errors/customError';
import httpStatus from 'http-status';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class EmployeeServices {
  private model = Employee;

  async create(payload: any, userId: string) {
    return this.model.create({ ...payload, createdBy: userId });
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const search = query.search ? String(query.search) : '';
    const match = {
      createdBy: new Types.ObjectId(userId),
      $or: [{ name: { $regex: search, $options: 'i' } }, { position: { $regex: search, $options: 'i' } }]
    };
    const data = await this.model.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await this.model.countDocuments({ createdBy: userId });
    return { data, totalCount };
  }

  async read(id: string, userId: string) {
    const doc = await this.model.findOne({ _id: id, createdBy: userId });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Employee is not found!');
    return doc;
  }

  async update(id: string, payload: any, userId: string) {
    const doc = await this.model.findOneAndUpdate({ _id: id, createdBy: userId }, payload, { new: true });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Employee is not found!');
    return doc;
  }

  async delete(id: string, userId: string) {
    const doc = await this.model.findOneAndDelete({ _id: id, createdBy: userId });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Employee is not found!');
    return doc;
  }
}

export default new EmployeeServices();
