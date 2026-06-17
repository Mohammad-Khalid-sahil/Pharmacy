import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import logActivity from '../../lib/logActivity';
import customerServices from './customer.services';

class CustomerControllers {
  services = customerServices;

  create = asyncHandler(async (req, res) => {
    const result = await this.services.create(req.body, req.user._id);
    await logActivity({ userId: req.user._id, action: 'CREATE', module: 'customer', recordId: result._id.toString() });
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Customer created successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await this.services.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Customers retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await this.services.read(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Customer fetched successfully!', data: result });
  });

  getBalance = asyncHandler(async (req, res) => {
    const result = await this.services.getBalance(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Customer balance retrieved successfully!', data: result });
  });

  update = asyncHandler(async (req, res) => {
    const result = await this.services.update(req.params.id, req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Customer updated successfully!', data: result });
  });

  delete = asyncHandler(async (req, res) => {
    await this.services.delete(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Customer deleted successfully!' });
  });
}

export default new CustomerControllers();
