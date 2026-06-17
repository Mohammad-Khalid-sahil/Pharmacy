import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import logActivity from '../../lib/logActivity';
import customerPaymentServices from './customerPayment.services';

class CustomerPaymentControllers {
  create = asyncHandler(async (req, res) => {
    const result = await customerPaymentServices.create(req.body, req.user._id);
    await logActivity({ userId: req.user._id, action: 'CREATE', module: 'customerPayment', recordId: result._id.toString() });
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Customer payment recorded successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await customerPaymentServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Customer payments retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });
}

export default new CustomerPaymentControllers();
