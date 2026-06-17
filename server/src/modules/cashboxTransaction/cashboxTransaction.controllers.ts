import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import cashboxTransactionServices from './cashboxTransaction.services';

class CashboxTransactionControllers {
  create = asyncHandler(async (req, res) => {
    const result = await cashboxTransactionServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Cashbox transaction created successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await cashboxTransactionServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Cashbox transactions retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  getSummary = asyncHandler(async (req, res) => {
    const result = await cashboxTransactionServices.getSummary(req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Cashbox summary retrieved successfully!', data: result });
  });
}

export default new CashboxTransactionControllers();
